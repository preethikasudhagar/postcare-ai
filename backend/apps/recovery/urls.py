from django.urls import path
from .views import (
    RecoveryCheckInCreateView, 
    PatientRecoveryHistoryView,
    RiskPredictionListView,
    RiskPredictionReviewView,
    WoundAssessmentCreateView,
    WoundAssessmentListView,
    WoundAssessmentReviewView,
    WoundAssessmentDetailView,
    WoundAssessmentClearHistoryView
)

urlpatterns = [
    path('check-in/', RecoveryCheckInCreateView.as_view(), name='recovery_checkin'),
    path('patient/<int:patient_id>/', PatientRecoveryHistoryView.as_view(), name='patient_recovery_history'),
    path('patient/<str:patient_id>/', PatientRecoveryHistoryView.as_view(), name='patient_recovery_history_str'),
    path('history/', PatientRecoveryHistoryView.as_view(), name='own_recovery_history'),
    path('risk-predictions/', RiskPredictionListView.as_view(), name='risk_predictions_list'),
    path('risk-predictions/<int:pk>/review/', RiskPredictionReviewView.as_view(), name='risk_prediction_review'),
    
    path('wounds/upload/', WoundAssessmentCreateView.as_view(), name='wound_assessment_create'),
    path('wounds/clear/', WoundAssessmentClearHistoryView.as_view(), name='wound_assessment_clear_history'),
    path('wounds/patient/<int:patient_id>/clear/', WoundAssessmentClearHistoryView.as_view(), name='wound_assessment_clear_history_patient_id'),
    path('wounds/patient/<str:patient_id>/clear/', WoundAssessmentClearHistoryView.as_view(), name='wound_assessment_clear_history_patient_str'),
    path('wounds/patient/<int:patient_id>/', WoundAssessmentListView.as_view(), name='wound_assessment_list'),
    path('wounds/patient/<str:patient_id>/', WoundAssessmentListView.as_view(), name='wound_assessment_list_str'),
    path('wounds/<int:pk>/review/', WoundAssessmentReviewView.as_view(), name='wound_assessment_review'),
    path('wounds/<int:pk>/', WoundAssessmentDetailView.as_view(), name='wound_assessment_detail'),
]
