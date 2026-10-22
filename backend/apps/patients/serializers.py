from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import Patient, Doctor, Nurse, Caregiver, Department


class DepartmentSerializer(serializers.ModelSerializer):
    doctors_count = serializers.SerializerMethodField()
    caregivers_count = serializers.SerializerMethodField()
    nurses_count = serializers.SerializerMethodField()
    patients_count = serializers.SerializerMethodField()
    head_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'description', 'created_at',
            'doctors_count', 'caregivers_count', 'nurses_count', 'patients_count', 'head_name'
        ]
        read_only_fields = ['id', 'created_at', 'doctors_count', 'caregivers_count', 'nurses_count', 'patients_count', 'head_name']

    def get_doctors_count(self, obj):
        return Doctor.objects.filter(department=obj).count()

    def get_caregivers_count(self, obj):
        return Caregiver.objects.filter(patient__primary_doctor__department=obj).count()

    def get_nurses_count(self, obj):
        return self.get_caregivers_count(obj)

    def get_patients_count(self, obj):
        return Patient.objects.filter(primary_doctor__department=obj, is_active=True).count()

    def get_head_name(self, obj):
        doc = Doctor.objects.filter(department=obj).select_related('user').first()
        if doc and doc.user:
            return f"Dr. {doc.user.get_full_name().strip() or doc.user.username}"
        return 'Not assigned'


class DoctorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    active_patients_count = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            'id', 'user', 'full_name', 'department', 'department_name',
            'specialization', 'license_number', 'active_patients_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'active_patients_count', 'department_name', 'full_name']

    def get_active_patients_count(self, obj):
        return Patient.objects.filter(primary_doctor=obj, is_active=True).count()


class NurseSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    assigned_patients_count = serializers.SerializerMethodField()

    class Meta:
        model = Nurse
        fields = [
            'id', 'user', 'full_name', 'department', 'department_name',
            'license_number', 'assigned_patients_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'assigned_patients_count', 'department_name', 'full_name']

    def get_assigned_patients_count(self, obj):
        return obj.patients.filter(is_active=True).count()


class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    primary_doctor_name = serializers.CharField(source='primary_doctor.user.get_full_name', read_only=True)

    class Meta:
        model = Patient
        fields = '__all__'


class CaregiverSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.SerializerMethodField()

    class Meta:
        model = Caregiver
        fields = [
            'id', 'user', 'full_name', 'email', 'phone', 'is_active',
            'patient', 'patient_name', 'patient_uhid', 'relationship', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'full_name', 'email', 'phone', 'is_active', 'patient_name', 'patient_uhid']

    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name()
        return 'Not assigned'

    def get_patient_uhid(self, obj):
        if obj.patient:
            return obj.patient.patient_id
        return '—'
