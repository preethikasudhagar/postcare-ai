from django.urls import path
from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListCreateView,
    MarkMessagesReadView,
    PatientCareTeamContactsView,
)

urlpatterns = [
    path('', ConversationListCreateView.as_view(), name='messages_root'),
    path('conversations/', ConversationListCreateView.as_view(), name='conversations_list'),
    path('conversations/<int:conv_id>/', ConversationDetailView.as_view(), name='conversation_detail'),
    path('conversations/<int:conv_id>/messages/', MessageListCreateView.as_view(), name='messages_list_create'),
    path('conversations/<int:conv_id>/read/', MarkMessagesReadView.as_view(), name='messages_mark_read'),
    path('care-team/', PatientCareTeamContactsView.as_view(), name='messages_care_team'),
    path('contacts/', PatientCareTeamContactsView.as_view(), name='messages_contacts'),
]

