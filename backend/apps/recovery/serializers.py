from rest_framework import serializers
from .models import RecoveryCheckIn, RiskPrediction, WoundAssessment

class RiskPredictionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True, default='')
    patient_uhid = serializers.CharField(source='patient.patient_id', read_only=True, default='')
    procedure = serializers.CharField(source='patient.surgery_type', read_only=True, default='')
    checkin_date = serializers.DateField(source='checkin.date', read_only=True, default=None)
    pain_level = serializers.IntegerField(source='checkin.pain_level', read_only=True, default=None)
    temperature = serializers.FloatField(source='checkin.temperature', read_only=True, default=None)
    wound_condition = serializers.CharField(source='checkin.wound_condition', read_only=True, default='')
    recovery_score = serializers.FloatField(source='checkin.recovery_score', read_only=True, default=None)
    reviewed_by_name = serializers.CharField(source='reviewed_by.user.get_full_name', read_only=True, default='')

    class Meta:
        model = RiskPrediction
        fields = '__all__'

class RecoveryCheckInSerializer(serializers.ModelSerializer):
    risk_prediction = RiskPredictionSerializer(read_only=True)
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)

    class Meta:
        model = RecoveryCheckIn
        fields = '__all__'
        read_only_fields = ['recovery_score', 'submitted_at']

class WoundAssessmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True, default='')
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True, default='')
    patient_uhid = serializers.CharField(source='patient.patient_id', read_only=True, default='')
    reviewed_by_name = serializers.CharField(source='reviewed_by.user.get_full_name', read_only=True, default='')
    ai_analysis_status = serializers.SerializerMethodField()
    latest_vitals = serializers.SerializerMethodField()
    previous_images = serializers.SerializerMethodField()
    
    class Meta:
        model = WoundAssessment
        fields = '__all__'
        read_only_fields = [
            'patient', 'upload_date', 'uploaded_by', 'surgery_details', 
            'recovery_day', 'assessment_result', 'confidence', 
            'raw_probabilities', 'assessment_reason', 'ai_observations',
            'generated_recommendations', 'is_urgent', 'urgent_reasons',
            'doctor_review', 'doctor_review_status', 'reviewed_by', 'reviewed_at'
        ]

    def get_ai_analysis_status(self, obj):
        if obj.ai_observations and isinstance(obj.ai_observations, dict):
            return obj.ai_observations.get('ai_status', 'completed')
        if obj.assessment_result:
            return 'completed'
        return 'processing'

    def get_latest_vitals(self, obj):
        checkin = obj.patient.recovery_checkins.order_by('-date', '-submitted_at').first()
        if not checkin:
            return None
        return {
            'date': str(checkin.date),
            'pain_level': checkin.pain_level,
            'temperature': round(checkin.temperature, 1) if checkin.temperature else None,
            'wound_condition': checkin.wound_condition,
            'symptoms': checkin.symptoms or [],
            'medication_adherence': checkin.medication_adherence,
            'recovery_score': checkin.recovery_score,
        }

    def get_previous_images(self, obj):
        request = self.context.get('request')
        prior = WoundAssessment.objects.filter(
            patient=obj.patient,
            upload_date__lt=obj.upload_date
        ).order_by('-upload_date')[:4]
        
        results = []
        for p in prior:
            img_url = p.image.url if p.image else None
            if request and img_url and not img_url.startswith(('http://', 'https://')):
                img_url = request.build_absolute_uri(img_url)
            results.append({
                'id': p.id,
                'upload_date': p.upload_date,
                'image': img_url,
                'assessment_result': p.assessment_result,
                'doctor_review': p.doctor_review,
                'doctor_review_status': p.doctor_review_status,
                'recovery_day': p.recovery_day,
            })
        return results

    def validate_image(self, value):
        import os
        from django.core.exceptions import ValidationError
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            raise serializers.ValidationError('Only JPG, PNG, and WEBP formats are allowed.')
        
        limit = 5 * 1024 * 1024 # 5 MB
        if value.size > limit:
            raise serializers.ValidationError('File size cannot exceed 5MB.')
        
        return value

