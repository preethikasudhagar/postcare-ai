from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Medication, MedicationLog
from .serializers import MedicationSerializer, MedicationLogSerializer

class MedicationListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'patient_profile'):
            return Medication.objects.filter(patient=user.patient_profile)
        return Medication.objects.all()

class MedicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]

class MedicationLogActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        medication = generics.get_object_or_404(Medication, pk=pk)
        action_status = request.data.get('status', 'taken')
        date_today = timezone.now().date()

        log, created = MedicationLog.objects.get_or_create(
            medication=medication,
            date=date_today,
            defaults={'status': action_status}
        )
        if not created:
            log.status = action_status
            log.save()

        return Response(MedicationLogSerializer(log).data)
