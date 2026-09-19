from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        'name': 'PostCare AI Clinical Decision Support API',
        'version': '1.0.0',
        'status': 'healthy',
        'endpoints': {
            'auth': '/api/auth/ [login, register, google, refresh, me]',
            'patients': '/api/patients/',
            'discharge_plans': '/api/discharge-plans/',
            'medications': '/api/medications/',
            'recovery': '/api/recovery/ [check-in, history]',
            'follow_ups': '/api/follow-ups/',
            'notifications': '/api/notifications/ [read-all, <id>/read]',
            'messages': '/api/messages/',
            'reports': '/api/reports/',
            'ml_engine': '/api/ml/ [predict-risk, evaluation]',
            'admin': '/admin/',
        },
        'documentation': 'Academic Healthcare Decision-Support Platform'
    })

urlpatterns = [
    path('', api_root, name='api_index'),
    path('api/', api_root, name='api_root'),
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
