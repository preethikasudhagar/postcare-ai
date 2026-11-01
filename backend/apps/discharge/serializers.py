from rest_framework import serializers
from .models import DischargePlan, DischargeMedication, DischargeFollowUp


class DischargeMedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DischargeMedication
        fields = '__all__'


class DischargeFollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = DischargeFollowUp
        fields = '__all__'


class DischargePlanSerializer(serializers.ModelSerializer):
    medications = DischargeMedicationSerializer(many=True, read_only=True)
    follow_ups = DischargeFollowUpSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)
    patient_uhid = serializers.CharField(source='patient.patient_id', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_license = serializers.CharField(source='doctor.license_number', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    department_name = serializers.CharField(source='doctor.department.name', read_only=True)
    plan_reference = serializers.SerializerMethodField()

    class Meta:
        model = DischargePlan
        fields = '__all__'

    def get_plan_reference(self, obj):
        return f"DP-{obj.id:03d}"
