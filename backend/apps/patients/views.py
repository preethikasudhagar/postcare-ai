from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from apps.accounts.permissions import IsAdmin
from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from .models import Patient, Doctor, Nurse, Caregiver, Department
from .serializers import PatientSerializer, DoctorSerializer, NurseSerializer, CaregiverSerializer, DepartmentSerializer

class PatientListView(generics.ListCreateAPIView):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor' and hasattr(user, 'doctor_profile'):
            return Patient.objects.filter(primary_doctor=user.doctor_profile)
        elif user.role == 'nurse' and hasattr(user, 'nurse_profile'):
            return Patient.objects.filter(assigned_nurses=user.nurse_profile)
        elif user.role == 'patient' and hasattr(user, 'patient_profile'):
            return Patient.objects.filter(id=user.patient_profile.id)
        elif user.role == 'caregiver' and hasattr(user, 'caregiver_profile'):
            return Patient.objects.filter(id=user.caregiver_profile.patient.id)
        return Patient.objects.all()

class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        pk = self.kwargs.get('pk')
        try:
            # Integer pk → look up by database primary key
            if str(pk).lstrip('-').isdigit():
                patient = Patient.objects.get(id=pk)
            else:
                # String UHID (e.g. "P-2026-8941") → look up by patient_id field
                patient = Patient.objects.get(patient_id=pk)
        except Patient.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Patient not found.')
        self.check_object_permissions(self.request, patient)
        return patient

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated]

class NurseListView(generics.ListAPIView):
    queryset = Nurse.objects.all()
    serializer_class = NurseSerializer
    permission_classes = [IsAuthenticated]

class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

class PatientLinkAccountView(APIView):
    """
    Administrator-only view to securely link an existing user account to an existing patient record,
    or provision a new patient profile if no association exists.
    Enforces role-based authorization and prevents duplicate patient profiles.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        """
        List unlinked patient user accounts and existing patient records
        to support the Admin Portal patient management workflow.
        """
        unlinked_users = User.objects.filter(role='patient', patient_profile__isnull=True).order_by('id')
        all_patients = Patient.objects.select_related('user', 'primary_doctor__user').all().order_by('id')

        return Response({
            'unlinked_users': UserSerializer(unlinked_users, many=True).data,
            'patients': PatientSerializer(all_patients, many=True).data
        })

    def post(self, request):
        user_id = request.data.get('user_id')
        patient_id = request.data.get('patient_id')
        create_new = request.data.get('create_new', False)

        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User account not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Determine whether a patient profile ALREADY exists for target user (Req 1 & 3)
        existing_profile = getattr(target_user, 'patient_profile', None)
        if existing_profile:
            if patient_id and (str(patient_id) == str(existing_profile.id) or str(patient_id) == str(existing_profile.patient_id)):
                return Response({
                    'message': f'User {target_user.email} is already linked to patient profile {existing_profile.patient_id}.',
                    'patient': PatientSerializer(existing_profile).data,
                    'already_linked': True
                }, status=status.HTTP_200_OK)
            return Response({
                'error': f'User {target_user.email} is already linked to patient profile {existing_profile.patient_id}. Duplicate patient profiles are not permitted.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. If linking to an existing patient record
        with transaction.atomic():
            if patient_id and not create_new:
                try:
                    if str(patient_id).isdigit():
                        patient = Patient.objects.select_related('user').get(id=patient_id)
                    else:
                        patient = Patient.objects.select_related('user').get(patient_id=patient_id)
                except Patient.DoesNotExist:
                    return Response({'error': 'Patient medical record not found.'}, status=status.HTTP_404_NOT_FOUND)

                if patient.user == target_user:
                    return Response({
                        'message': f'User {target_user.email} is already linked to patient record {patient.patient_id}.',
                        'patient': PatientSerializer(patient).data
                    }, status=status.HTTP_200_OK)

                old_user = patient.user
                patient.user = target_user
                target_user.role = 'patient'
                target_user.save(update_fields=['role'])
                patient.save(update_fields=['user'])

                return Response({
                    'message': f'Successfully linked user {target_user.email} ({target_user.get_full_name()}) to patient record {patient.patient_id}.',
                    'patient': PatientSerializer(patient).data,
                    'previous_user_id': old_user.id if old_user else None
                }, status=status.HTTP_200_OK)

            # 3. If provisioning a new patient record for unlinked user
            target_user.role = 'patient'
            target_user.save(update_fields=['role'])

            generated_uhid = f"PAT-{target_user.id:04d}"
            counter = 1
            while Patient.objects.filter(patient_id=generated_uhid).exists():
                generated_uhid = f"PAT-{target_user.id:04d}-{counter}"
                counter += 1

            patient = Patient.objects.create(
                user=target_user,
                patient_id=generated_uhid,
                surgery_type=request.data.get('surgery_type') or 'General Post-Operative Recovery',
                surgery_date=request.data.get('surgery_date') or timezone.now().date(),
                discharge_date=request.data.get('discharge_date') or timezone.now().date(),
            )

            return Response({
                'message': f'Successfully created and linked new patient profile {patient.patient_id} for user {target_user.email}.',
                'patient': PatientSerializer(patient).data
            }, status=status.HTTP_201_CREATED)
