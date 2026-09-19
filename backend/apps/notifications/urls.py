from django.urls import path
from .views import NotificationListView, NotificationMarkReadView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications_list'),
    path('read-all/', NotificationMarkReadView.as_view(), name='notifications_mark_all_read'),
    path('<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification_mark_read'),
]
