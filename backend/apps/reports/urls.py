from django.urls import path
from .views import (
    RecoveryReportView,
    RecoveryIndexReportView,
    RiskStratificationReportView,
    MedicationComplianceReportView,
    FollowUpCompletionReportView
)

urlpatterns = [
    path('', RecoveryReportView.as_view(), name='report_overview'),
    path('recovery/', RecoveryReportView.as_view(), name='report_recovery'),
    path('recovery-index/', RecoveryIndexReportView.as_view(), name='report_recovery_index'),
    path('risk-stratification/', RiskStratificationReportView.as_view(), name='report_risk_stratification'),
    path('medication-compliance/', MedicationComplianceReportView.as_view(), name='report_medication_compliance'),
    path('follow-up-completion/', FollowUpCompletionReportView.as_view(), name='report_followup_completion'),
]
