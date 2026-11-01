from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import DischargePlan, DischargeMedication, DischargeFollowUp
from .serializers import DischargePlanSerializer
from .permissions import IsDischargePlanAuthorized
from apps.patients.models import Patient, Doctor


class DischargePlanListCreateView(generics.ListCreateAPIView):
    serializer_class = DischargePlanSerializer
    permission_classes = [IsAuthenticated, IsDischargePlanAuthorized]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return DischargePlan.objects.none()

        qs = DischargePlan.objects.select_related(
            'patient__user', 'doctor__user', 'patient__primary_doctor__user'
        ).prefetch_related('medications', 'follow_ups')

        # 1. Administrator / Staff: Full access
        if user.is_staff or user.is_superuser or user.role == 'admin':
            return qs

        # 2. Doctor: View plans for assigned patients or authored by this doctor
        if user.role == 'doctor':
            doctor_profile = getattr(user, 'doctor_profile', None)
            if not doctor_profile:
                return DischargePlan.objects.none()
            return qs.filter(
                models.Q(doctor=doctor_profile) |
                models.Q(patient__primary_doctor=doctor_profile)
            ).distinct()

        # 3. Patient: View only their own discharge plan
        if user.role == 'patient':
            patient_profile = getattr(user, 'patient_profile', None)
            if not patient_profile:
                return DischargePlan.objects.none()
            return qs.filter(patient=patient_profile)

        # 4. Caregiver: View discharge plan for linked patient
        if user.role == 'caregiver':
            caregiver_profile = getattr(user, 'caregiver_profile', None)
            if not caregiver_profile or not caregiver_profile.patient:
                return DischargePlan.objects.none()
            return qs.filter(patient=caregiver_profile.patient)

        # 5. Nurse: View plans for assigned patients or in nurse department
        if user.role == 'nurse':
            nurse_profile = getattr(user, 'nurse_profile', None)
            if not nurse_profile:
                return DischargePlan.objects.none()
            return qs.filter(
                models.Q(patient__assigned_nurses=nurse_profile) |
                models.Q(patient__primary_doctor__department=nurse_profile.department)
            ).distinct()

        return DischargePlan.objects.none()

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
    serializer_class = DischargePlanSerializer
    permission_classes = [IsAuthenticated, IsDischargePlanAuthorized]

    def get_queryset(self):
        # We query all plans so get_object can check object permissions
        # and raise 403 Forbidden for existing but unauthorized plans,
        # or 404 Not Found if the plan does not exist.
        return DischargePlan.objects.select_related(
            'patient__user', 'doctor__user', 'patient__primary_doctor__user'
        ).prefetch_related('medications', 'follow_ups')

    def get_object(self):
        pk = self.kwargs.get('pk')
        raw_id = str(pk).strip()

        # Handle 'DP-801' or 'DP-1' prefix if sent by client
        if raw_id.upper().startswith('DP-'):
            cleaned = raw_id[3:]
        else:
            cleaned = raw_id

        queryset = self.get_queryset()
        try:
            lookup_id = int(cleaned)
            obj = get_object_or_404(queryset, pk=lookup_id)
        except (ValueError, TypeError):
            obj = get_object_or_404(queryset, pk=raw_id)

        # Enforce clinical object-level authorization
        self.check_object_permissions(self.request, obj)
        return obj
