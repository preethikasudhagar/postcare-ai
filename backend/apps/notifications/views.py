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
        return Notification.objects.filter(recipient=self.request.user)

class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk=None):
        if pk:
            try:
                notif = Notification.objects.get(pk=pk, recipient=request.user)
                notif.is_read = True
                notif.save()
                return Response(NotificationSerializer(notif).data)
            except Notification.DoesNotExist:
                return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            Notification.objects.filter(recipient=request.user).update(is_read=True)
            return Response({'message': 'All notifications marked as read'})
