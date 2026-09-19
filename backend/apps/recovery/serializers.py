from rest_framework import serializers
from .models import RecoveryCheckIn, RiskPrediction

class RiskPredictionSerializer(serializers.ModelSerializer):
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
