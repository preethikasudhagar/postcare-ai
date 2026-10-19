from rest_framework import serializers
from .models import FollowUp

class FollowUpSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    patient_uhid = serializers.SerializerMethodField()

    class Meta:
        model = FollowUp
        fields = '__all__'

    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return 'Patient'

    def get_doctor_name(self, obj):
        if obj.doctor and obj.doctor.user:
            name = obj.doctor.user.get_full_name() or obj.doctor.user.username
            return f"Dr. {name}" if not name.startswith("Dr.") else name
        return 'Attending Physician'

    def get_patient_uhid(self, obj):
        if obj.patient:
            return obj.patient.patient_id
        return ''
