from datetime import datetime
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import FollowUp
from .serializers import FollowUpSerializer
from apps.notifications.models import Notification


class FollowUpListCreateView(generics.ListCreateAPIView):
    serializer_class = FollowUpSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return FollowUp.objects.filter(patient=user.patient_profile).select_related('patient__user', 'doctor__user')
        elif hasattr(user, 'caregiver_profile'):
            return FollowUp.objects.filter(patient=user.caregiver_profile.patient).select_related('patient__user', 'doctor__user')
        elif hasattr(user, 'doctor_profile'):
            return FollowUp.objects.filter(doctor=user.doctor_profile).select_related('patient__user', 'doctor__user')
        return FollowUp.objects.all().select_related('patient__user', 'doctor__user')


class FollowUpDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FollowUpSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return FollowUp.objects.filter(patient=user.patient_profile)
        elif hasattr(user, 'caregiver_profile'):
            return FollowUp.objects.filter(patient=user.caregiver_profile.patient)
        elif hasattr(user, 'doctor_profile'):
            return FollowUp.objects.filter(doctor=user.doctor_profile)
        return FollowUp.objects.all()


class RequestRescheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        followup = get_object_or_404(FollowUp, pk=pk)
        user = request.user

        # Ownership / authorization check
        is_owner = False
        if hasattr(user, 'patient_profile') and followup.patient == user.patient_profile:
            is_owner = True
        elif hasattr(user, 'caregiver_profile') and followup.patient == user.caregiver_profile.patient:
            is_owner = True
        elif getattr(user, 'role', '') in ['admin', 'doctor', 'nurse'] or user.is_staff or user.is_superuser:
            is_owner = True

        if not is_owner:
            return Response(
                {'error': 'You are not authorized to request rescheduling for this appointment.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Status check: do not allow rescheduling for completed or cancelled appointments
        if followup.status in ['completed', 'cancelled']:
            return Response(
                {'error': f'Cannot request reschedule for an appointment that is already {followup.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent duplicate pending requests
        if followup.reschedule_requested or followup.status == 'reschedule_requested':
            return Response(
                {'error': 'A reschedule request is already pending review for this appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_date_raw = request.data.get('reschedule_date') or request.data.get('date')
        new_time_raw = request.data.get('reschedule_time') or request.data.get('time')
        reason = (request.data.get('reschedule_reason') or request.data.get('reason') or '').strip()

        if not new_date_raw or not new_time_raw:
            return Response(
                {'error': 'Both requested date and time are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate date format (YYYY-MM-DD)
        try:
            parsed_date = datetime.strptime(str(new_date_raw).strip(), '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Expected YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate time format
        parsed_time = None
        for fmt in ('%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M%p'):
            try:
                parsed_time = datetime.strptime(str(new_time_raw).strip(), fmt).time()
                break
            except ValueError:
                continue

        if not parsed_time:
            return Response(
                {'error': 'Invalid time format. Please select a valid consultation time slot.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Do not allow past dates or times
        now = timezone.now()
        local_now = timezone.localtime(now) if timezone.is_aware(now) else now
        req_dt = datetime.combine(parsed_date, parsed_time)
        if timezone.is_aware(local_now):
            req_dt = timezone.make_aware(req_dt, timezone.get_current_timezone())

        if req_dt <= local_now:
            return Response(
                {'error': 'Requested reschedule date and time cannot be in the past.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if requested time is identical to the current scheduled appointment
        if followup.appointment_date == parsed_date and followup.appointment_time == parsed_time:
            return Response(
                {'error': 'Requested date and time must be different from the currently scheduled appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Conflict checking: check doctor's existing schedule for conflicting bookings
        if followup.doctor:
            has_conflict = FollowUp.objects.filter(
                doctor=followup.doctor,
                appointment_date=parsed_date,
                appointment_time=parsed_time,
                status__in=['upcoming', 'rescheduled']
            ).exclude(pk=followup.pk).exists()

            if has_conflict:
                doc_name = f"Dr. {followup.doctor.user.get_full_name()}" if (followup.doctor.user and followup.doctor.user.get_full_name()) else "The assigned doctor"
                return Response(
                    {'error': f'{doc_name} already has an appointment scheduled at this time. Please select another slot.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Update follow-up record to record reschedule request without altering current appointment
        followup.reschedule_requested = True
        followup.reschedule_date = parsed_date
        followup.reschedule_time = parsed_time
        followup.reschedule_reason = reason
        followup.status = 'reschedule_requested'
        followup.save()

        # Send notification to doctor if assigned
        if followup.doctor and followup.doctor.user:
            patient_name = followup.patient.user.get_full_name() if (followup.patient and followup.patient.user) else "Patient"
            time_display = parsed_time.strftime('%I:%M %p')
            Notification.objects.create(
                recipient=followup.doctor.user,
                type='appointment_update',
                title='Follow-up Reschedule Requested',
                message=f"{patient_name} requested to reschedule '{followup.purpose}' from {followup.appointment_date} to {parsed_date} at {time_display}. Reason: {reason or 'Not specified'}",
                related_patient=followup.patient
            )

        return Response(FollowUpSerializer(followup).data, status=status.HTTP_200_OK)


class ReviewRescheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        followup = get_object_or_404(FollowUp, pk=pk)
        user = request.user

        # Authorization: assigned doctor, nurse, admin, or staff
        is_authorized = (
            (hasattr(user, 'doctor_profile') and followup.doctor == user.doctor_profile) or
            hasattr(user, 'nurse_profile') or
            getattr(user, 'role', '') in ['doctor', 'nurse', 'admin'] or
            user.is_staff or user.is_superuser
        )
        if not is_authorized:
            return Response(
                {'error': 'Only authorized clinical staff can review reschedule requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not followup.reschedule_requested or not followup.reschedule_date or not followup.reschedule_time:
            return Response(
                {'error': 'No pending reschedule request found for this appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        action = str(request.data.get('action', '')).strip().lower()
        note = (request.data.get('note') or request.data.get('reason') or '').strip()

        if action not in ['approve', 'reject']:
            return Response(
                {'error': "Invalid action. Must be either 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        reviewer_name = user.get_full_name() or user.username or "Doctor"
        if not reviewer_name.startswith("Dr.") and getattr(user, 'role', '') == 'doctor':
            reviewer_name = f"Dr. {reviewer_name}"

        if action == 'approve':
            # Revalidate availability before approval
            if followup.doctor:
                has_conflict = FollowUp.objects.filter(
                    doctor=followup.doctor,
                    appointment_date=followup.reschedule_date,
                    appointment_time=followup.reschedule_time,
                    status__in=['upcoming', 'rescheduled']
                ).exclude(pk=followup.pk).exists()

                if has_conflict:
                    return Response(
                        {'error': 'Cannot approve: A conflicting appointment has already been scheduled for this slot.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Preserve history in notes
            old_date = followup.appointment_date
            old_time = followup.appointment_time
            new_date = followup.reschedule_date
            new_time = followup.reschedule_time
            time_display = new_time.strftime('%I:%M %p') if hasattr(new_time, 'strftime') else str(new_time)
            hist_msg = f"[Reschedule Approved] Moved from {old_date} {old_time} to {new_date} {time_display} by {reviewer_name}."
            if note:
                hist_msg += f" Note: {note}"

            followup.notes = f"{followup.notes}\n{hist_msg}".strip() if followup.notes else hist_msg
            followup.appointment_date = new_date
            followup.appointment_time = new_time
            followup.status = 'rescheduled'
            followup.reschedule_requested = False
            followup.reschedule_date = None
            followup.reschedule_time = None
            followup.reschedule_reason = ''
            followup.save()

            # Notify patient
            if followup.patient and followup.patient.user:
                Notification.objects.create(
                    recipient=followup.patient.user,
                    type='appointment_update',
                    title='Appointment Reschedule Approved',
                    message=f"Your request to reschedule '{followup.purpose}' was approved by {reviewer_name}. Your new appointment is on {new_date} at {time_display}." + (f" Note: {note}" if note else ""),
                    related_patient=followup.patient
                )

        elif action == 'reject':
            # Retain original appointment
            time_display = followup.reschedule_time.strftime('%I:%M %p') if hasattr(followup.reschedule_time, 'strftime') else str(followup.reschedule_time)
            hist_msg = f"[Reschedule Declined] Request for {followup.reschedule_date} {time_display} declined by {reviewer_name}."
            if note:
                hist_msg += f" Reason: {note}"

            orig_time_display = followup.appointment_time.strftime('%I:%M %p') if hasattr(followup.appointment_time, 'strftime') else str(followup.appointment_time)
            followup.notes = f"{followup.notes}\n{hist_msg}".strip() if followup.notes else hist_msg
            followup.status = 'upcoming'
            followup.reschedule_requested = False
            followup.reschedule_date = None
            followup.reschedule_time = None
            followup.reschedule_reason = ''
            followup.save()

            # Notify patient
            if followup.patient and followup.patient.user:
                Notification.objects.create(
                    recipient=followup.patient.user,
                    type='appointment_update',
                    title='Appointment Reschedule Request Declined',
                    message=f"Your request to reschedule '{followup.purpose}' was declined by {reviewer_name}. Your consultation remains scheduled for {followup.appointment_date} at {orig_time_display}." + (f" Reason: {note}" if note else ""),
                    related_patient=followup.patient
                )

        return Response(FollowUpSerializer(followup).data, status=status.HTTP_200_OK)
