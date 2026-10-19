from django.urls import path
from .views import (
    PatientListView, 
    PatientDetailView, 
    DoctorListView, 
    NurseListView, 
    DepartmentListView,
    PatientLinkAccountView
)

urlpatterns = [
    path('', PatientListView.as_view(), name='patient_list'),
    path('link-account/', PatientLinkAccountView.as_view(), name='patient_link_account'),
    path('<int:pk>/', PatientDetailView.as_view(), name='patient_detail'),
    path('doctors/', DoctorListView.as_view(), name='doctor_list'),
    path('nurses/', NurseListView.as_view(), name='nurse_list'),
    path('departments/', DepartmentListView.as_view(), name='department_list'),
    # String UHID fallback — must be LAST to avoid shadowing named routes above
    path('<str:pk>/', PatientDetailView.as_view(), name='patient_detail_uhid'),
]
