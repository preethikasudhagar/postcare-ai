from django.urls import path
from .views import FollowUpListCreateView, FollowUpDetailView

urlpatterns = [
    path('', FollowUpListCreateView.as_view(), name='followups_list'),
    path('<int:pk>/', FollowUpDetailView.as_view(), name='followup_detail'),
]
