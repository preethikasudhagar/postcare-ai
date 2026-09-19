from django.urls import path
from .views import RecoveryReportView

urlpatterns = [
    path('recovery/', RecoveryReportView.as_view(), name='report_recovery'),
]
