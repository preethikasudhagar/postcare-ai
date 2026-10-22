from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.db.models import Q

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
            if user.caregiver_profile and user.caregiver_profile.patient_id:
                return Patient.objects.filter(id=user.caregiver_profile.patient_id)
            return Patient.objects.none()
        return Patient.objects.all().order_by('-id')


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


# ── Department Views ──────────────────────────────────────────────────────────

class DepartmentListCreateView(APIView):
    """
    List departments (authenticated users) or create a new department (admin only).
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        departments = Department.objects.all().order_by('name')
        search = request.query_params.get('search')
        if search:
            departments = departments.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        description = (request.data.get('description') or '').strip()

        if not name:
            return Response({'name': ['Department name is required.']}, status=status.HTTP_400_BAD_REQUEST)

        if Department.objects.filter(name__iexact=name).exists():
            return Response({'name': ['A department with this name already exists.']}, status=status.HTTP_400_BAD_REQUEST)

        dept = Department.objects.create(name=name, description=description)
        return Response(DepartmentSerializer(dept).data, status=status.HTTP_201_CREATED)


class DepartmentDetailView(APIView):
    """
    Retrieve, update, or remove a department (admin only for modifications).
    """
    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_object(self, pk):
        try:
            return Department.objects.get(pk=pk)
        except Department.DoesNotExist:
            return None

    def get(self, request, pk):
        dept = self.get_object(pk)
        if not dept:
            return Response({'detail': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(DepartmentSerializer(dept).data)

    def patch(self, request, pk):
        dept = self.get_object(pk)
        if not dept:
            return Response({'detail': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name')
        if name is not None:
            name = name.strip()
            if not name:
                return Response({'name': ['Department name cannot be blank.']}, status=status.HTTP_400_BAD_REQUEST)
            if Department.objects.filter(name__iexact=name).exclude(pk=pk).exists():
                return Response({'name': ['A department with this name already exists.']}, status=status.HTTP_400_BAD_REQUEST)
            dept.name = name

        if 'description' in request.data:
            dept.description = (request.data.get('description') or '').strip()

        dept.save()
        return Response(DepartmentSerializer(dept).data)

    def delete(self, request, pk):
        dept = self.get_object(pk)
        if not dept:
            return Response({'detail': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)
        dept.delete()
        return Response({'message': 'Department deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


# ── Doctor Views ──────────────────────────────────────────────────────────────

class DoctorListCreateView(APIView):
    """
    List doctors (authenticated users) or provision a new doctor/surgeon (admin only).
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        doctors = Doctor.objects.select_related('user', 'department').all().order_by('-id')
        search = request.query_params.get('search')
        if search:
            doctors = doctors.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(specialization__icontains=search) |
                Q(license_number__icontains=search) |
                Q(department__name__icontains=search)
            )
        dept_id = request.query_params.get('department')
        if dept_id and dept_id.isdigit():
            doctors = doctors.filter(department_id=int(dept_id))

        serializer = DoctorSerializer(doctors, many=True)
        return Response(serializer.data)

    def post(self, request):
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or 'Doctor@123'
        phone = (request.data.get('phone') or '').strip()
        specialization = (request.data.get('specialization') or 'General Surgery').strip()
        license_number = (request.data.get('license_number') or '').strip()
        dept_id = request.data.get('department')

        errors = {}
        if not first_name:
            errors['first_name'] = ['First name is required.']
        if not last_name:
            errors['last_name'] = ['Last name is required.']
        if not email:
            errors['email'] = ['Email address is required.']
        elif '@' not in email:
            errors['email'] = ['Please enter a valid email address.']

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Department resolution
        department_obj = None
        if dept_id:
            try:
                department_obj = Department.objects.get(pk=dept_id)
            except Department.DoesNotExist:
                return Response({'department': ['Selected department does not exist.']}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing user
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            if hasattr(existing_user, 'doctor_profile'):
                return Response({'email': ['A doctor profile is already registered with this email address.']}, status=status.HTTP_400_BAD_REQUEST)
            if existing_user.role != 'doctor':
                return Response({'email': [f"A user with this email already exists with role '{existing_user.role}'."]}, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique license number if blank
        if not license_number:
            import random
            license_number = f"MCI-{random.randint(100000, 999999)}-D"

        with transaction.atomic():
            if not existing_user:
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    role='doctor',
                    is_staff=False
                )
            else:
                user = existing_user
                user.first_name = first_name
                user.last_name = last_name
                if phone:
                    user.phone = phone
                user.save()

            doctor = Doctor.objects.create(
                user=user,
                department=department_obj,
                specialization=specialization,
                license_number=license_number
            )

        return Response(DoctorSerializer(doctor).data, status=status.HTTP_201_CREATED)


class DoctorDetailView(APIView):
    """
    Retrieve or update a doctor profile (admin only for updates).
    """
    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_object(self, pk):
        try:
            return Doctor.objects.select_related('user', 'department').get(pk=pk)
        except Doctor.DoesNotExist:
            return None

    def get(self, request, pk):
        doctor = self.get_object(pk)
        if not doctor:
            return Response({'detail': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(DoctorSerializer(doctor).data)

    def patch(self, request, pk):
        doctor = self.get_object(pk)
        if not doctor:
            return Response({'detail': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = doctor.user
        if 'first_name' in request.data:
            user.first_name = (request.data.get('first_name') or '').strip()
        if 'last_name' in request.data:
            user.last_name = (request.data.get('last_name') or '').strip()
        if 'phone' in request.data:
            user.phone = (request.data.get('phone') or '').strip()
        if 'is_active' in request.data:
            user.is_active = bool(request.data.get('is_active'))
        user.save()

        if 'specialization' in request.data:
            doctor.specialization = (request.data.get('specialization') or '').strip()
        if 'license_number' in request.data:
            doctor.license_number = (request.data.get('license_number') or '').strip()
        if 'department' in request.data:
            dept_id = request.data.get('department')
            if dept_id:
                try:
                    doctor.department = Department.objects.get(pk=dept_id)
                except Department.DoesNotExist:
                    return Response({'department': ['Selected department does not exist.']}, status=status.HTTP_400_BAD_REQUEST)
            else:
                doctor.department = None

        doctor.save()
        return Response(DoctorSerializer(doctor).data)


# ── Nurse Views ───────────────────────────────────────────────────────────────

class NurseListCreateView(APIView):
    """
    List nurses (authenticated users) or provision a new nurse staff (admin only).
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        nurses = Nurse.objects.select_related('user', 'department').all().order_by('-id')
        search = request.query_params.get('search')
        if search:
            nurses = nurses.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(license_number__icontains=search) |
                Q(department__name__icontains=search)
            )
        dept_id = request.query_params.get('department')
        if dept_id and dept_id.isdigit():
            nurses = nurses.filter(department_id=int(dept_id))

        serializer = NurseSerializer(nurses, many=True)
        return Response(serializer.data)

    def post(self, request):
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or 'Nurse@123'
        phone = (request.data.get('phone') or '').strip()
        license_number = (request.data.get('license_number') or '').strip()
        dept_id = request.data.get('department')

        errors = {}
        if not first_name:
            errors['first_name'] = ['First name is required.']
        if not last_name:
            errors['last_name'] = ['Last name is required.']
        if not email:
            errors['email'] = ['Email address is required.']
        elif '@' not in email:
            errors['email'] = ['Please enter a valid email address.']

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Department resolution
        department_obj = None
        if dept_id:
            try:
                department_obj = Department.objects.get(pk=dept_id)
            except Department.DoesNotExist:
                return Response({'department': ['Selected department does not exist.']}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing user
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            if hasattr(existing_user, 'nurse_profile'):
                return Response({'email': ['A nurse profile is already registered with this email address.']}, status=status.HTTP_400_BAD_REQUEST)
            if existing_user.role != 'nurse':
                return Response({'email': [f"A user with this email already exists with role '{existing_user.role}'."]}, status=status.HTTP_400_BAD_REQUEST)

        if not license_number:
            import random
            license_number = f"KNC-{random.randint(10000, 99999)}-N"

        with transaction.atomic():
            if not existing_user:
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    role='nurse',
                    is_staff=False
                )
            else:
                user = existing_user
                user.first_name = first_name
                user.last_name = last_name
                if phone:
                    user.phone = phone
                user.save()

            nurse = Nurse.objects.create(
                user=user,
                department=department_obj,
                license_number=license_number
            )

        return Response(NurseSerializer(nurse).data, status=status.HTTP_201_CREATED)


class NurseDetailView(APIView):
    """
    Retrieve or update a nurse profile (admin only for updates).
    """
    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_object(self, pk):
        try:
            return Nurse.objects.select_related('user', 'department').get(pk=pk)
        except Nurse.DoesNotExist:
            return None

    def get(self, request, pk):
        nurse = self.get_object(pk)
        if not nurse:
            return Response({'detail': 'Nurse profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(NurseSerializer(nurse).data)

    def patch(self, request, pk):
        nurse = self.get_object(pk)
        if not nurse:
            return Response({'detail': 'Nurse profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = nurse.user
        if 'first_name' in request.data:
            user.first_name = (request.data.get('first_name') or '').strip()
        if 'last_name' in request.data:
            user.last_name = (request.data.get('last_name') or '').strip()
        if 'phone' in request.data:
            user.phone = (request.data.get('phone') or '').strip()
        if 'is_active' in request.data:
            user.is_active = bool(request.data.get('is_active'))
        user.save()

        if 'license_number' in request.data:
            nurse.license_number = (request.data.get('license_number') or '').strip()
        if 'department' in request.data:
            dept_id = request.data.get('department')
            if dept_id:
                try:
                    nurse.department = Department.objects.get(pk=dept_id)
                except Department.DoesNotExist:
                    return Response({'department': ['Selected department does not exist.']}, status=status.HTTP_400_BAD_REQUEST)
            else:
                nurse.department = None

        nurse.save()
        return Response(NurseSerializer(nurse).data)


class CaregiverListCreateView(APIView):
    """
    List caregivers (authenticated users; filtered by role) or provision a new caregiver (admin only).
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        user = request.user
        caregivers = Caregiver.objects.select_related('user', 'patient', 'patient__user').all().order_by('-id')

        # Role-based restriction
        if user.role == 'patient' and hasattr(user, 'patient_profile'):
            caregivers = caregivers.filter(patient=user.patient_profile)
        elif user.role == 'caregiver' and hasattr(user, 'caregiver_profile'):
            caregivers = caregivers.filter(id=user.caregiver_profile.id)

        search = request.query_params.get('search')
        if search:
            caregivers = caregivers.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(relationship__icontains=search) |
                Q(patient__patient_id__icontains=search) |
                Q(patient__user__first_name__icontains=search) |
                Q(patient__user__last_name__icontains=search)
            )

        patient_param = request.query_params.get('patient') or request.query_params.get('patient_id')
        if patient_param:
            if str(patient_param).isdigit():
                caregivers = caregivers.filter(patient_id=int(patient_param))
            else:
                caregivers = caregivers.filter(patient__patient_id=patient_param)

        serializer = CaregiverSerializer(caregivers, many=True)
        return Response(serializer.data)

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        phone = (request.data.get('phone') or '').strip()
        password = request.data.get('password')
        relationship = (request.data.get('relationship') or 'Primary Caregiver').strip()
        patient_id = request.data.get('patient') or request.data.get('patient_id')

        if not email:
            return Response({'email': ['Email address is required.']}, status=status.HTTP_400_BAD_REQUEST)
        if not first_name:
            return Response({'first_name': ['First name is required.']}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve patient if provided
        patient_obj = None
        if patient_id:
            try:
                if str(patient_id).isdigit():
                    patient_obj = Patient.objects.get(pk=int(patient_id))
                else:
                    patient_obj = Patient.objects.get(patient_id=patient_id)
            except Patient.DoesNotExist:
                return Response({'patient': ['Selected patient does not exist.']}, status=status.HTTP_400_BAD_REQUEST)

        existing_user = User.objects.filter(email=email).first()
        if existing_user and hasattr(existing_user, 'caregiver_profile'):
            return Response({'email': ['A caregiver profile already exists for this email address.']}, status=status.HTTP_400_BAD_REQUEST)

        if not existing_user and not password:
            return Response({'password': ['Password is required for provisioning a new caregiver user account.']}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if not existing_user:
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    role='caregiver',
                    is_staff=False
                )
            else:
                user = existing_user
                user.first_name = first_name
                user.last_name = last_name
                if phone:
                    user.phone = phone
                if user.role != 'caregiver':
                    user.role = 'caregiver'
                user.save()

            caregiver = Caregiver.objects.create(
                user=user,
                patient=patient_obj,
                relationship=relationship
            )

        return Response(CaregiverSerializer(caregiver).data, status=status.HTTP_201_CREATED)


class CaregiverDetailView(APIView):
    """
    Retrieve or update a caregiver profile (admin only for edits).
    """
    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_object(self, pk):
        try:
            return Caregiver.objects.select_related('user', 'patient', 'patient__user').get(pk=pk)
        except Caregiver.DoesNotExist:
            return None

    def get(self, request, pk):
        caregiver = self.get_object(pk)
        if not caregiver:
            return Response({'detail': 'Caregiver profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == 'caregiver' and hasattr(user, 'caregiver_profile') and user.caregiver_profile.id != caregiver.id:
            return Response({'detail': 'You do not have permission to view this caregiver.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'patient' and hasattr(user, 'patient_profile'):
            if not caregiver.patient or caregiver.patient.id != user.patient_profile.id:
                return Response({'detail': 'You do not have permission to view this caregiver.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(CaregiverSerializer(caregiver).data)

    def patch(self, request, pk):
        caregiver = self.get_object(pk)
        if not caregiver:
            return Response({'detail': 'Caregiver profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = caregiver.user
        if 'first_name' in request.data:
            user.first_name = (request.data.get('first_name') or '').strip()
        if 'last_name' in request.data:
            user.last_name = (request.data.get('last_name') or '').strip()
        if 'phone' in request.data:
            user.phone = (request.data.get('phone') or '').strip()
        if 'is_active' in request.data:
            user.is_active = bool(request.data.get('is_active'))
        user.save()

        if 'relationship' in request.data:
            caregiver.relationship = (request.data.get('relationship') or '').strip()
        if 'is_primary' in request.data:
            caregiver.is_primary = bool(request.data.get('is_primary'))
        if 'patient' in request.data or 'patient_id' in request.data:
            patient_id = request.data.get('patient') if 'patient' in request.data else request.data.get('patient_id')
            if patient_id:
                try:
                    if str(patient_id).isdigit():
                        caregiver.patient = Patient.objects.get(pk=int(patient_id))
                    else:
                        caregiver.patient = Patient.objects.get(patient_id=patient_id)
                except Patient.DoesNotExist:
                    return Response({'patient': ['Selected patient does not exist.']}, status=status.HTTP_400_BAD_REQUEST)
            else:
                caregiver.patient = None

        caregiver.save()
        return Response(CaregiverSerializer(caregiver).data)

    def delete(self, request, pk):
        caregiver = self.get_object(pk)
        if not caregiver:
            return Response({'detail': 'Caregiver profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = caregiver.user
        user.is_active = False
        user.save()
        caregiver.delete()
        return Response({'message': 'Caregiver profile successfully removed.'}, status=status.HTTP_200_OK)


# Backward compatibility aliases
DoctorListView = DoctorListCreateView
NurseListView = NurseListCreateView
CaregiverListView = CaregiverListCreateView
DepartmentListView = DepartmentListCreateView


# ── Patient Account Linking ───────────────────────────────────────────────────

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

        # 1. Determine whether a patient profile ALREADY exists for target user
        existing_profile = getattr(target_user, 'patient_profile', None)
        if existing_profile:
            return Response(
                {
                    'error': f"User '{target_user.email}' is already linked to patient record '{existing_profile.patient_id}'."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Handle 'create_new' mode
        if create_new:
            generated_uhid = f"PAT-{target_user.id:04d}"
            counter = 1
            while Patient.objects.filter(patient_id=generated_uhid).exists():
                generated_uhid = f"PAT-{target_user.id:04d}-{counter}"
                counter += 1

            surgery_type = request.data.get('surgery_type') or 'General Post-Operative Recovery'

            with transaction.atomic():
                new_patient = Patient.objects.create(
                    user=target_user,
                    patient_id=generated_uhid,
                    gender='O',
                    blood_group='O+',
                    surgery_type=surgery_type,
                    surgery_date=timezone.now().date(),
                    discharge_date=timezone.now().date(),
                )
                if target_user.role != 'patient':
                    target_user.role = 'patient'
                    target_user.save()

            return Response(
                {
                    'message': f"New patient record '{new_patient.patient_id}' successfully created and linked to '{target_user.email}'.",
                    'patient': PatientSerializer(new_patient).data
                },
                status=status.HTTP_201_CREATED
            )

        # 3. Handle 'existing' mode: Link user to an existing patient record
        if not patient_id:
            return Response({'error': 'patient_id is required when linking to an existing record.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if str(patient_id).isdigit():
                patient_record = Patient.objects.get(id=patient_id)
            else:
                patient_record = Patient.objects.get(patient_id=patient_id)
        except Patient.DoesNotExist:
            return Response({'error': 'Target patient record not found.'}, status=status.HTTP_404_NOT_FOUND)

        if patient_record.user_id == target_user.id:
            return Response({'message': 'Patient record is already linked to this user.'}, status=status.HTTP_200_OK)

        with transaction.atomic():
            old_user = patient_record.user
            patient_record.user = target_user
            patient_record.save()

            if target_user.role != 'patient':
                target_user.role = 'patient'
                target_user.save()

        return Response(
            {
                'message': f"Successfully linked user '{target_user.email}' to patient record '{patient_record.patient_id}'.",
                'patient': PatientSerializer(patient_record).data
            },
            status=status.HTTP_200_OK
        )
