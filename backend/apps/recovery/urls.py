from django.urls import path
from .views import RecoveryCheckInCreateView, PatientRecoveryHistoryView

urlpatterns = [
    path('check-in/', RecoveryCheckInCreateView.as_view(), name='recovery_checkin'),
    path('patient/<int:patient_id>/', PatientRecoveryHistoryView.as_view(), name='patient_recovery_history'),
    path('history/', PatientRecoveryHistoryView.as_view(), name='own_recovery_history'),
]
