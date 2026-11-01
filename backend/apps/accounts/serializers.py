from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    patient_profile_id = serializers.SerializerMethodField()
    patient_id = serializers.SerializerMethodField()
    doctor_profile_id = serializers.SerializerMethodField()
    approval_status = serializers.SerializerMethodField()
    specialization = serializers.SerializerMethodField()
    license_number = serializers.SerializerMethodField()
    rejection_reason = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 
            'phone', 'is_active', 'date_joined',
            'patient_profile_id', 'patient_id',
            'doctor_profile_id', 'approval_status', 'specialization', 'license_number', 'rejection_reason'
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

    def get_doctor_profile_id(self, obj):
        if hasattr(obj, 'doctor_profile') and obj.doctor_profile:
            return obj.doctor_profile.id
        return None

    def get_approval_status(self, obj):
        if obj.role == 'doctor' and hasattr(obj, 'doctor_profile') and obj.doctor_profile:
            return obj.doctor_profile.approval_status
        return 'approved'

    def get_specialization(self, obj):
        if hasattr(obj, 'doctor_profile') and obj.doctor_profile:
            return obj.doctor_profile.specialization
        return None

    def get_license_number(self, obj):
        if hasattr(obj, 'doctor_profile') and obj.doctor_profile:
            return obj.doctor_profile.license_number
        return None

    def get_rejection_reason(self, obj):
        if hasattr(obj, 'doctor_profile') and obj.doctor_profile:
            return obj.doctor_profile.rejection_reason
        return None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False, allow_blank=True)
    specialization = serializers.CharField(required=False, allow_blank=True, write_only=True)
    license_number = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'password', 'role', 'phone', 'specialization', 'license_number']

    def validate_role(self, value):
        role = (value or '').strip().lower()
        if role in ['admin', 'nurse']:
            raise serializers.ValidationError(
                f"Public self-registration as '{role.title()}' is not permitted. Staff accounts must be provisioned by an administrator."
            )
        allowed_roles = ['patient', 'caregiver', 'doctor']
        if role not in allowed_roles:
            raise serializers.ValidationError(f"Invalid registration role '{value}'. Permitted roles: {', '.join(allowed_roles)}.")
        return role

    def create(self, validated_data):
        role = validated_data.get('role', 'patient')
        if role in ['admin', 'nurse']:
            raise serializers.ValidationError({'role': 'Public self-registration for this role is not permitted.'})

        specialization = (validated_data.pop('specialization', '') or '').strip()
        license_number = (validated_data.pop('license_number', '') or '').strip()

        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data.get('username') or validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=role,
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
        elif user.role == 'caregiver':
            from apps.patients.models import Caregiver
            Caregiver.objects.get_or_create(
                user=user,
                defaults={
                    'relationship': 'Primary Caregiver'
                }
            )
        elif user.role == 'doctor':
            from apps.patients.models import Doctor
            import random
            lic = license_number if license_number else f"MCI-{random.randint(100000, 999999)}-D"
            spec = specialization if specialization else 'General Surgery'
            Doctor.objects.create(
                user=user,
                specialization=spec,
                license_number=lic,
                approval_status='pending',
                rejection_reason=''
            )
        return user


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer used exclusively by authorized administrators to provision
    any user role (including admin, doctor, nurse, patient, and caregiver).
    """
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'password', 'role', 'phone']


    def create(self, validated_data):
        role = validated_data.get('role', 'patient')
        is_staff = role == 'admin'
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data.get('username') or validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=role,
            phone=validated_data.get('phone', ''),
            is_staff=is_staff
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
        elif user.role == 'caregiver':
            from apps.patients.models import Caregiver
            Caregiver.objects.get_or_create(
                user=user,
                defaults={
                    'relationship': 'Primary Caregiver'
                }
            )
        elif user.role == 'doctor':
            from apps.patients.models import Doctor
            import random
            Doctor.objects.get_or_create(
                user=user,
                defaults={
                    'specialization': 'General Surgery',
                    'license_number': f"MCI-{random.randint(100000, 999999)}-D",
                    'approval_status': 'approved'
                }
            )
        elif user.role == 'nurse':
            from apps.patients.models import Nurse
            import random
            Nurse.objects.get_or_create(
                user=user,
                defaults={
                    'license_number': f"KNC-{random.randint(10000, 99999)}-N"
                }
            )
        return user

