from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import DischargePlan
from .serializers import DischargePlanSerializer

class DischargePlanListCreateView(generics.ListCreateAPIView):
    queryset = DischargePlan.objects.all()
    serializer_class = DischargePlanSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        doc = getattr(self.request.user, 'doctor_profile', None)
        serializer.save(doctor=doc)

class DischargePlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DischargePlan.objects.all()
    serializer_class = DischargePlanSerializer
    permission_classes = [IsAuthenticated]
