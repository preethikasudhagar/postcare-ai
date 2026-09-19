from django.urls import path
from .views import MLPredictRiskView, MLEvaluationStatsView

urlpatterns = [
    path('predict-risk/', MLPredictRiskView.as_view(), name='ml_predict_risk'),
    path('evaluation/', MLEvaluationStatsView.as_view(), name='ml_evaluation'),
]
