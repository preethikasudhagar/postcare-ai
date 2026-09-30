from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import DischargePlan, DischargeMedication, DischargeFollowUp
from .serializers import DischargePlanSerializer
from apps.patients.models import Patient, Doctor

class DischargePlanListCreateView(generics.ListCreateAPIView):
    queryset = DischargePlan.objects.all()
    serializer_class = DischargePlanSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        meds_data = data.pop('medications', [])
        followups_data = data.pop('follow_ups', [])

        patient_id = data.get('patient')
        if isinstance(patient_id, dict):
            patient_id = patient_id.get('id')
        elif str(patient_id).isdigit():
            patient_id = int(patient_id)
        else:
            first_patient = Patient.objects.first()
            patient_id = first_patient.id if first_patient else None

        data['patient'] = patient_id

        doc = getattr(request.user, 'doctor_profile', None)
        if not doc:
            doc = Doctor.objects.first()

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save(doctor=doc)

        for m in meds_data:
            DischargeMedication.objects.create(
                discharge_plan=plan,
                medicine_name=m.get('medicine_name') or m.get('name', 'Medication'),
                dosage=m.get('dosage', 'Standard'),
                frequency=m.get('frequency') or m.get('freq', 'Daily'),
                duration_days=int(m.get('duration_days') or str(m.get('duration', '7')).split()[0] or 7),
                instructions=m.get('instructions', '')
            )

        for f in followups_data:
            DischargeFollowUp.objects.create(
                discharge_plan=plan,
                appointment_date=f.get('appointment_date') or f.get('date', plan.discharge_date),
                appointment_time=f.get('appointment_time') or f.get('time', '10:00:00'),
                department=f.get('department', 'Orthopedics'),
                purpose=f.get('purpose', 'Post-Op Review')
            )

        headers = self.get_success_headers(serializer.data)
        return Response(DischargePlanSerializer(plan).data, status=status.HTTP_201_CREATED, headers=headers)

class DischargePlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DischargePlan.objects.all()
    serializer_class = DischargePlanSerializer
    permission_classes = [IsAuthenticated]
