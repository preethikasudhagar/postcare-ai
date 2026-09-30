import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.abspath('backend'))

django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from apps.discharge.models import DischargePlan
from apps.followups.models import FollowUp
from apps.messaging.models import Message
from apps.ml_engine.predictor import predict_risk

User = get_user_model()

def run_tests():
    print("--- 1. Testing ML Engine Predictor ---")
    result = predict_risk(
        pain_level=4,
        temperature=98.6,
        wound_condition='normal',
        symptoms=['Mild swelling'],
        medication_adherence='all',
        surgery_type='Cardiac',
        recovery_days=5
    )
    print("ML Prediction Result:", result)
    assert 'risk_level' in result
    assert isinstance(result['confidence'], (int, float))
    print("ML Engine: PASS\n")

    print("--- 2. Testing API Client & Endpoints ---")
    client = Client()
    
    # Root endpoint
    res = client.get('/api/')
    print("GET /api/ ->", res.status_code)
    assert res.status_code == 200

    # Test login
    res = client.post('/api/auth/login/', data=json.dumps({
        'email': 'preethika.karur@gmail.com',
        'password': 'Admin@123'
    }), content_type='application/json')
    print("POST /api/auth/login/ ->", res.status_code)
    assert res.status_code == 200
    token = res.json()['access']
    headers = {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    # Test /api/auth/me/
    res = client.get('/api/auth/me/', **headers)
    print("GET /api/auth/me/ ->", res.status_code, res.json().get('email'))
    assert res.status_code == 200

    # Test Admin Users CRUD
    res = client.get('/api/admin/users/', **headers)
    user_data = res.json()
    user_count = len(user_data['results']) if isinstance(user_data, dict) and 'results' in user_data else len(user_data)
    print("GET /api/admin/users/ ->", res.status_code, f"Found {user_count} users")
    assert res.status_code == 200

    # Test Notifications
    res = client.get('/api/notifications/', **headers)
    print("GET /api/notifications/ ->", res.status_code)
    assert res.status_code == 200

    # Test Follow-ups
    res = client.get('/api/follow-ups/', **headers)
    print("GET /api/follow-ups/ ->", res.status_code)
    assert res.status_code == 200

    # Test Discharge Plans
    res = client.get('/api/discharge-plans/', **headers)
    print("GET /api/discharge-plans/ ->", res.status_code)
    assert res.status_code == 200

    # Test Messages
    res = client.get('/api/messages/', **headers)
    print("GET /api/messages/ ->", res.status_code)
    assert res.status_code == 200

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()
