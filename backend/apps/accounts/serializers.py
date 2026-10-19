from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    patient_profile_id = serializers.SerializerMethodField()
    patient_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 
            'phone', 'is_active', 'date_joined',
            'patient_profile_id', 'patient_id'
        ]
        read_only_fields = ['id', 'date_joined']

    def get_patient_profile_id(self, obj):
        if hasattr(obj, 'patient_profile') and obj.patient_profile:
            return obj.patient_profile.id
        elif hasattr(obj, 'caregiver_profile') and obj.caregiver_profile and obj.caregiver_profile.patient:
            return obj.caregiver_profile.patient.id
        return None

    def get_patient_id(self, obj):
        if hasattr(obj, 'patient_profile') and obj.patient_profile:
            return obj.patient_profile.patient_id
        elif hasattr(obj, 'caregiver_profile') and obj.caregiver_profile and obj.caregiver_profile.patient:
            return obj.caregiver_profile.patient.patient_id
        return None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'password', 'role', 'phone']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data.get('username') or validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'patient'),
            phone=validated_data.get('phone', '')
        )
        if user.role == 'patient':
            from apps.patients.models import Patient
            from django.utils import timezone
            Patient.objects.create(
                user=user,
                patient_id=f"PAT-{user.id:04d}",
                gender='O',
                blood_group='O+',
                surgery_type='General Post-Operative Recovery',
                surgery_date=timezone.now().date(),
                discharge_date=timezone.now().date(),
            )
        return user
