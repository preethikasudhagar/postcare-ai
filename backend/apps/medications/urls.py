from django.urls import path
from .views import MedicationListCreateView, MedicationDetailView, MedicationLogActionView

urlpatterns = [
    path('', MedicationListCreateView.as_view(), name='medications_list'),
    path('<int:pk>/', MedicationDetailView.as_view(), name='medication_detail'),
    path('<int:pk>/log/', MedicationLogActionView.as_view(), name='medication_log_action'),
]
