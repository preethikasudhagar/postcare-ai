from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import RecoveryCheckIn, RiskPrediction
from .serializers import RecoveryCheckInSerializer, RiskPredictionSerializer
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
        patient_id = self.kwargs.get('patient_id')
        if patient_id:
            return RecoveryCheckIn.objects.filter(patient_id=patient_id)
        if hasattr(self.request.user, 'patient_profile'):
            return RecoveryCheckIn.objects.filter(patient=self.request.user.patient_profile)
        return RecoveryCheckIn.objects.none()
