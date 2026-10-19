import logging
from django.db import models
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from apps.accounts.models import User
from apps.patients.models import Patient, Doctor, Nurse

logger = logging.getLogger(__name__)


def is_user_authorized_for_conversation(user: User, conv: Conversation) -> bool:
    """
    Checks if a user has permission to access a conversation.
    Participants, Admins, and assigned Caregivers of the related patient are permitted.
    """
    if not user.is_authenticated:
        return False
    if user.role == 'admin':
        return True
    if conv.participants.filter(id=user.id).exists():
        return True
    if user.role == 'caregiver' and hasattr(user, 'caregiver_profile') and conv.related_patient:
        if user.caregiver_profile.patient == conv.related_patient:
            return True
    return False


class PatientCareTeamContactsView(APIView):
    """
    GET /api/messages/care-team/
        /api/messages/contacts/
    Returns all authorized care-team members for the authenticated patient or caregiver,
    including clinician metadata, existing conversation ID, latest message preview, and unread count.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # 1. Resolve patient profile
        patient = None
        if user.role == 'patient':
            patient = getattr(user, 'patient_profile', None)
            if not patient:
                return Response({
                    'has_patient_profile': False,
                    'has_care_team': False,
                    'contacts': [],
                    'message': 'No linked patient profile found for this account. Please contact clinical administration.'
                }, status=status.HTTP_200_OK)
        elif user.role == 'caregiver':
            caregiver = getattr(user, 'caregiver_profile', None)
            patient = caregiver.patient if caregiver else None
            if not patient:
                return Response({
                    'has_patient_profile': False,
                    'has_care_team': False,
                    'contacts': [],
                    'message': 'No linked patient assignment found for this caregiver account.'
                }, status=status.HTTP_200_OK)
        else:
            # Doctor/Nurse/Admin: If patient param provided, resolve for that patient
            patient_param = request.query_params.get('patient') or request.query_params.get('patient_id')
            if patient_param:
                try:
                    if str(patient_param).isdigit():
                        patient = Patient.objects.get(id=patient_param)
                    else:
                        patient = Patient.objects.get(patient_id=patient_param)
                except Patient.DoesNotExist:
                    return Response({'error': 'Patient record not found.'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({
                    'has_patient_profile': True,
                    'has_care_team': True,
                    'contacts': []
                }, status=status.HTTP_200_OK)

        # 2. Gather care-team clinicians
        contacts_dict = {}

        def add_clinician(clinician_user, role_title, specialty='', dept_name='', is_primary=False):
            if not clinician_user or not clinician_user.is_active or clinician_user.id == user.id:
                return
            if clinician_user.id in contacts_dict:
                if is_primary:
                    contacts_dict[clinician_user.id]['is_primary'] = True
                return

            formatted_name = clinician_user.get_full_name() or clinician_user.email
            if clinician_user.role == 'doctor' and not formatted_name.startswith('Dr.'):
                formatted_name = f"Dr. {formatted_name}"
            elif clinician_user.role == 'nurse' and not formatted_name.startswith('Nurse'):
                formatted_name = f"Nurse {formatted_name}"

            # Check for existing conversation between request.user and this clinician
            conv = Conversation.objects.filter(participants=user).filter(participants=clinician_user).first()
            conv_id = conv.id if conv else None
            latest_msg_data = None
            unread_count = 0

            if conv:
                latest_msg = conv.messages.last()
                if latest_msg:
                    latest_msg_data = {
                        'id': latest_msg.id,
                        'content': latest_msg.content,
                        'sent_at': latest_msg.sent_at.isoformat(),
                        'sender_id': latest_msg.sender_id,
                        'sender_name': latest_msg.sender.get_full_name() if latest_msg.sender else 'Clinician',
                        'is_read': latest_msg.is_read
                    }
                unread_count = conv.messages.exclude(sender=user).filter(is_read=False).count()

            contacts_dict[clinician_user.id] = {
                'id': clinician_user.id,
                'user_id': clinician_user.id,
                'name': formatted_name,
                'email': clinician_user.email,
                'role': clinician_user.role,
                'title': role_title,
                'specialty': specialty,
                'department': dept_name,
                'online': clinician_user.is_active,
                'is_primary': is_primary,
                'conversation_id': conv_id,
                'latest_message': latest_msg_data,
                'unread_count': unread_count,
            }

        # Primary Doctor
        if patient.primary_doctor and patient.primary_doctor.user:
            doc = patient.primary_doctor
            add_clinician(
                doc.user,
                role_title=doc.specialization or "Primary Attending Physician",
                specialty=doc.specialization or "Surgery",
                dept_name=doc.department.name if doc.department else "Surgical Department",
                is_primary=True
            )

        # Assigned Nurses
        for nurse in patient.assigned_nurses.select_related('user', 'department').all():
            if nurse.user:
                add_clinician(
                    nurse.user,
                    role_title="Post-Operative Care Coordinator",
                    specialty=nurse.department.name if nurse.department else "Nursing",
                    dept_name=nurse.department.name if nurse.department else "Nursing Care",
                    is_primary=True
                )

        # Follow-up Doctors
        from apps.followups.models import FollowUp
        for fu in FollowUp.objects.filter(patient=patient).select_related('doctor__user', 'doctor__department'):
            if fu.doctor and fu.doctor.user:
                doc = fu.doctor
                add_clinician(
                    doc.user,
                    role_title=doc.specialization or "Consultant Physician",
                    specialty=doc.specialization or "Follow-up Care",
                    dept_name=doc.department.name if doc.department else fu.department,
                    is_primary=False
                )

        # Department Doctors
        if patient.primary_doctor and patient.primary_doctor.department:
            dept_docs = Doctor.objects.filter(
                department=patient.primary_doctor.department,
                user__is_active=True
            ).exclude(id=patient.primary_doctor.id).select_related('user', 'department')
            for doc in dept_docs:
                if doc.user:
                    add_clinician(
                        doc.user,
                        role_title=doc.specialization or f"Specialist ({doc.department.name})",
                        specialty=doc.specialization or "Specialist",
                        dept_name=doc.department.name,
                        is_primary=False
                    )

        # Clinicians with existing conversations
        existing_convs = user.conversations.filter(related_patient=patient).prefetch_related('participants')
        for c in existing_convs:
            for p in c.participants.exclude(id=user.id):
                if p.role in ['doctor', 'nurse'] and p.id not in contacts_dict:
                    title = "Clinical Team"
                    dept = ""
                    if hasattr(p, 'doctor_profile'):
                        title = p.doctor_profile.specialization or "Physician"
                        dept = p.doctor_profile.department.name if p.doctor_profile.department else ""
                    elif hasattr(p, 'nurse_profile'):
                        title = "Post-Op Nurse"
                        dept = p.nurse_profile.department.name if p.nurse_profile.department else ""
                    add_clinician(p, role_title=title, dept_name=dept, is_primary=False)

        contacts_list = list(contacts_dict.values())
        # Sort: primary contacts first, then active conversations, then latest messages, then name
        contacts_list.sort(key=lambda x: (
            not x['is_primary'],
            not bool(x['conversation_id']),
            not bool(x['latest_message']),
            x['name']
        ))

        has_care_team = len(contacts_list) > 0

        return Response({
            'has_patient_profile': True,
            'has_care_team': has_care_team,
            'patient_uhid': patient.patient_id,
            'patient_name': patient.user.get_full_name() if patient.user else '',
            'contacts': contacts_list,
            'message': 'Care team contacts loaded successfully.' if has_care_team else 'No clinical care team members have been assigned to your patient record yet. Please contact clinical administration.'
        }, status=status.HTTP_200_OK)


class ConversationListCreateView(APIView):
    """
    GET  /api/messages/conversations/
         Lists all conversations accessible to the authenticated user.
    POST /api/messages/conversations/
         Finds or creates a conversation with a specific care team member or patient.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Auto-provision conversations for patients with their care team if not present
        if user.role == 'patient' and hasattr(user, 'patient_profile'):
            pat = user.patient_profile
            if pat.primary_doctor and pat.primary_doctor.user:
                doc_user = pat.primary_doctor.user
                if not Conversation.objects.filter(participants=user).filter(participants=doc_user).exists():
                    c = Conversation.objects.create(related_patient=pat)
                    c.participants.add(user, doc_user)
            for nurse in pat.assigned_nurses.all():
                if nurse.user:
                    if not Conversation.objects.filter(participants=user).filter(participants=nurse.user).exists():
                        c = Conversation.objects.create(related_patient=pat)
                        c.participants.add(user, nurse.user)

        if user.role == 'admin':
            qs = Conversation.objects.all().order_by('-updated_at')
        elif user.role == 'caregiver' and hasattr(user, 'caregiver_profile') and user.caregiver_profile.patient:
            pat = user.caregiver_profile.patient
            qs = Conversation.objects.filter(
                models.Q(participants=user) | models.Q(related_patient=pat)
            ).distinct().order_by('-updated_at')
        else:
            qs = user.conversations.all().order_by('-updated_at')

        serializer = ConversationSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        user = request.user
        recipient_id = request.data.get('recipient_id')
        recipient_email = request.data.get('recipient_email')
        patient_id = request.data.get('patient_id')

        # 1. Resolve recipient User
        recipient_user = None
        if recipient_id:
            try:
                recipient_user = User.objects.get(id=recipient_id, is_active=True)
            except User.DoesNotExist:
                return Response(
                    {'error': f"Recipient user with ID {recipient_id} not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif recipient_email:
            try:
                recipient_user = User.objects.get(email__iexact=recipient_email.strip(), is_active=True)
            except User.DoesNotExist:
                return Response(
                    {'error': f"Recipient user with email '{recipient_email}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': "recipient_id or recipient_email is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if recipient_user.id == user.id:
            return Response(
                {'error': "Cannot create a conversation with yourself."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Check authorization rules
        # Patient can message only authorized members of their clinical care team
        if user.role == 'patient':
            pat = getattr(user, 'patient_profile', None)
            if not pat:
                return Response(
                    {'error': "Patient profile not found."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            care_team_user_ids = set()
            if pat.primary_doctor:
                care_team_user_ids.add(pat.primary_doctor.user_id)
                if pat.primary_doctor.department:
                    dept_doc_ids = Doctor.objects.filter(
                        department=pat.primary_doctor.department
                    ).values_list('user_id', flat=True)
                    care_team_user_ids.update(dept_doc_ids)
            for nurse in pat.assigned_nurses.all():
                care_team_user_ids.add(nurse.user_id)
            for caregiver in pat.caregivers.all():
                care_team_user_ids.add(caregiver.user_id)

            # Include any clinician from patient followups
            from apps.followups.models import FollowUp
            followup_docs = FollowUp.objects.filter(patient=pat).values_list('doctor__user_id', flat=True)
            care_team_user_ids.update([f for f in followup_docs if f])

            # Also allow clinicians with an existing conversation
            existing_conn_ids = Conversation.objects.filter(participants=user).values_list('participants__id', flat=True)
            care_team_user_ids.update(existing_conn_ids)

            if recipient_user.id not in care_team_user_ids:
                return Response(
                    {'error': "You can only message authorized members of your clinical care team."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Doctors/nurses can initiate conversation with patient only if authorized
        if user.role in ['doctor', 'nurse'] and recipient_user.role == 'patient':
            pat = getattr(recipient_user, 'patient_profile', None)
            if pat:
                is_authorized = False
                if user.role == 'doctor':
                    if pat.primary_doctor and pat.primary_doctor.user_id == user.id:
                        is_authorized = True
                    elif hasattr(user, 'doctor_profile') and pat.primary_doctor and user.doctor_profile.department_id == pat.primary_doctor.department_id:
                        is_authorized = True
                    else:
                        from apps.followups.models import FollowUp
                        if FollowUp.objects.filter(patient=pat, doctor__user=user).exists():
                            is_authorized = True
                elif user.role == 'nurse':
                    if pat.assigned_nurses.filter(user=user).exists():
                        is_authorized = True
                    elif hasattr(user, 'nurse_profile') and pat.primary_doctor and user.nurse_profile.department_id == pat.primary_doctor.department_id:
                        is_authorized = True

                if not is_authorized and not Conversation.objects.filter(participants=user).filter(participants=recipient_user).exists():
                    return Response(
                        {'error': "You are not authorized to start a conversation with this patient."},
                        status=status.HTTP_403_FORBIDDEN
                    )

        # 3. Resolve related patient
        related_patient = None
        if patient_id:
            try:
                related_patient = Patient.objects.get(id=patient_id)
            except Patient.DoesNotExist:
                pass
        elif hasattr(user, 'patient_profile'):
            related_patient = user.patient_profile
        elif hasattr(recipient_user, 'patient_profile'):
            related_patient = recipient_user.patient_profile
        elif hasattr(user, 'caregiver_profile'):
            related_patient = user.caregiver_profile.patient

        # 4. Check for existing conversation between these exact two participants
        existing = Conversation.objects.filter(participants=user).filter(participants=recipient_user).first()
        if existing:
            serializer = ConversationSerializer(existing, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        # 5. Create new conversation
        conv = Conversation.objects.create(related_patient=related_patient)
        conv.participants.add(user, recipient_user)
        conv.save()

        serializer = ConversationSerializer(conv, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    """
    GET /api/messages/conversations/<int:conv_id>/
    Retrieves metadata for a specific conversation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, conv_id):
        conv = get_object_or_404(Conversation, id=conv_id)
        if not is_user_authorized_for_conversation(request.user, conv):
            raise PermissionDenied("You are not authorized to view this conversation.")

        serializer = ConversationSerializer(conv, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageListCreateView(APIView):
    """
    GET  /api/messages/conversations/<int:conv_id>/messages/
         Lists all messages in the conversation, ordered chronologically.
         Automatically marks unread incoming messages as read upon recipient view.
    POST /api/messages/conversations/<int:conv_id>/messages/
         Sends a new message in the conversation.
    """
    permission_classes = [IsAuthenticated]

    def _get_authorized_conversation(self, request, conv_id) -> Conversation:
        conv = get_object_or_404(Conversation, id=conv_id)
        if not is_user_authorized_for_conversation(request.user, conv):
            raise PermissionDenied("You are not authorized to participate in this conversation.")
        return conv

    def get(self, request, conv_id):
        conv = self._get_authorized_conversation(request, conv_id)

        # Confirm recipient viewing: Mark unread messages sent by others as read
        unread_incoming = conv.messages.exclude(sender=request.user).filter(is_read=False)
        if unread_incoming.exists():
            unread_incoming.update(is_read=True)

        messages = conv.messages.all().select_related('sender').order_by('sent_at')
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, conv_id):
        conv = self._get_authorized_conversation(request, conv_id)

        serializer = MessageSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Persist message with authenticated sender and validated conversation
        message = serializer.save(sender=request.user, conversation=conv)

        # Update conversation latest timestamp
        conv.updated_at = timezone.now()
        conv.save(update_fields=['updated_at'])

        logger.info(
            "Message #%d sent by %s in Conversation #%d",
            message.id, request.user.email, conv.id
        )

        return Response(
            MessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class MarkMessagesReadView(APIView):
    """
    POST /api/messages/conversations/<int:conv_id>/read/
    Explicitly marks all unread incoming messages in a conversation as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, conv_id):
        conv = get_object_or_404(Conversation, id=conv_id)
        if not is_user_authorized_for_conversation(request.user, conv):
            raise PermissionDenied("You are not authorized for this conversation.")

        updated_count = conv.messages.exclude(sender=request.user).filter(is_read=False).update(is_read=True)
        return Response(
            {'status': 'success', 'marked_read_count': updated_count},
            status=status.HTTP_200_OK
        )

