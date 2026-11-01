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
        user = request.user
        data = request.data or {}

        # 1. Resolve Patient Context & Enforce Patient Ownership
        if user.role == 'patient':
            patient = getattr(user, 'patient_profile', None)
            if not patient:
                return Response(
                    {'detail': 'Authenticated patient profile does not exist.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            # Clinician / Caregiver context: require explicit patient identifier
            patient_id = data.get('patient')
            if not patient_id:
                return Response(
                    {'error': 'Patient context is required for clinician-initiated check-in.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                patient = Patient.objects.get(id=patient_id)
            except Patient.DoesNotExist:
                return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 2. Strict Field-Level Validation (Enforce Mandatory Inputs)
        errors = {}

        # Pain Level: Required int between 0 and 10
        raw_pain = data.get('pain_level')
        if raw_pain is None or raw_pain == '':
            errors['pain_level'] = ['Pain level rating is mandatory. Please select a value between 0 and 10.']
        else:
            try:
                pain_level = int(raw_pain)
                if pain_level < 0 or pain_level > 10:
                    errors['pain_level'] = ['Pain level must be an integer between 0 (no pain) and 10 (severe pain).']
            except (ValueError, TypeError):
                errors['pain_level'] = ['Valid numerical pain level between 0 and 10 is required.']

        # Temperature: Required float between 34.0°C and 43.0°C
        raw_temp = data.get('temperature')
        if raw_temp is None or raw_temp == '':
            errors['temperature'] = ['Body temperature is mandatory.']
        else:
            try:
                temp_val = float(raw_temp)
                if temp_val < 34.0 or temp_val > 43.0:
                    errors['temperature'] = ['Body temperature must be within a realistic physiological range (34.0°C – 43.0°C).']
                else:
                    temperature = round(temp_val, 1)
            except (ValueError, TypeError):
                errors['temperature'] = ['Valid numeric temperature is required.']

        # Wound Condition: Required choice
        valid_wounds = [c[0] for c in RecoveryCheckIn.WOUND_CONDITIONS]
        raw_wound = data.get('wound_condition')
        if not raw_wound:
            errors['wound_condition'] = ['Wound status selection is mandatory.']
        elif raw_wound not in valid_wounds:
            errors['wound_condition'] = [f"Invalid wound status '{raw_wound}'. Must be one of: {', '.join(valid_wounds)}."]
        else:
            wound_condition = raw_wound

        # Symptoms: Required explicit list. 'None of the above' is mutually exclusive
        raw_symptoms = data.get('symptoms')
        if raw_symptoms is None or not isinstance(raw_symptoms, list) or len(raw_symptoms) == 0:
            errors['symptoms'] = ['Symptoms reporting is mandatory. Please select all applicable symptoms or "None of the above".']
        else:
            cleaned_symptoms = [str(s).strip() for s in raw_symptoms if str(s).strip()]
            if not cleaned_symptoms:
                errors['symptoms'] = ['Please select at least one symptom or "None of the above".']
            elif 'None of the above' in cleaned_symptoms and len(cleaned_symptoms) > 1:
                errors['symptoms'] = ['"None of the above" cannot be combined with other specific symptoms.']
            else:
                symptoms = cleaned_symptoms

        # Medication Adherence: Required choice
        valid_adherences = [c[0] for c in RecoveryCheckIn.MED_ADHERENCE]
        raw_med = data.get('medication_adherence')
        if not raw_med:
            errors['medication_adherence'] = ['Medication adherence status is mandatory.']
        elif raw_med not in valid_adherences:
            errors['medication_adherence'] = [f"Invalid medication adherence status. Must be one of: {', '.join(valid_adherences)}."]
        else:
            medication_adherence = raw_med

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # 3. Create Check-In
        checkin = RecoveryCheckIn.objects.create(
            patient=patient,
            date=data.get('date') or timezone.now().date(),
            pain_level=pain_level,
            temperature=temperature,
            wound_condition=wound_condition,
            symptoms=symptoms,
            medication_adherence=medication_adherence,
            additional_notes=(data.get('additional_notes') or '').strip()
        )
        checkin.calculate_score()
        checkin.save()

        # 4. Run ML Risk Prediction
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

        # 5. Automated High-Risk Alert Notification
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

from .urgent_system import evaluate_urgency, trigger_urgent_clinical_escalation
from .recommendations import generate_recovery_recommendations
from apps.ml_engine.wound_service import assess_wound_image
from apps.patients.models import Doctor

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

        serializer = WoundAssessmentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Calculate Recovery Day and Surgery Details
            today = timezone.now().date()
            if patient.surgery_date:
                recovery_day = max(1, (today - patient.surgery_date).days)
            elif patient.discharge_date:
                recovery_day = max(1, (today - patient.discharge_date).days)
            else:
                recovery_day = 1

            surgery_details = patient.surgery_type.strip() if patient.surgery_type else "General Post-Op Recovery"
            remarks_text = (request.data.get('remarks') or '').strip()

            # Retrieve latest check-in for vitals context
            latest_checkin = patient.recovery_checkins.order_by('-date', '-submitted_at').first()

            # Retrieve most recent prior wound assessment for longitudinal visual comparison
            previous_wound = WoundAssessment.objects.filter(patient=patient).order_by('-upload_date').first()

            # Immediate urgency evaluation (Do not wait for AI if patient reports emergency symptoms)
            is_urgent_init, early_reasons, _ = evaluate_urgency(
                patient=patient,
                remarks=remarks_text,
                latest_checkin=latest_checkin
            )

            # Save initial Wound Assessment
            wound = serializer.save(
                patient=patient,
                uploaded_by=request.user,
                surgery_details=surgery_details,
                recovery_day=recovery_day,
                remarks=remarks_text,
                assessment_result='pending',
                confidence=None,
                is_urgent=is_urgent_init,
                urgent_reasons=early_reasons,
                doctor_review_status='pending',
                doctor_review=False
            )

            # Automated ML Wound Assessment
            ai_obs = {}
            try:
                image_target = None
                if wound.image:
                    try:
                        if hasattr(wound.image, 'path') and os.path.exists(wound.image.path):
                            image_target = wound.image.path
                    except Exception:
                        pass
                    if not image_target and hasattr(wound.image, 'file'):
                        image_target = wound.image.file

                if image_target:
                    assessment = assess_wound_image(
                        image_target, 
                        remarks=remarks_text,
                        previous_assessment=previous_wound
                    )
                    wound.assessment_result = assessment.get('assessment_result', 'unavailable')
                    wound.confidence = assessment.get('confidence', None)
                    wound.raw_probabilities = assessment.get('raw_probabilities', None)
                    wound.assessment_reason = assessment.get('assessment_reason', '')
                    ai_obs = assessment.get('ai_observations', {})
                    wound.ai_observations = ai_obs
                else:
                    wound.assessment_result = 'unavailable'
                    wound.confidence = None
                    wound.raw_probabilities = None
                    wound.assessment_reason = "AI analysis is currently unavailable. Awaiting clinician review."
                    ai_obs = {
                        'status': 'unavailable',
                        'message': 'AI analysis is currently unavailable. Awaiting clinician review.'
                    }
                    wound.ai_observations = ai_obs
            except Exception as e:
                wound.assessment_result = 'unavailable'
                wound.confidence = None
                wound.raw_probabilities = None
                wound.assessment_reason = f"AI analysis is currently unavailable. Awaiting clinician review. ({str(e)})"
                ai_obs = {
                    'status': 'unavailable',
                    'message': 'AI analysis is currently unavailable. Awaiting clinician review.'
                }
                wound.ai_observations = ai_obs

            # Secondary urgency evaluation combining reported vitals + CV findings
            is_urgent_final, final_reasons, urgent_msg = evaluate_urgency(
                patient=patient,
                remarks=remarks_text,
                wound_assessment=wound,
                latest_checkin=latest_checkin,
                ai_observations=ai_obs
            )
            wound.is_urgent = is_urgent_final
            wound.urgent_reasons = final_reasons

            # Trigger immediate clinical notifications if urgent
            if is_urgent_final:
                trigger_urgent_clinical_escalation(
                    patient=patient,
                    wound_assessment=wound,
                    urgent_reasons=final_reasons
                )
            elif patient.primary_doctor and patient.primary_doctor.user:
                # Standard notification to doctor for routine review queue
                try:
                    Notification.objects.create(
                        recipient=patient.primary_doctor.user,
                        type='wound_image_uploaded',
                        title=f"New Wound Image: {patient.user.get_full_name()}",
                        message=(
                            f"New wound photograph uploaded for {patient.user.get_full_name()} "
                            f"({wound.surgery_details}, Day {wound.recovery_day}). Ready for clinical review."
                        ),
                        related_patient=patient
                    )
                except Exception:
                    pass

            # Generate structured clinical recommendations
            recommendations = generate_recovery_recommendations(
                patient=patient,
                wound_assessment=wound,
                latest_checkin=latest_checkin,
                ai_observations=ai_obs,
                is_urgent=is_urgent_final,
                urgent_reasons=final_reasons
            )
            wound.generated_recommendations = recommendations

            wound.save()

            return Response(
                WoundAssessmentSerializer(wound, context={'request': request}).data, 
                status=status.HTTP_201_CREATED
            )
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

        elif user.role == 'doctor':
            # Doctors can access their assigned patients (or any patient if not strictly limited)
            if not patient_id or patient_id == 'me':
                if hasattr(user, 'doctor_profile'):
                    return WoundAssessment.objects.filter(patient__primary_doctor=user.doctor_profile).order_by('-upload_date')
                return WoundAssessment.objects.none()
            try:
                if str(patient_id).isdigit():
                    patient = Patient.objects.get(id=patient_id)
                else:
                    patient = Patient.objects.get(patient_id=patient_id)
            except Patient.DoesNotExist:
                return WoundAssessment.objects.none()

            # If doctor has a profile, check assignment or permit if admin/staff
            if hasattr(user, 'doctor_profile') and not user.is_staff and user.role != 'admin':
                if patient.primary_doctor and patient.primary_doctor != user.doctor_profile:
                    return WoundAssessment.objects.none()

            return WoundAssessment.objects.filter(patient=patient).order_by('-upload_date')

        else:
            # Staff or admin
            if not patient_id or patient_id == 'me':
                return WoundAssessment.objects.all().order_by('-upload_date')
            try:
                if str(patient_id).isdigit():
                    patient = Patient.objects.get(id=patient_id)
                else:
                    patient = Patient.objects.get(patient_id=patient_id)
            except Patient.DoesNotExist:
                return WoundAssessment.objects.none()

            return WoundAssessment.objects.filter(patient=patient).order_by('-upload_date')

class LatestWoundAssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id=None):
        user = request.user
        if not patient_id or patient_id == 'me':
            if user.role == 'patient':
                patient = getattr(user, 'patient_profile', None)
            elif user.role == 'caregiver':
                caregiver = getattr(user, 'caregiver_profile', None)
                patient = caregiver.patient if caregiver else None
            else:
                patient = None
        else:
            try:
                if str(patient_id).isdigit():
                    patient = Patient.objects.get(id=patient_id)
                else:
                    patient = Patient.objects.get(patient_id=patient_id)
            except Patient.DoesNotExist:
                return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not patient:
            return Response({'error': 'Patient record could not be resolved.'}, status=status.HTTP_404_NOT_FOUND)

        # Authorization check
        if user.role == 'patient' and user.patient_profile != patient:
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'caregiver' and user.caregiver_profile.patient != patient:
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'doctor' and hasattr(user, 'doctor_profile') and not user.is_staff and user.role != 'admin':
            if patient.primary_doctor and patient.primary_doctor != user.doctor_profile:
                return Response({'error': 'Not authorized for this patient.'}, status=status.HTTP_403_FORBIDDEN)

        latest = WoundAssessment.objects.filter(patient=patient).order_by('-upload_date').first()
        if not latest:
            return Response({'detail': 'No wound assessments on file for this patient.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(WoundAssessmentSerializer(latest, context={'request': request}).data)

class DoctorWoundQueueView(APIView):
    """
    Dedicated endpoint for the Doctor Dashboard:
    Retrieves the queue of wound images uploaded by patients under this doctor's care.
    Orders urgent and pending cases first.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in ['doctor', 'admin'] and not user.is_staff:
            return Response({'error': 'Only medical doctors can access the clinical review queue.'}, status=status.HTTP_403_FORBIDDEN)

        qs = WoundAssessment.objects.all().select_related('patient__user', 'reviewed_by__user')

        # Filter to doctor's assigned patients unless admin/staff
        if user.role == 'doctor' and hasattr(user, 'doctor_profile') and not user.is_staff and user.role != 'admin':
            qs = qs.filter(patient__primary_doctor=user.doctor_profile)

        # Query Filters
        status_filter = request.query_params.get('status')
        if status_filter == 'pending':
            qs = qs.filter(doctor_review_status='pending')
        elif status_filter == 'reviewed':
            qs = qs.filter(doctor_review_status__in=['reviewed', 'modified'])
        elif status_filter == 'urgent':
            qs = qs.filter(is_urgent=True)
        elif status_filter == 'image_requested':
            qs = qs.filter(doctor_review_status='image_requested')

        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(patient__user__first_name__icontains=search) |
                Q(patient__user__last_name__icontains=search) |
                Q(patient__patient_id__icontains=search) |
                Q(surgery_details__icontains=search)
            )

        # Ordering: Urgent first, then pending reviews, then most recent upload
        qs = qs.order_by('-is_urgent', 'doctor_review', '-upload_date')

        serializer = WoundAssessmentSerializer(qs[:50], many=True, context={'request': request})
        
        # Summary counts for quick queue header
        total_in_queue = qs.count()
        urgent_count = qs.filter(is_urgent=True).count()
        pending_count = qs.filter(doctor_review_status='pending').count()

        return Response({
            'total_in_queue': total_in_queue,
            'urgent_count': urgent_count,
            'pending_count': pending_count,
            'results': serializer.data
        })

class DoctorWoundActionView(APIView):
    """
    Allows attending doctors to:
      - Review and approve recommendations
      - Add clinical comments or modify instructions
      - Request another image with reason
      - Escalate concerning cases
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        if user.role not in ['doctor', 'admin'] and not user.is_staff:
            return Response({'error': 'Only authorized doctors can execute clinical actions.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            wound = WoundAssessment.objects.select_related('patient__user', 'patient__primary_doctor').get(pk=pk)
        except WoundAssessment.DoesNotExist:
            return Response({'error': 'Wound assessment record not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Doctor authorization check
        if user.role == 'doctor' and hasattr(user, 'doctor_profile') and not user.is_staff and user.role != 'admin':
            if wound.patient.primary_doctor and wound.patient.primary_doctor != user.doctor_profile:
                return Response({'error': 'You are not the designated primary doctor for this patient.'}, status=status.HTTP_403_FORBIDDEN)

        action = request.data.get('action') # 'approve' | 'modify' | 'request_image' | 'escalate' | 'comments'
        doctor_profile = getattr(user, 'doctor_profile', None)

        if action == 'approve':
            wound.doctor_review = True
            wound.doctor_review_status = 'reviewed'
            wound.reviewed_by = doctor_profile
            wound.reviewed_at = timezone.now()
            comments_val = request.data.get('comments') or request.data.get('doctor_comments')
            if comments_val is not None:
                wound.doctor_comments = str(comments_val).strip()
            instructions_val = request.data.get('approved_instructions') or request.data.get('doctor_approved_instructions')
            if instructions_val is not None:
                wound.doctor_approved_instructions = str(instructions_val).strip()
            wound.save()

            # Notify patient that doctor approved recommendations
            try:
                Notification.objects.create(
                    recipient=wound.patient.user,
                    type='doctor_review_completed',
                    title="Wound Assessment Approved by Doctor",
                    message=(
                        f"Dr. {user.get_full_name()} has reviewed your wound image and confirmed your recovery guidance."
                    ),
                    related_patient=wound.patient
                )
            except Exception:
                pass

            return Response({
                'message': 'Wound assessment approved successfully.',
                'wound': WoundAssessmentSerializer(wound, context={'request': request}).data
            })

        elif action == 'modify':
            wound.doctor_review = True
            wound.doctor_review_status = 'modified'
            wound.reviewed_by = doctor_profile
            wound.reviewed_at = timezone.now()
            if 'comments' in request.data:
                wound.doctor_comments = request.data['comments'].strip()
            if 'approved_instructions' in request.data:
                wound.doctor_approved_instructions = request.data['approved_instructions'].strip()
            wound.save()

            # Notify patient of modified instructions
            try:
                Notification.objects.create(
                    recipient=wound.patient.user,
                    type='doctor_review_completed',
                    title="Doctor Modified Your Wound Instructions",
                    message=(
                        f"Dr. {user.get_full_name()} has added customized instructions to your post-op recovery plan."
                    ),
                    related_patient=wound.patient
                )
            except Exception:
                pass

            return Response({
                'message': 'Clinical instructions updated and approved.',
                'wound': WoundAssessmentSerializer(wound, context={'request': request}).data
            })

        elif action == 'request_image':
            reason = request.data.get('reason', '').strip() or "Please provide a clearer, well-lit photograph of the wound."
            wound.doctor_review_status = 'image_requested'
            wound.image_request_reason = reason
            wound.reviewed_by = doctor_profile
            wound.reviewed_at = timezone.now()
            wound.save()

            # Notify patient
            try:
                Notification.objects.create(
                    recipient=wound.patient.user,
                    type='image_requested',
                    title="New Wound Photo Requested by Doctor",
                    message=(
                        f"Dr. {user.get_full_name()} has requested a new wound photograph. Reason: '{reason}'. "
                        "Please upload a new image in your Recovery portal."
                    ),
                    related_patient=wound.patient
                )
            except Exception:
                pass

            return Response({
                'message': 'Image re-take request sent to patient.',
                'wound': WoundAssessmentSerializer(wound, context={'request': request}).data
            })

        elif action == 'escalate':
            notes = request.data.get('notes', '').strip()
            wound.doctor_review_status = 'escalated'
            wound.is_urgent = True
            reasons = list(wound.urgent_reasons or [])
            reasons.append(f"Clinically escalated by Dr. {user.get_full_name()}: {notes or 'Immediate evaluation advised'}")
            wound.urgent_reasons = reasons
            wound.reviewed_by = doctor_profile
            wound.reviewed_at = timezone.now()
            wound.save()

            # Escalate alert
            trigger_urgent_clinical_escalation(
                patient=wound.patient,
                wound_assessment=wound,
                urgent_reasons=reasons
            )

            return Response({
                'message': 'Case successfully escalated to urgent clinical priority.',
                'wound': WoundAssessmentSerializer(wound, context={'request': request}).data
            })

        elif action == 'comments':
            wound.doctor_comments = (request.data.get('comments') or '').strip()
            wound.save(update_fields=['doctor_comments'])
            return Response({
                'message': 'Clinical comments saved.',
                'wound': WoundAssessmentSerializer(wound, context={'request': request}).data
            })

        else:
            return Response({'error': f"Unrecognized action '{action}'."}, status=status.HTTP_400_BAD_REQUEST)

class AdminWoundStatsView(APIView):
    """
    Dedicated endpoint for the Admin Dashboard:
    Computes wound-monitoring statistics and recent workflow events.
    Allows administrators to monitor workflow status without changing clinical decisions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_staff and user.role not in ['admin', 'doctor']:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        all_wounds = WoundAssessment.objects.all()

        total_uploaded = all_wounds.count()
        awaiting_ai = all_wounds.filter(assessment_result='pending').count()
        awaiting_doctor_review = all_wounds.filter(doctor_review_status='pending').count()
        reviewed_cases = all_wounds.filter(doctor_review_status__in=['reviewed', 'modified']).count()
        urgent_cases = all_wounds.filter(is_urgent=True).count()

        # Recent 25 workflow events for administrative monitoring
        recent_events = []
        for w in all_wounds.select_related('patient__user', 'reviewed_by__user').order_by('-upload_date')[:25]:
            p_name = w.patient.user.get_full_name() if (w.patient and w.patient.user) else f"Patient {w.patient_id}"
            recent_events.append({
                'id': w.id,
                'patient_id': w.patient_id,
                'patient_uhid': w.patient.patient_id if w.patient else 'N/A',
                'patient_name': p_name,
                'surgery_details': w.surgery_details or 'General Post-Op',
                'recovery_day': w.recovery_day,
                'upload_date': w.upload_date,
                'assessment_result': w.assessment_result,
                'confidence': w.confidence,
                'is_urgent': w.is_urgent,
                'doctor_review_status': w.doctor_review_status,
                'doctor_review': w.doctor_review,
                'reviewed_by_name': w.reviewed_by.user.get_full_name() if (w.reviewed_by and w.reviewed_by.user) else None,
                'reviewed_at': w.reviewed_at,
            })

        return Response({
            'total_uploaded': total_uploaded,
            'awaiting_ai': awaiting_ai,
            'awaiting_ai_analysis': awaiting_ai,
            'awaiting_doctor_review': awaiting_doctor_review,
            'awaiting_physician_review': awaiting_doctor_review,
            'reviewed_cases': reviewed_cases,
            'urgent_cases': urgent_cases,
            'urgent_attention_cases': urgent_cases,
            'recent_events': recent_events,
            'recent_audits': recent_events
        })

class WoundAssessmentReviewView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, pk, *args, **kwargs):
        if request.user.role != 'doctor' and not request.user.is_staff and request.user.role != 'admin':
            return Response({'error': 'Only doctors can review wound images'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            wound = WoundAssessment.objects.get(pk=pk)
        except WoundAssessment.DoesNotExist:
            return Response({'error': 'Wound image not found'}, status=status.HTTP_404_NOT_FOUND)
            
        wound.doctor_review = request.data.get('doctor_review', True)
        if wound.doctor_review and wound.doctor_review_status == 'pending':
            wound.doctor_review_status = 'reviewed'
        if hasattr(request.user, 'doctor_profile'):
            wound.reviewed_by = request.user.doctor_profile
        wound.reviewed_at = timezone.now()
        wound.save()
        return Response({'message': 'Review status updated', 'wound': WoundAssessmentSerializer(wound, context={'request': request}).data})


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
