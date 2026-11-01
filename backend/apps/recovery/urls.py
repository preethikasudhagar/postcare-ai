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
    WoundAssessmentClearHistoryView,
    LatestWoundAssessmentView,
    DoctorWoundQueueView,
    DoctorWoundActionView,
    AdminWoundStatsView
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
    path('wounds/patient/me/latest/', LatestWoundAssessmentView.as_view(), {'patient_id': 'me'}, name='latest_wound_assessment_me'),
    path('wounds/patient/<int:patient_id>/latest/', LatestWoundAssessmentView.as_view(), name='latest_wound_assessment_id'),
    path('wounds/patient/<str:patient_id>/latest/', LatestWoundAssessmentView.as_view(), name='latest_wound_assessment_str'),
    path('wounds/patient/<int:patient_id>/', WoundAssessmentListView.as_view(), name='wound_assessment_list'),
    path('wounds/patient/<str:patient_id>/', WoundAssessmentListView.as_view(), name='wound_assessment_list_str'),
    path('wounds/doctor/review-queue/', DoctorWoundQueueView.as_view(), name='doctor_wound_review_queue'),
    path('wounds/doctor/queue/', DoctorWoundQueueView.as_view(), name='doctor_wound_queue'),
    path('wounds/<int:pk>/doctor-action/', DoctorWoundActionView.as_view(), name='doctor_wound_action'),
    path('wounds/admin/stats/', AdminWoundStatsView.as_view(), name='admin_wound_stats'),
    path('wounds/<int:pk>/review/', WoundAssessmentReviewView.as_view(), name='wound_assessment_review'),
    path('wounds/<int:pk>/', WoundAssessmentDetailView.as_view(), name='wound_assessment_detail'),
]

