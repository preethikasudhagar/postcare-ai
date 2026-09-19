from rest_framework import serializers
from .models import Medication, MedicationLog

class MedicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationLog
        fields = '__all__'

class MedicationSerializer(serializers.ModelSerializer):
    logs = MedicationLogSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)

    class Meta:
        model = Medication
        fields = '__all__'
