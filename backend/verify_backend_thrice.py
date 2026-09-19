import os
import sys
import json
import urllib.request
import urllib.error

def run_pass_1_internal():
    print("=" * 60)
    print("PASS 1: Django Internal Engine, DB & Serializers Verification")
    print("=" * 60)
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

    from django.test import Client
    from apps.accounts.models import User

    client = Client()

    # 1. Test Login with All Roles
    credentials = [
        ('patient@postcare.demo', 'Patient@123', 'patient'),
        ('doctor@postcare.demo', 'Doctor@123', 'doctor'),
        ('nurse1@postcare.demo', 'Nurse@123', 'nurse'),
        ('caregiver@postcare.demo', 'Caregiver@123', 'caregiver'),
        ('admin@postcare.demo', 'Admin@123', 'admin'),
    ]

    tokens = {}
    for email, pwd, role in credentials:
        resp = client.post('/api/auth/login/', data=json.dumps({'email': email, 'password': pwd}), content_type='application/json')
        assert resp.status_code == 200, f"Login failed for {email}: {resp.status_code} {resp.content}"
        data = resp.json()
        assert 'access' in data and 'user' in data, f"Missing token/user in login for {email}"
        assert data['user']['role'] == role, f"Role mismatch for {email}: expected {role}, got {data['user']['role']}"
        tokens[role] = data['access']
        print(f"  [OK] Login verified for role: {role:10s} ({email})")

    # 2. Test Google Auth Endpoint
    resp = client.post('/api/auth/google/', data=json.dumps({'email': 'google.test@postcare.demo', 'name': 'Google Test Patient'}), content_type='application/json')
    assert resp.status_code == 200, f"Google auth failed: {resp.status_code} {resp.content}"
    g_data = resp.json()
    assert 'access' in g_data and g_data['user']['email'] == 'google.test@postcare.demo'
    print("  [OK] Google Auth endpoint verified (User creation + JWT issuance)")

    # 3. Test Patient Endpoints with Patient Token
    p_header = {'HTTP_AUTHORIZATION': f"Bearer {tokens['patient']}"}
    
    resp = client.get('/api/auth/me/', **p_header)
    assert resp.status_code == 200, f"Me endpoint failed: {resp.status_code}"
    print("  [OK] /api/auth/me/ verified")

    resp = client.get('/api/medications/', **p_header)
    assert resp.status_code == 200, f"Medications failed: {resp.status_code}"
    print(f"  [OK] /api/medications/ verified (Count: {len(resp.json())})")

    resp = client.get('/api/recovery/history/', **p_header)
    assert resp.status_code == 200, f"Recovery history failed: {resp.status_code}"
    print(f"  [OK] /api/recovery/history/ verified (Count: {len(resp.json())})")

    resp = client.get('/api/follow-ups/', **p_header)
    assert resp.status_code == 200, f"Follow-ups failed: {resp.status_code}"
    print(f"  [OK] /api/follow-ups/ verified (Count: {len(resp.json())})")

    # 4. Test Check-in + ML Prediction
    checkin_payload = {
        'pain_level': 3,
        'temperature': 36.8,
        'wound_condition': 'normal',
        'symptoms': ['Mild swelling'],
        'medication_adherence': 'all',
        'additional_notes': 'Automated verification test note'
    }
    resp = client.post('/api/recovery/check-in/', data=json.dumps(checkin_payload), content_type='application/json', **p_header)
    assert resp.status_code == 201, f"Recovery check-in failed: {resp.status_code} {resp.content}"
    checkin_data = resp.json()
    assert 'checkin' in checkin_data and 'prediction' in checkin_data, "Check-in response missing checkin/prediction"
    print(f"  [OK] /api/recovery/check-in/ + ML Pipeline verified (Risk: {checkin_data['prediction']['risk_level']}, Confidence: {checkin_data['prediction']['confidence']})")

    # 5. Test Doctor Endpoints
    d_header = {'HTTP_AUTHORIZATION': f"Bearer {tokens['doctor']}"}
    resp = client.get('/api/patients/', **d_header)
    assert resp.status_code == 200, f"Patients list failed: {resp.status_code}"
    print(f"  [OK] /api/patients/ verified for doctor (Count: {len(resp.json())})")

    resp = client.get('/api/reports/recovery/', **d_header)
    assert resp.status_code == 200, f"Reports failed: {resp.status_code}"
    print("  [OK] /api/reports/recovery/ verified")

    resp = client.get('/api/notifications/', **d_header)
    assert resp.status_code == 200, f"Notifications failed: {resp.status_code}"
    print(f"  [OK] /api/notifications/ verified (Count: {len(resp.json())})")

    print("PASS 1 RESULT: ALL TESTS PASSED SUCCESFULLY!\n")
    return tokens

def make_http_request(url, method='GET', headers=None, data=None):
    req_headers = {'Content-Type': 'application/json'}
    if headers:
        req_headers.update(headers)
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

def run_pass_2_direct_http():
    print("=" * 60)
    print("PASS 2: Live HTTP Server Verification (http://127.0.0.1:8000)")
    print("=" * 60)
    base_url = 'http://127.0.0.1:8000'

    # 1. Login over HTTP
    status_code, data = make_http_request(
        f"{base_url}/api/auth/login/",
        method='POST',
        data={'email': 'patient@postcare.demo', 'password': 'Patient@123'}
    )
    assert status_code == 200, f"HTTP Login failed with status {status_code}"
    token = data['access']
    print(f"  [OK] HTTP POST /api/auth/login/ -> 200 OK (User: {data['user']['email']})")

    # 2. Google Auth over HTTP
    status_code, g_data = make_http_request(
        f"{base_url}/api/auth/google/",
        method='POST',
        data={'email': 'google.direct@postcare.demo', 'name': 'Direct Google User'}
    )
    assert status_code == 200, f"HTTP Google auth failed with status {status_code}"
    print(f"  [OK] HTTP POST /api/auth/google/ -> 200 OK (User: {g_data['user']['email']})")

    # 3. Authenticated endpoint over HTTP
    status_code, me_data = make_http_request(
        f"{base_url}/api/auth/me/",
        method='GET',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert status_code == 200, f"HTTP GET /api/auth/me/ failed with status {status_code}"
    print(f"  [OK] HTTP GET /api/auth/me/ -> 200 OK (ID: {me_data['id']})")

    # 4. Medications over HTTP
    status_code, meds = make_http_request(
        f"{base_url}/api/medications/",
        method='GET',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert status_code == 200, f"HTTP GET /api/medications/ failed with status {status_code}"
    print(f"  [OK] HTTP GET /api/medications/ -> 200 OK (Found {len(meds)} medications)")

    # 5. ML Predict Risk over HTTP
    status_code, ml_res = make_http_request(
        f"{base_url}/api/ml/predict-risk/",
        method='POST',
        headers={'Authorization': f'Bearer {token}'},
        data={'pain_level': 2, 'temperature': 36.6, 'wound_condition': 'normal', 'symptoms': []}
    )
    assert status_code == 200, f"HTTP POST /api/ml/predict-risk/ failed with status {status_code}"
    print(f"  [OK] HTTP POST /api/ml/predict-risk/ -> 200 OK (Risk: {ml_res['risk_level']})")

    print("PASS 2 RESULT: ALL TESTS PASSED SUCCESFULLY!\n")

def run_pass_3_frontend_proxy():
    print("=" * 60)
    print("PASS 3: Frontend Proxy Verification (http://127.0.0.1:5173/api/...)")
    print("=" * 60)
    base_url = 'http://127.0.0.1:5173'

    # 1. Login through Vite proxy
    status_code, data = make_http_request(
        f"{base_url}/api/auth/login/",
        method='POST',
        data={'email': 'doctor@postcare.demo', 'password': 'Doctor@123'}
    )
    assert status_code == 200, f"Proxy Login failed with status {status_code}"
    doc_token = data['access']
    print(f"  [OK] Proxy POST /api/auth/login/ -> 200 OK (Doctor: {data['user']['email']})")

    # 2. Google Login through Vite proxy
    status_code, g_data = make_http_request(
        f"{base_url}/api/auth/google/",
        method='POST',
        data={'email': 'google.proxy@postcare.demo', 'name': 'Proxy Google User'}
    )
    assert status_code == 200, f"Proxy Google auth failed with status {status_code}"
    print(f"  [OK] Proxy POST /api/auth/google/ -> 200 OK (User: {g_data['user']['email']})")

    # 3. Patient list through Vite proxy
    status_code, patients = make_http_request(
        f"{base_url}/api/patients/",
        method='GET',
        headers={'Authorization': f'Bearer {doc_token}'}
    )
    assert status_code == 200, f"Proxy Patients GET failed with status {status_code}"
    print(f"  [OK] Proxy GET /api/patients/ -> 200 OK (Found {len(patients)} patients)")

    # 4. ML Evaluation through Vite proxy
    status_code, eval_data = make_http_request(
        f"{base_url}/api/ml/evaluation/",
        method='GET',
        headers={'Authorization': f'Bearer {doc_token}'}
    )
    assert status_code == 200, f"Proxy ML evaluation failed with status {status_code}"
    print(f"  [OK] Proxy GET /api/ml/evaluation/ -> 200 OK (Accuracy: {eval_data['accuracy']})")

    print("PASS 3 RESULT: ALL TESTS PASSED SUCCESFULLY!\n")

if __name__ == '__main__':
    run_pass_1_internal()
    run_pass_2_direct_http()
    run_pass_3_frontend_proxy()
    print("=" * 60)
    print("ALL 3 PASSES COMPLETED AND 100% VERIFIED!")
    print("=" * 60)
