from django.urls import path
from .views import DischargePlanListCreateView, DischargePlanDetailView

urlpatterns = [
    path('', DischargePlanListCreateView.as_view(), name='discharge_plans_list'),
    path('<int:pk>/', DischargePlanDetailView.as_view(), name='discharge_plan_detail'),
]
