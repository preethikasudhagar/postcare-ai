import os
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser
from .models import RecoveryCheckIn, RiskPrediction, WoundAssessment
from .serializers import RecoveryCheckInSerializer, RiskPredictionSerializer, WoundAssessmentSerializer
from apps.patients.models import Patient
from apps.ml_engine.predictor import predict_risk
from apps.notifications.models import Notification

class RecoveryCheckInCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data.copy()
        patient = getattr(request.user, 'patient_profile', None)
        if not patient and 'patient' in data:
            try:
                patient = Patient.objects.get(id=data['patient'])
            except Patient.DoesNotExist:
                return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not patient:
            return Response({'error': 'Patient context required'}, status=status.HTTP_400_BAD_REQUEST)

        checkin = RecoveryCheckIn.objects.create(
            patient=patient,
            date=data.get('date', timezone.now().date()),
            pain_level=int(data.get('pain_level', 2)),
            temperature=float(data.get('temperature', 36.6)),
            wound_condition=data.get('wound_condition', 'normal'),
            symptoms=data.get('symptoms', []),
            medication_adherence=data.get('medication_adherence', 'all'),
            additional_notes=data.get('additional_notes', '')
        )
        checkin.calculate_score()
        checkin.save()

        # Run ML Risk Prediction
        pred_res = predict_risk(
            pain_level=checkin.pain_level,
            temperature=checkin.temperature,
            wound_condition=checkin.wound_condition,
            symptoms=checkin.symptoms,
            medication_adherence=checkin.medication_adherence,
            surgery_type=patient.surgery_type,
            recovery_days=patient.get_recovery_day() if hasattr(patient, 'get_recovery_day') else 14
        )

        conf = pred_res.get('confidence', 0.95)
        if isinstance(conf, str):
            try:
                conf = float(conf.replace('%', '')) / 100.0
            except ValueError:
                conf = 0.95
        elif isinstance(conf, (int, float)) and conf > 1.0:
            conf = conf / 100.0

        prediction = RiskPrediction.objects.create(
            checkin=checkin,
            patient=patient,
            risk_level=pred_res['risk_level'],
            confidence=conf,
            contributing_factors=pred_res['contributing_factors'],
            recommendation_category=pred_res['recommendation_category']
        )

        # Automated high risk alert notification
        if pred_res['risk_level'] == 'high' and patient.primary_doctor:
            Notification.objects.create(
                recipient=patient.primary_doctor.user,
                type='high_risk_alert',
                title=f"HIGH-RISK ALERT: {patient.user.get_full_name()}",
                message=f"Check-in classified as High Risk (Score: {checkin.recovery_score:.0f}). Please inspect vitals and wound status.",
                related_patient=patient
            )

        return Response({
            'checkin': RecoveryCheckInSerializer(checkin).data,
            'prediction': RiskPredictionSerializer(prediction).data
        }, status=status.HTTP_201_CREATED)

class PatientRecoveryHistoryView(generics.ListAPIView):
    serializer_class = RecoveryCheckInSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        patient_param = self.kwargs.get('patient_id') or self.request.query_params.get('patient_id') or self.request.query_params.get('patient')

        # 1. If an explicit patient parameter is provided (path or query param)
        if patient_param:
            if user.role == 'patient':
                patient = getattr(user, 'patient_profile', None)
                if not patient or (str(patient_param) != str(patient.id) and str(patient_param) != str(patient.patient_id)):
                    return RecoveryCheckIn.objects.none()
                return RecoveryCheckIn.objects.filter(patient=patient).order_by('date')
            elif user.role == 'caregiver':
                caregiver = getattr(user, 'caregiver_profile', None)
                patient = caregiver.patient if caregiver else None
                if not patient or (str(patient_param) != str(patient.id) and str(patient_param) != str(patient.patient_id)):
                    return RecoveryCheckIn.objects.none()
                return RecoveryCheckIn.objects.filter(patient=patient).order_by('date')
            else:
                # Doctor, nurse, admin, staff
                if str(patient_param).isdigit():
                    return RecoveryCheckIn.objects.filter(patient_id=patient_param).order_by('date')
                return RecoveryCheckIn.objects.filter(patient__patient_id=patient_param).order_by('date')

        # 2. Implicit patient from authenticated user context
        if user.role == 'patient' and hasattr(user, 'patient_profile'):
            return RecoveryCheckIn.objects.filter(patient=user.patient_profile).order_by('date')
        elif user.role == 'caregiver' and hasattr(user, 'caregiver_profile') and user.caregiver_profile.patient:
            return RecoveryCheckIn.objects.filter(patient=user.caregiver_profile.patient).order_by('date')
        elif hasattr(user, 'patient_profile'):
            return RecoveryCheckIn.objects.filter(patient=user.patient_profile).order_by('date')

        return RecoveryCheckIn.objects.none()

class RiskPredictionListView(generics.ListAPIView):
    serializer_class = RiskPredictionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = RiskPrediction.objects.all().select_related(
            'patient__user', 'checkin', 'reviewed_by__user'
        ).order_by('-predicted_at')

        patient_id = self.request.query_params.get('patient') or self.kwargs.get('patient_id')
        if patient_id:
            if str(patient_id).isdigit():
                qs = qs.filter(patient_id=patient_id)
            else:
                qs = qs.filter(patient__patient_id=patient_id)
        elif hasattr(user, 'patient_profile'):
            qs = qs.filter(patient=user.patient_profile)

        risk = self.request.query_params.get('risk')
        if risk and risk != 'all':
            qs = qs.filter(risk_level=risk.lower())

        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(patient__user__first_name__icontains=search) |
                Q(patient__user__last_name__icontains=search) |
                Q(patient__patient_id__icontains=search) |
                Q(patient__surgery_type__icontains=search)
            )

        return qs

class RiskPredictionReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            pred = RiskPrediction.objects.get(pk=pk)
            pred.is_reviewed = True
            if 'notes' in request.data:
                pred.doctor_review_notes = request.data['notes']
            if hasattr(request.user, 'doctor_profile'):
                pred.reviewed_by = request.user.doctor_profile
            pred.reviewed_at = timezone.now()
            pred.save()
            return Response(RiskPredictionSerializer(pred).data)
        except RiskPrediction.DoesNotExist:
            return Response({'error': 'Risk prediction not found'}, status=status.HTTP_404_NOT_FOUND)

class WoundAssessmentCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        user = request.user
        patient_param = request.data.get('patient')

        # 1. Resolve patient profile based on authenticated user identity and role
        if user.role == 'patient':
            patient = getattr(user, 'patient_profile', None)
            if not patient:
                return Response(
                    {'error': 'No linked patient profile found for this account. Please contact clinical administration.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # If client also passed a patient ID, ensure it matches authenticated patient's profile
            if patient_param:
                if str(patient_param) != str(patient.id) and str(patient_param) != str(patient.patient_id):
                    return Response(
                        {'error': 'You can only upload images for yourself.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

        elif user.role == 'caregiver':
            caregiver = getattr(user, 'caregiver_profile', None)
            patient = caregiver.patient if caregiver else None
            if not patient:
                return Response(
                    {'error': 'No linked patient assignment found for this caregiver account.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if patient_param:
                if str(patient_param) != str(patient.id) and str(patient_param) != str(patient.patient_id):
                    return Response(
                        {'error': 'You are not assigned to this patient.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

        else:
            # Clinical staff (doctor, nurse) or administrator
            if not patient_param:
                return Response(
                    {'error': 'Patient ID is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                if str(patient_param).isdigit():
                    patient = Patient.objects.get(id=patient_param)
                else:
                    patient = Patient.objects.get(patient_id=patient_param)
            except Patient.DoesNotExist:
                return Response(
                    {'error': 'Patient not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        serializer = WoundAssessmentSerializer(data=request.data)
        if serializer.is_valid():
            wound = serializer.save(
                patient=patient,
                uploaded_by=request.user,
                assessment_result='pending',
                confidence=None
            )

            # Automated ML Wound Assessment
            try:
                from apps.ml_engine.wound_service import assess_wound_image
                if wound.image and hasattr(wound.image, 'path') and os.path.exists(wound.image.path):
                    assessment = assess_wound_image(wound.image.path, wound.remarks)
                    wound.assessment_result = assessment.get('assessment_result', 'unavailable')
                    wound.confidence = assessment.get('confidence', None)
                    wound.raw_probabilities = assessment.get('raw_probabilities', None)
                    wound.assessment_reason = assessment.get('assessment_reason', '')
                    wound.save(update_fields=['assessment_result', 'confidence', 'raw_probabilities', 'assessment_reason'])
                else:
                    wound.assessment_result = 'unavailable'
                    wound.confidence = None
                    wound.raw_probabilities = None
                    wound.assessment_reason = "Stored image file not accessible on disk."
                    wound.save(update_fields=['assessment_result', 'confidence', 'raw_probabilities', 'assessment_reason'])
            except Exception as e:
                wound.assessment_result = 'unavailable'
                wound.confidence = None
                wound.raw_probabilities = None
                wound.assessment_reason = f"Assessment engine error: {str(e)}"
                wound.save(update_fields=['assessment_result', 'confidence', 'raw_probabilities', 'assessment_reason'])

            return Response(WoundAssessmentSerializer(wound).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class WoundAssessmentListView(generics.ListAPIView):
    serializer_class = WoundAssessmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        patient_id = self.kwargs.get('patient_id')
        user = self.request.user

        if user.role == 'patient':
            patient = getattr(user, 'patient_profile', None)
            if not patient:
                return WoundAssessment.objects.none()

            if patient_id and patient_id != 'me':
                if str(patient_id) != str(patient.id) and str(patient_id) != str(patient.patient_id):
                    return WoundAssessment.objects.none()

            return WoundAssessment.objects.filter(patient=patient).order_by('-upload_date')

        elif user.role == 'caregiver':
            caregiver = getattr(user, 'caregiver_profile', None)
            patient = caregiver.patient if caregiver else None
            if not patient:
                return WoundAssessment.objects.none()

            if patient_id and patient_id != 'me':
                if str(patient_id) != str(patient.id) and str(patient_id) != str(patient.patient_id):
                    return WoundAssessment.objects.none()

            return WoundAssessment.objects.filter(patient=patient).order_by('-upload_date')

        else:
            if not patient_id or patient_id == 'me':
                return WoundAssessment.objects.none()
            try:
                if str(patient_id).isdigit():
                    patient = Patient.objects.get(id=patient_id)
                else:
                    patient = Patient.objects.get(patient_id=patient_id)
            except Patient.DoesNotExist:
                return WoundAssessment.objects.none()

            return WoundAssessment.objects.filter(patient=patient).order_by('-upload_date')

class WoundAssessmentReviewView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, pk, *args, **kwargs):
        if request.user.role != 'doctor':
            return Response({'error': 'Only doctors can review wound images'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            wound = WoundAssessment.objects.get(pk=pk)
        except WoundAssessment.DoesNotExist:
            return Response({'error': 'Wound image not found'}, status=status.HTTP_404_NOT_FOUND)
            
        wound.doctor_review = request.data.get('doctor_review', True)
        wound.save()
        return Response({'message': 'Review status updated'})

class WoundAssessmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, *args, **kwargs):
        try:
            wound = WoundAssessment.objects.select_related('patient', 'patient__user', 'uploaded_by').get(pk=pk)
        except WoundAssessment.DoesNotExist:
            return Response({'error': 'Wound assessment record not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user

        # 1. Strict authorization checks
        is_authorized = False
        if user.is_staff or user.role == 'admin':
            is_authorized = True
        elif user.role == 'patient':
            is_authorized = hasattr(user, 'patient_profile') and (wound.patient == user.patient_profile)
        elif user.role == 'caregiver':
            is_authorized = hasattr(user, 'caregiver_profile') and (wound.patient == user.caregiver_profile.patient)
        elif user.role == 'doctor':
            if hasattr(user, 'doctor_profile'):
                is_authorized = (wound.patient.primary_doctor == user.doctor_profile) or (user.role == 'doctor')
            else:
                is_authorized = True

        if not is_authorized:
            return Response(
                {'error': 'You do not have permission to delete this wound image.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Clinical Retention Policy
        # Clinically reviewed records form part of the verified patient medical record and cannot be destroyed
        if wound.doctor_review:
            return Response(
                {'error': 'This wound image has been clinically reviewed by an attending physician and cannot be deleted due to clinical retention policy.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Safe file storage cleanup
        try:
            if wound.image and hasattr(wound.image, 'name') and wound.image.name:
                # Check if another record references the exact same file path
                other_refs = WoundAssessment.objects.filter(image=wound.image.name).exclude(pk=wound.pk).exists()
                if not other_refs and wound.image.storage.exists(wound.image.name):
                    wound.image.delete(save=False)
        except Exception:
            # Storage cleanup error should not block database record deletion
            pass

        # 4. Delete database record
        deleted_id = wound.id
        wound.delete()

        return Response(
            {
                'message': 'Wound image deleted successfully.',
                'deleted_id': deleted_id
            },
            status=status.HTTP_200_OK
        )


class WoundAssessmentClearHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        return self._clear_history(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self._clear_history(request, *args, **kwargs)

    def _clear_history(self, request, *args, **kwargs):
        patient_id = kwargs.get('patient_id') or request.data.get('patient') or request.query_params.get('patient_id')
        user = request.user

        # 1. Resolve target patient
        if not patient_id or patient_id == 'me':
            if user.role == 'patient':
                patient = getattr(user, 'patient_profile', None)
                if not patient:
                    return Response(
                        {'error': 'No linked patient profile found for this account. Please contact clinical administration.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif user.role == 'caregiver':
                caregiver = getattr(user, 'caregiver_profile', None)
                patient = caregiver.patient if caregiver else None
                if not patient:
                    return Response(
                        {'error': 'No linked patient assignment found for this caregiver account.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {'error': 'No patient profile associated with this account. Please specify a patient.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            try:
                if str(patient_id).isdigit():
                    patient = Patient.objects.get(id=patient_id)
                else:
                    patient = Patient.objects.get(patient_id=patient_id)
            except Patient.DoesNotExist:
                return Response({'error': 'Patient record not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 2. Strict authorization checks
        is_authorized = False
        if user.is_staff or user.role == 'admin':
            is_authorized = True
        elif user.role == 'patient':
            is_authorized = hasattr(user, 'patient_profile') and (user.patient_profile == patient)
        elif user.role == 'caregiver':
            is_authorized = hasattr(user, 'caregiver_profile') and (user.caregiver_profile.patient == patient)
        elif user.role == 'doctor':
            if hasattr(user, 'doctor_profile'):
                is_authorized = (patient.primary_doctor == user.doctor_profile) or (user.role == 'doctor')
            else:
                is_authorized = True

        if not is_authorized:
            return Response(
                {'error': 'You do not have permission to clear this patient\'s wound image history.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 3. Retrieve all records strictly for this patient
        all_wounds = WoundAssessment.objects.filter(patient=patient)
        total_count = all_wounds.count()

        if total_count == 0:
            return Response({
                'message': 'No wound image upload records found to clear.',
                'deleted_count': 0,
                'retained_count': 0,
                'deleted_ids': [],
                'retained_ids': [],
            }, status=status.HTTP_200_OK)

        # 4. Enforce Clinical Retention Policy
        # Clinically reviewed records form part of verified medical audit documentation and cannot be deleted
        retained_records = all_wounds.filter(doctor_review=True)
        eligible_records = all_wounds.filter(doctor_review=False)

        retained_count = retained_records.count()
        retained_ids = list(retained_records.values_list('id', flat=True))

        # 5. Delete eligible records safely
        deleted_ids = []
        for wound in eligible_records:
            w_id = wound.id
            try:
                if wound.image and hasattr(wound.image, 'name') and wound.image.name:
                    # Check if an unrelated or retained record references this file
                    other_refs = WoundAssessment.objects.filter(image=wound.image.name).exclude(pk=wound.pk).exclude(doctor_review=False, patient=patient).exists()
                    if not other_refs and wound.image.storage.exists(wound.image.name):
                        wound.image.delete(save=False)
            except Exception:
                pass
            wound.delete()
            deleted_ids.append(w_id)

        deleted_count = len(deleted_ids)

        if retained_count > 0:
            msg = (
                f"Successfully deleted {deleted_count} eligible wound image(s). "
                f"{retained_count} record(s) were retained according to the clinical retention policy "
                "because they have been reviewed by an attending physician."
            )
        else:
            msg = f"Successfully cleared all {deleted_count} eligible wound image upload(s)."

        return Response({
            'message': msg,
            'deleted_count': deleted_count,
            'retained_count': retained_count,
            'deleted_ids': deleted_ids,
            'retained_ids': retained_ids,
        }, status=status.HTTP_200_OK)
