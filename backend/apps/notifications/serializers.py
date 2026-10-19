from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='related_patient.user.get_full_name', read_only=True, default='')
    patient_uhid = serializers.CharField(source='related_patient.patient_id', read_only=True, default='')
    procedure = serializers.CharField(source='related_patient.surgery_type', read_only=True, default='')

    class Meta:
        model = Notification
        fields = '__all__'
