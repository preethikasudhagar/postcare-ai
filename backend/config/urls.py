from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from apps.accounts import views as account_views

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
        'documentation': 'Clinical Decision-Support Platform'
    })

from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.urls import re_path

urlpatterns = [
    path('', api_root, name='api_index'),
    path('health/', api_root, name='health'),
    path('api/', api_root, name='api_root'),
    path('api/health/', api_root, name='api_health'),
    path('admin/', admin.site.urls),
    path('api/admin/users/', include([
        path('', account_views.AdminUserListCreateView.as_view(), name='admin_user_list_create'),
        path('<int:pk>/', account_views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    ])),
    path('api/admin/doctors/', include([
        path('', __import__('apps.patients.views', fromlist=['DoctorListCreateView']).DoctorListCreateView.as_view(), name='admin_doctor_list_create'),
        path('<int:pk>/', __import__('apps.patients.views', fromlist=['DoctorDetailView']).DoctorDetailView.as_view(), name='admin_doctor_detail'),
    ])),
    path('api/admin/nurses/', include([
        path('', __import__('apps.patients.views', fromlist=['NurseListCreateView']).NurseListCreateView.as_view(), name='admin_nurse_list_create'),
        path('<int:pk>/', __import__('apps.patients.views', fromlist=['NurseDetailView']).NurseDetailView.as_view(), name='admin_nurse_detail'),
    ])),
    path('api/admin/departments/', include([
        path('', __import__('apps.patients.views', fromlist=['DepartmentListCreateView']).DepartmentListCreateView.as_view(), name='admin_department_list_create'),
        path('<int:pk>/', __import__('apps.patients.views', fromlist=['DepartmentDetailView']).DepartmentDetailView.as_view(), name='admin_department_detail'),
    ])),
    path('api/admin/patients/link/', __import__('apps.patients.views', fromlist=['PatientLinkAccountView']).PatientLinkAccountView.as_view(), name='admin_patient_link'),
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

# Media files serving (works in dev and as a lightweight fallback in production)
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

