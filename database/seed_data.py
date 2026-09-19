"""
database/seed_data.py
---------------------
Standalone seed script for PostCare AI.

This is a pure-Python reference implementation that can be run independently
of Django.  It writes JSON fixtures that can be loaded with:

    python manage.py loaddata database/fixtures/*.json

For full Django integration, use the management command instead:

    python manage.py seed_data

Usage (standalone):
    python database/seed_data.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, date
from pathlib import Path

# ---------------------------------------------------------------------------
# Demo data definitions (shared between this script and the management command)
# ---------------------------------------------------------------------------

DEMO_USERS = [
    {
        'email':      'patient@postcare.demo',
        'password':   'Patient@123',
        'first_name': 'Demo',
        'last_name':  'Patient',
        'role':       'patient',
    },
    {
        'email':      'doctor@postcare.demo',
        'password':   'Doctor@123',
        'first_name': 'Demo',
        'last_name':  'Doctor',
        'role':       'doctor',
    },
    {
        'email':      'caregiver@postcare.demo',
        'password':   'Caregiver@123',
        'first_name': 'Demo',
        'last_name':  'Caregiver',
        'role':       'caregiver',
    },
    {
        'email':      'admin@postcare.demo',
        'password':   'Admin@123',
        'first_name': 'PostCare',
        'last_name':  'Admin',
        'role':       'admin',
        'is_staff':   True,
        'is_superuser': True,
    },
]

DEPARTMENTS = [
    'Orthopedics',
    'Cardiology',
    'General Surgery',
    'Neurology',
    'Oncology',
]

DOCTOR_USERS = [
    {
        'email':      f'doctor{i}@postcare.demo',
        'password':   'Doctor@123',
        'first_name': name.split()[0],
        'last_name':  name.split()[1],
        'role':       'doctor',
        'specialization': spec,
        'department_index': i - 1,
    }
    for i, (name, spec) in enumerate([
        ('Arjun Sharma',    'Orthopedic Surgeon'),
        ('Meera Nair',      'Cardiologist'),
        ('Vikram Gupta',    'General Surgeon'),
        ('Sunita Reddy',    'Neurologist'),
        ('Rakesh Iyer',     'Oncologist'),
    ], start=1)
]

NURSE_USERS = [
    {
        'email':      f'nurse{i}@postcare.demo',
        'password':   'Nurse@123',
        'first_name': name.split()[0],
        'last_name':  name.split()[1],
        'role':       'nurse',
    }
    for i, name in enumerate([
        'Ananya Pillai',
        'Rohan Malhotra',
        'Divya Krishnan',
        'Suresh Patel',
        'Kavya Menon',
    ], start=1)
]

PATIENT_DATA = [
    # (first_name, last_name, diagnosis, surgery_type, days_since_surgery)
    ('Demo',    'Patient',  'Knee Replacement',           'Orthopedic', 13),
    ('Rahul',   'Kumar',    'Appendectomy',               'General Surgery', 8),
    ('Priya',   'Sharma',   'Cardiac Bypass',             'Cardiology', 20),
    ('Amit',    'Verma',    'Spinal Fusion',              'Neurology', 15),
    ('Sneha',   'Patel',    'Cholecystectomy',            'General Surgery', 5),
    ('Kiran',   'Reddy',    'Hip Replacement',            'Orthopedic', 30),
    ('Pooja',   'Singh',    'Breast Cancer Surgery',      'Oncology', 12),
    ('Aryan',   'Mehta',    'ACL Reconstruction',         'Orthopedic', 7),
    ('Nisha',   'Gupta',    'Hernia Repair',              'General Surgery', 25),
    ('Suresh',  'Joshi',    'Coronary Angioplasty',       'Cardiology', 18),
    ('Lakshmi', 'Iyer',     'Thyroid Surgery',            'General Surgery', 10),
    ('Rajesh',  'Nair',     'Brain Tumor Removal',        'Neurology', 45),
    ('Anita',   'Pillai',   'Mastectomy',                 'Oncology', 22),
    ('Vikas',   'Malhotra', 'Shoulder Arthroscopy',       'Orthopedic', 9),
    ('Deepa',   'Krishnan', 'Gallbladder Removal',        'General Surgery', 14),
    ('Manoj',   'Mishra',   'Pacemaker Implant',          'Cardiology', 35),
    ('Sonal',   'Rao',      'Colorectal Surgery',         'Oncology', 16),
    ('Arun',    'Chopra',   'Ankle Fracture Repair',      'Orthopedic', 28),
    ('Rekha',   'Bansal',   'Laminectomy',                'Neurology', 11),
    ('Nitin',   'Shah',     'Appendectomy',               'General Surgery', 6),
]


def _generate_fixture_data() -> dict:
    """
    Build a structured dict that mirrors what the management command creates.
    Useful for generating reference JSON without a running Django instance.
    """
    today = date.today()

    fixture: dict = {
        'departments': DEPARTMENTS,
        'demo_users':  DEMO_USERS,
        'doctors':     DOCTOR_USERS,
        'nurses':      NURSE_USERS,
        'patients':    [
            {
                'email':            f"{''.join(p[0].lower())}{''.join(p[1].lower())}@postcare.demo".replace(' ', ''),
                'first_name':       p[0],
                'last_name':        p[1],
                'diagnosis':        p[2],
                'surgery_type':     p[3],
                'surgery_date':     (today - timedelta(days=p[4])).isoformat(),
                'recovery_days':    p[4],
            }
            for p in PATIENT_DATA
        ],
        'generated_at': datetime.now().isoformat(),
    }
    return fixture


def main() -> None:
    """Write reference JSON fixtures to database/fixtures/."""
    output_dir = Path(__file__).resolve().parent / 'fixtures'
    output_dir.mkdir(parents=True, exist_ok=True)

    data = _generate_fixture_data()

    out_path = output_dir / 'seed_reference.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"[seed_data] Reference fixture written → {out_path}")
    print(f"[seed_data] For full seeding run:  python manage.py seed_data")


if __name__ == '__main__':
    main()
