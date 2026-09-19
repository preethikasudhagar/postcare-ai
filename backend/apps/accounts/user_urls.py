"""
user_urls.py — Admin user management endpoints served under /api/users/.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/activate/', views.ActivateUserView.as_view(), name='user-activate'),
]
