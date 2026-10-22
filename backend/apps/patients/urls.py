from django.urls import path
from .views import (
    PatientListView, 
    PatientDetailView, 
    DoctorListCreateView, 
    DoctorDetailView,
    NurseListCreateView, 
    NurseDetailView,
    CaregiverListCreateView,
    CaregiverDetailView,
    DepartmentListCreateView,
    DepartmentDetailView,
    PatientLinkAccountView
)

urlpatterns = [
    path('', PatientListView.as_view(), name='patient_list'),
    path('link-account/', PatientLinkAccountView.as_view(), name='patient_link_account'),
    path('doctors/', DoctorListCreateView.as_view(), name='doctor_list_create'),
    path('doctors/<int:pk>/', DoctorDetailView.as_view(), name='doctor_detail'),
    path('caregivers/', CaregiverListCreateView.as_view(), name='caregiver_list_create'),
    path('caregivers/<int:pk>/', CaregiverDetailView.as_view(), name='caregiver_detail'),
    path('nurses/', NurseListCreateView.as_view(), name='nurse_list_create'),
    path('nurses/<int:pk>/', NurseDetailView.as_view(), name='nurse_detail'),
    path('departments/', DepartmentListCreateView.as_view(), name='department_list_create'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department_detail'),
    path('<int:pk>/', PatientDetailView.as_view(), name='patient_detail'),
    # String UHID fallback — must be LAST to avoid shadowing named routes above
    path('<str:pk>/', PatientDetailView.as_view(), name='patient_detail_uhid'),
]
