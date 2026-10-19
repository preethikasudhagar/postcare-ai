from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.filter(recipient=user)
        if hasattr(user, 'doctor_profile'):
            patient_alerts = Notification.objects.filter(
                related_patient__primary_doctor=user.doctor_profile,
                type='high_risk_alert'
            )
            qs = (qs | patient_alerts).distinct()
        elif hasattr(user, 'nurse_profile'):
            patient_alerts = Notification.objects.filter(
                related_patient__assigned_nurse=user.nurse_profile,
                type='high_risk_alert'
            )
            qs = (qs | patient_alerts).distinct()

        notif_type = self.request.query_params.get('type')
        if notif_type and notif_type != 'all':
            qs = qs.filter(type=notif_type)

        unread = self.request.query_params.get('unread')
        if unread in ['true', '1', True]:
            qs = qs.filter(is_read=False)

        return qs.select_related('related_patient__user').order_by('-created_at')

class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk=None):
        if pk:
            notif = Notification.objects.filter(pk=pk).first()
            if not notif:
                return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
            is_authorized = (
                notif.recipient == request.user or
                (hasattr(request.user, 'doctor_profile') and notif.related_patient and notif.related_patient.primary_doctor == request.user.doctor_profile) or
                (hasattr(request.user, 'nurse_profile') and notif.related_patient and notif.related_patient.assigned_nurse == request.user.nurse_profile) or
                getattr(request.user, 'role', '') == 'admin'
            )
            if not is_authorized:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            notif.is_read = True
            notif.save()
            return Response(NotificationSerializer(notif).data)
        else:
            Notification.objects.filter(recipient=request.user).update(is_read=True)
            return Response({'message': 'All notifications marked as read'})
