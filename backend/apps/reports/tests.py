from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.patients.models import Patient
from apps.recovery.models import RecoveryCheckIn, RiskPrediction
from apps.medications.models import Medication, MedicationLog
from apps.followups.models import FollowUp


class ClinicalReportsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_user(
            email='admin@postcare.test',
            username='admin@postcare.test',
            password='TestPassword123!',
            role='admin',
            first_name='Admin',
            last_name='User'
        )

        # Doctor user
        self.doctor = User.objects.create_user(
            email='doctor@postcare.test',
            username='doctor@postcare.test',
            password='TestPassword123!',
            role='doctor',
            first_name='Ananya',
            last_name='Sharma'
        )

        # Patient user
        self.patient_user = User.objects.create_user(
            email='patient@postcare.test',
            username='patient@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Rahul',
            last_name='Verma'
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-TEST-001',
            surgery_type='Total Knee Replacement'
        )

        self.endpoints = [
            '/api/reports/',
            '/api/reports/recovery-index/',
            '/api/reports/risk-stratification/',
            '/api/reports/medication-compliance/',
            '/api/reports/follow-up-completion/',
        ]

    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests must be rejected with 401."""
        for endpoint in self.endpoints:
            res = self.client.get(endpoint)
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED, f"Failed for {endpoint}")

    def test_patient_access_forbidden(self):
        """Patient role must be rejected with 403 Forbidden."""
        self.client.force_authenticate(user=self.patient_user)
        for endpoint in self.endpoints:
            res = self.client.get(endpoint)
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, f"Failed for {endpoint}")

    def test_admin_and_doctor_access_allowed(self):
        """Both Doctor and Admin must have access to all clinical reports."""
        for user in [self.doctor, self.admin]:
            self.client.force_authenticate(user=user)
            for endpoint in self.endpoints:
                res = self.client.get(endpoint)
                self.assertEqual(res.status_code, status.HTTP_200_OK, f"Failed for {endpoint} with {user.role}")

    def test_empty_database_responses(self):
        """When no clinical records exist, views return honest empty/null states with no crashes."""
        # Ensure clean state
        RecoveryCheckIn.objects.all().delete()
        RiskPrediction.objects.all().delete()
        Medication.objects.all().delete()
        MedicationLog.objects.all().delete()
        FollowUp.objects.all().delete()

        self.client.force_authenticate(user=self.admin)

        # 1. Overview
        res = self.client.get('/api/reports/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIsNone(data['avg_recovery_score'])
        self.assertIsNone(data['followup_completion_rate'])
        self.assertIsNone(data['medication_adherence_rate'])
        self.assertEqual(data['risk_distribution']['total'], 0)
        self.assertEqual(len(data['daily_trajectory']), 0)

        # 2. Recovery Index
        res = self.client.get('/api/reports/recovery-index/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIsNone(data['avg_pain_score'])
        self.assertIsNone(data['avg_temperature'])
        self.assertIsNone(data['recovery_trajectory_index'])
        self.assertEqual(len(data['recent_checkins']), 0)
        self.assertEqual(len(data['trajectory']), 0)

        # 3. Risk Stratification
        res = self.client.get('/api/reports/risk-stratification/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['distribution']['total'], 0)
        self.assertEqual(data['distribution']['percentages']['high'], 0)
        self.assertEqual(len(data['high_risk_alerts']), 0)
        self.assertEqual(len(data['recent_predictions']), 0)

        # 4. Medication Compliance
        res = self.client.get('/api/reports/medication-compliance/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIsNone(data['adherence_rate'])
        self.assertEqual(data['total_prescriptions'], 0)
        self.assertEqual(len(data['active_prescriptions']), 0)
        self.assertEqual(len(data['daily_adherence']), 0)

        # 5. Follow-Up Completion
        res = self.client.get('/api/reports/follow-up-completion/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIsNone(data['completion_rate'])
        self.assertEqual(data['total_appointments'], 0)
        self.assertEqual(len(data['appointments']), 0)

    def test_populated_database_calculations(self):
        """Verify accurate calculation of scores, rates, and distributions from database records."""
        # Create check-ins
        c1 = RecoveryCheckIn.objects.create(
            patient=self.patient,
            date=date(2026, 10, 1),
            pain_level=2,
            temperature=36.6,
            wound_condition='normal',
            medication_adherence='all',
            recovery_score=85.0
        )
        c2 = RecoveryCheckIn.objects.create(
            patient=self.patient,
            date=date(2026, 10, 2),
            pain_level=4,
            temperature=37.2,
            wound_condition='mild_redness',
            medication_adherence='some',
            recovery_score=75.0
        )

        # Create risk predictions
        p1 = RiskPrediction.objects.create(
            patient=self.patient,
            checkin=c1,
            risk_level='low',
            confidence=0.92,
            contributing_factors={'Pain': 'Low', 'Temp': 'Normal'}
        )
        p2 = RiskPrediction.objects.create(
            patient=self.patient,
            checkin=c2,
            risk_level='high',
            confidence=0.88,
            contributing_factors={'Pain': 'Moderate', 'Temp': 'Elevated'}
        )

        # Create medication and log
        med = Medication.objects.create(
            patient=self.patient,
            medicine_name='Amoxicillin 500mg',
            dosage='1 capsule',
            frequency='Twice daily',
            duration_days=7,
            status='active'
        )
        MedicationLog.objects.create(medication=med, date=date(2026, 10, 1), status='taken')
        MedicationLog.objects.create(medication=med, date=date(2026, 10, 2), status='missed')

        # Create follow-up appointments
        FollowUp.objects.create(
            patient=self.patient,
            appointment_date=date(2026, 10, 5),
            appointment_time='10:00:00',
            status='completed',
            purpose='Post-Op Suture Removal'
        )
        FollowUp.objects.create(
            patient=self.patient,
            appointment_date=date(2026, 10, 15),
            appointment_time='14:30:00',
            status='upcoming',
            purpose='Orthopedic Review'
        )

        self.client.force_authenticate(user=self.doctor)

        # Verify Overview calculations
        res = self.client.get('/api/reports/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['avg_recovery_score'], 80.0) # (85 + 75) / 2
        self.assertEqual(data['risk_distribution']['high'], 1)
        self.assertEqual(data['risk_distribution']['low'], 1)
        self.assertEqual(data['risk_distribution']['total'], 2)
        self.assertEqual(data['followup_completion_rate'], '50.0%') # 1 of 2 completed
        self.assertEqual(data['medication_adherence_rate'], '50.0%') # 1 taken, 1 missed
        self.assertEqual(len(data['daily_trajectory']), 2)

        # Verify Recovery Index calculations
        res = self.client.get('/api/reports/recovery-index/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['avg_pain_score'], 3.0) # (2 + 4) / 2
        self.assertEqual(data['avg_temperature'], 36.9) # (36.6 + 37.2) / 2
        self.assertEqual(data['recovery_trajectory_index'], 80.0)
        self.assertEqual(len(data['recent_checkins']), 2)

        # Verify Risk Stratification
        res = self.client.get('/api/reports/risk-stratification/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['distribution']['high'], 1)
        self.assertEqual(data['distribution']['percentages']['high'], 50.0)
        self.assertEqual(len(data['high_risk_alerts']), 1)
        self.assertEqual(data['high_risk_alerts'][0]['patient_name'], 'Rahul Verma')

        # Verify Medication Compliance
        res = self.client.get('/api/reports/medication-compliance/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['taken_doses'], 1)
        self.assertEqual(data['missed_doses'], 1)
        self.assertEqual(data['adherence_rate'], '50.0%')
        self.assertEqual(len(data['active_prescriptions']), 1)
        self.assertEqual(data['active_prescriptions'][0]['medicine_name'], 'Amoxicillin 500mg')

        # Verify Follow-Up Completion
        res = self.client.get('/api/reports/follow-up-completion/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['total_appointments'], 2)
        self.assertEqual(data['completed_count'], 1)
        self.assertEqual(data['upcoming_count'], 1)
        self.assertEqual(data['completion_rate'], '50.0%')
        self.assertEqual(len(data['appointments']), 2)

    def test_risk_stratification_with_doctor_review(self):
        """
        Verify Risk Stratification Report correctly handles predictions reviewed by a doctor
        without throwing an AttributeError or 500 error.
        """
        from apps.patients.models import Doctor
        from django.utils import timezone

        doctor_profile = Doctor.objects.create(
            user=self.doctor,
            specialization='Cardiothoracic Surgery',
            license_number='MCI-998877-D'
        )

        c = RecoveryCheckIn.objects.create(
            patient=self.patient,
            date=date(2026, 10, 3),
            pain_level=6,
            temperature=38.4,
            recovery_score=55.0
        )

        p = RiskPrediction.objects.create(
            patient=self.patient,
            checkin=c,
            risk_level='high',
            confidence=0.95,
            contributing_factors={'Fever': 'High', 'Infection': 'Suspected'},
            recommendation_category='Emergency Consultation',
            doctor_review_notes='Patient flagged for urgent wound drainage review.',
            is_reviewed=True,
            reviewed_by=doctor_profile,
            reviewed_at=timezone.now()
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/risk-stratification/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertEqual(data['distribution']['high'], 1)
        self.assertEqual(len(data['recent_predictions']), 1)
        pred = data['recent_predictions'][0]
        self.assertTrue(pred['is_reviewed'])
        self.assertEqual(pred['reviewed_by'], 'Dr. Ananya Sharma')
        self.assertEqual(pred['doctor_review_notes'], 'Patient flagged for urgent wound drainage review.')
        self.assertIsNotNone(pred['reviewed_at'])

