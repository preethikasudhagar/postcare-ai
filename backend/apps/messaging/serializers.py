from rest_framework import serializers
from .models import Conversation, Message
from apps.accounts.serializers import UserSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    delivery_status = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'sender_role',
            'sender_email', 'content', 'is_read', 'delivery_status', 'sent_at', 'is_me'
        ]
        read_only_fields = ['id', 'conversation', 'sender', 'is_read', 'sent_at']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value.strip()

    def get_sender_name(self, obj):
        if not obj.sender:
            return "Unknown"
        name = obj.sender.get_full_name() or obj.sender.email
        if obj.sender.role == 'doctor' and not name.startswith('Dr.'):
            return f"Dr. {name}"
        elif obj.sender.role == 'nurse' and not name.startswith('Nurse'):
            return f"Nurse {name}"
        return name

    def get_delivery_status(self, obj):
        if obj.is_read:
            return 'read'
        return 'delivered'

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.sender_id == request.user.id
        return False


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    patient_uhid = serializers.CharField(source='related_patient.patient_id', read_only=True, default='')
    patient_name = serializers.CharField(source='related_patient.user.get_full_name', read_only=True, default='')
    patient_surgery = serializers.CharField(source='related_patient.surgery_type', read_only=True, default='')

    class Meta:
        model = Conversation
        fields = [
            'id', 'participants', 'related_patient', 'created_at', 'updated_at',
            'latest_message', 'unread_count', 'other_participant',
            'patient_uhid', 'patient_name', 'patient_surgery'
        ]

    def get_latest_message(self, obj):
        msg = obj.messages.last()
        return MessageSerializer(msg, context=self.context).data if msg else None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.messages.exclude(sender=request.user).filter(is_read=False).count()
        return 0

    def get_other_participant(self, obj):
        request = self.context.get('request')
        user = request.user if (request and hasattr(request, 'user') and request.user.is_authenticated) else None
        
        if user:
            other = obj.participants.exclude(id=user.id).first()
        else:
            other = obj.participants.first()

        if not other:
            return None

        role_title = other.role.capitalize()
        specialty = ''
        dept_name = ''
        uhid = ''
        surgery = ''

        if other.role == 'doctor' and hasattr(other, 'doctor_profile'):
            doc = other.doctor_profile
            specialty = doc.specialization or 'Physician'
            dept_name = doc.department.name if doc.department else 'Clinical Medicine'
            role_title = specialty or f"Dr. ({dept_name})"
        elif other.role == 'nurse' and hasattr(other, 'nurse_profile'):
            nurse = other.nurse_profile
            dept_name = nurse.department.name if nurse.department else 'Nursing Care'
            role_title = 'Post-Op Care Coordinator'
            specialty = dept_name
        elif other.role == 'patient' and hasattr(other, 'patient_profile'):
            pat = other.patient_profile
            uhid = pat.patient_id
            surgery = pat.surgery_type
            role_title = 'Patient'

        formatted_name = other.get_full_name() or other.email
        if other.role == 'doctor':
            if not formatted_name.startswith('Dr.'):
                formatted_name = f"Dr. {formatted_name}"
        elif other.role == 'nurse':
            if not formatted_name.startswith('Nurse'):
                formatted_name = f"Nurse {formatted_name}"

        return {
            'id': other.id,
            'name': formatted_name,
            'email': other.email,
            'role': other.role,
            'title': role_title,
            'specialty': specialty,
            'department': dept_name,
            'uhid': uhid,
            'surgery': surgery,
            'online': other.is_active,
        }

