from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
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
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

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
