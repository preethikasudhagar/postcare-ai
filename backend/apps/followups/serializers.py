from rest_framework import serializers
from .models import FollowUp

class FollowUpSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)

    class Meta:
        model = FollowUp
        fields = '__all__'
