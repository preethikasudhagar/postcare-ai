from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import FollowUp
from .serializers import FollowUpSerializer

class FollowUpListCreateView(generics.ListCreateAPIView):
    serializer_class = FollowUpSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return FollowUp.objects.filter(patient=user.patient_profile)
        elif hasattr(user, 'doctor_profile'):
            return FollowUp.objects.filter(doctor=user.doctor_profile)
        return FollowUp.objects.all()

class FollowUpDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FollowUp.objects.all()
    serializer_class = FollowUpSerializer
    permission_classes = [IsAuthenticated]
