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
    
    class Meta:
        model = WoundAssessment
        fields = '__all__'
        read_only_fields = ['patient', 'upload_date', 'uploaded_by', 'assessment_result', 'confidence', 'raw_probabilities', 'assessment_reason']

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
