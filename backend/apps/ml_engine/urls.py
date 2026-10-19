from django.urls import path
from .views import MLPredictRiskView, MLEvaluationStatsView
from apps.recovery.views import RiskPredictionListView

urlpatterns = [
    path('predict-risk/', MLPredictRiskView.as_view(), name='ml_predict_risk'),
    path('predictions/', RiskPredictionListView.as_view(), name='ml_predictions'),
    path('evaluation/', MLEvaluationStatsView.as_view(), name='ml_evaluation'),
]
