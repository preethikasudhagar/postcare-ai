from django.urls import path
from .views import (
    FollowUpListCreateView,
    FollowUpDetailView,
    RequestRescheduleView,
    ReviewRescheduleView,
)

urlpatterns = [
    path('', FollowUpListCreateView.as_view(), name='followups_list'),
    path('<int:pk>/', FollowUpDetailView.as_view(), name='followup_detail'),
    path('<int:pk>/request-reschedule/', RequestRescheduleView.as_view(), name='followup_request_reschedule'),
    path('<int:pk>/reschedule/', RequestRescheduleView.as_view(), name='followup_reschedule_alias'),
    path('<int:pk>/review-reschedule/', ReviewRescheduleView.as_view(), name='followup_review_reschedule'),
]
