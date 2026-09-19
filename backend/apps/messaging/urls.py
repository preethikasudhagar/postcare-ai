from django.urls import path
from .views import ConversationListView, MessageListCreateView

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversations_list'),
    path('conversations/<int:conv_id>/messages/', MessageListCreateView.as_view(), name='messages_list'),
]
