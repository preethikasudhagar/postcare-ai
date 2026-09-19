from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/patients/', include('apps.patients.urls')),
    path('api/discharge-plans/', include('apps.discharge.urls')),
    path('api/medications/', include('apps.medications.urls')),
    path('api/recovery/', include('apps.recovery.urls')),
    path('api/follow-ups/', include('apps.followups.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/messages/', include('apps.messaging.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/ml/', include('apps.ml_engine.urls')),
]
