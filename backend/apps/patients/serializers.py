from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import Patient, Doctor, Nurse, Caregiver, Department

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class DoctorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    class Meta:
        model = Doctor
        fields = '__all__'

class NurseSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    class Meta:
        model = Nurse
        fields = '__all__'

class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    primary_doctor_name = serializers.CharField(source='primary_doctor.user.get_full_name', read_only=True)
    class Meta:
        model = Patient
        fields = '__all__'

class CaregiverSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    patient = PatientSerializer(read_only=True)
    class Meta:
        model = Caregiver
        fields = '__all__'
