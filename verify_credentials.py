import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.abspath('backend'))
django.setup()

from apps.accounts.models import User
from django.contrib.auth import authenticate
from rest_framework.test import APIClient

ACCOUNTS = [
    {'email': 'doctor@postcare.demo', 'password': 'Doctor@123', 'role': 'doctor', 'first_name': 'Rajesh', 'last_name': 'Varma', 'username': 'doctor_rajesh'},
    {'email': 'patient@postcare.demo', 'password': 'Patient@123', 'role': 'patient', 'first_name': 'Rahul', 'last_name': 'Kumar', 'username': 'patient_rahul'},
    {'email': 'nurse1@postcare.demo', 'password': 'Nurse@123', 'role': 'nurse', 'first_name': 'Priya', 'last_name': 'Nair', 'username': 'nurse_priya'},
    {'email': 'caregiver@postcare.demo', 'password': 'Caregiver@123', 'role': 'caregiver', 'first_name': 'Sunita', 'last_name': 'Kumar', 'username': 'caregiver_sunita'},
    {'email': 'admin@postcare.demo', 'password': 'Admin@123', 'role': 'admin', 'first_name': 'System', 'last_name': 'Admin', 'username': 'admin_demo'},
    {'email': 'preethika.karur@gmail.com', 'password': 'Admin@123', 'role': 'admin', 'first_name': 'Preethika', 'last_name': 'Admin', 'username': 'preethika_admin'},
]

print("=== Resetting & Ensuring All Accounts ===")
for acc in ACCOUNTS:
    user = User.objects.filter(email__iexact=acc['email']).first()
    if not user:
        user = User(
            email=acc['email'],
            username=acc['username'],
            role=acc['role'],
            first_name=acc['first_name'],
            last_name=acc['last_name'],
            is_active=True,
            is_staff=(acc['role'] == 'admin'),
            is_superuser=(acc['role'] == 'admin')
        )
    else:
        user.username = acc['username']
        user.role = acc['role']
        user.first_name = acc['first_name']
        user.last_name = acc['last_name']
        user.is_active = True
        if acc['role'] == 'admin':
            user.is_staff = True
            user.is_superuser = True

    user.set_password(acc['password'])
    user.save()
    print(f"Set password for {user.email} -> '{acc['password']}' (Username: {user.username}, Role: {user.role})")

print("\n=== Verifying via APIClient POST /api/auth/login/ ===")
client = APIClient()
all_passed = True
for acc in ACCOUNTS:
    res = client.post('/api/auth/login/', {'email': acc['email'], 'password': acc['password']}, format='json')
    if res.status_code == 200:
        data = res.json()
        print(f"SUCCESS [200]: {acc['email']} -> Role: {data['user']['role']}, Name: {data['user']['first_name']} {data['user']['last_name']}")
    else:
        print(f"FAILED [{res.status_code}]: {acc['email']} -> {res.json()}")
        all_passed = False

if all_passed:
    print("\nALL CREDENTIALS ARE 100% VERIFIED AND WORKING!")
else:
    print("\nSOME LOGINS FAILED!")
