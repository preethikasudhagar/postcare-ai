from datetime import date, time
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.patients.models import Patient, Doctor, Caregiver, Department
from apps.discharge.models import DischargePlan, DischargeMedication, DischargeFollowUp

User = get_user_model()


class DischargePlanAuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Department
        self.dept = Department.objects.create(name='Orthopedics')

        # Create Doctor 1 (Dr. Rajesh)
        self.doc1_user = User.objects.create_user(
            username='doctor1',
            email='doctor1@postcare.test',
            password='Password@123',
            role='doctor',
            first_name='Rajesh',
            last_name='Varma'
        )
        self.doctor1 = Doctor.objects.create(
            user=self.doc1_user,
            department=self.dept,
            specialization='Orthopedic Surgery',
            license_number='MCI-748291-K'
        )

        # Create Doctor 2 (Dr. Ananya)
        self.doc2_user = User.objects.create_user(
            username='doctor2',
            email='doctor2@postcare.test',
            password='Password@123',
            role='doctor',
            first_name='Ananya',
            last_name='Iyer'
        )
        self.doctor2 = Doctor.objects.create(
            user=self.doc2_user,
            department=self.dept,
            specialization='Cardiology',
            license_number='MCI-998811-C'
        )

        # Create Patient 1 (Rahul Kumar, assigned to Doctor 1)
        self.pat1_user = User.objects.create_user(
            username='patient1',
            email='patient1@postcare.test',
            password='Password@123',
            role='patient',
            first_name='Rahul',
            last_name='Kumar'
        )
        self.patient1 = Patient.objects.create(
            user=self.pat1_user,
            patient_id='P-101',
            primary_doctor=self.doctor1,
            surgery_type='Total Knee Arthroplasty (L)'
        )

        # Create Patient 2 (Vikram Mehta, assigned to Doctor 2)
        self.pat2_user = User.objects.create_user(
            username='patient2',
            email='patient2@postcare.test',
            password='Password@123',
            role='patient',
            first_name='Vikram',
            last_name='Mehta'
        )
        self.patient2 = Patient.objects.create(
            user=self.pat2_user,
            patient_id='P-102',
            primary_doctor=self.doctor2,
            surgery_type='Cardiac Bypass (CABG)'
        )

        # Create Caregiver 1 (Caregiver for Patient 1)
        self.cg1_user = User.objects.create_user(
            username='caregiver1',
            email='caregiver1@postcare.test',
            password='Password@123',
            role='caregiver',
            first_name='Sunita',
            last_name='Kumar'
        )
        self.caregiver1 = Caregiver.objects.create(
            user=self.cg1_user,
            patient=self.patient1,
            relationship='Spouse'
        )

        # Create Caregiver 2 (Caregiver for Patient 2)
        self.cg2_user = User.objects.create_user(
            username='caregiver2',
            email='caregiver2@postcare.test',
            password='Password@123',
            role='caregiver',
            first_name='Pooja',
            last_name='Mehta'
        )
        self.caregiver2 = Caregiver.objects.create(
            user=self.cg2_user,
            patient=self.patient2,
            relationship='Daughter'
        )

        # Create Administrator
        self.admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@postcare.test',
            password='Password@123',
            role='admin',
            first_name='Super',
            last_name='Admin',
            is_staff=True
        )

        # Create Discharge Plan for Patient 1 (Authored by Doctor 1)
        self.plan1 = DischargePlan.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            surgery_type='Total Knee Arthroplasty (L)',
            surgery_date=date(2026, 9, 4),
            discharge_date=date(2026, 9, 6),
            diagnosis='Grade IV Osteoarthritis',
            diet_instructions='High protein recovery diet',
            activity_restrictions='Walker-assisted ambulation only',
            wound_care_instructions='Keep dressing dry and sealed',
            general_instructions='Rest with limb elevated for 48 hours',
            status='published',
            version=1.2
        )
        DischargeMedication.objects.create(
            discharge_plan=self.plan1,
            medicine_name='Cefuroxime Axetil',
            dosage='500 mg',
            frequency='Twice daily',
            duration_days=5,
            instructions='Take after meals'
        )
        DischargeFollowUp.objects.create(
            discharge_plan=self.plan1,
            appointment_date=date(2026, 9, 20),
            appointment_time=time(10, 30),
            department='Orthopedic Surgery OPD',
            purpose='Staple removal'
        )

        # Create Discharge Plan for Patient 2 (Authored by Doctor 2)
        self.plan2 = DischargePlan.objects.create(
            patient=self.patient2,
            doctor=self.doctor2,
            surgery_type='Cardiac Bypass (CABG)',
            surgery_date=date(2026, 9, 2),
            discharge_date=date(2026, 9, 8),
            diagnosis='Coronary Artery Disease',
            diet_instructions='Low sodium cardiac diet',
            activity_restrictions='No strenuous activity or lifting over 2 kg',
            wound_care_instructions='Monitor chest incision daily',
            general_instructions='Daily blood pressure monitoring',
            status='published',
            version=1.0
        )

    def test_unauthenticated_request_rejected(self):
        """Unauthenticated requests must be rejected with HTTP 401 Unauthorized."""
        response = self.client.get(f'/api/discharge-plans/{self.plan1.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_doctor_can_view_assigned_patient_discharge_plan(self):
        """Doctor 1 must be able to view their assigned patient's plan."""
        self.client.force_authenticate(user=self.doc1_user)
        response = self.client.get(f'/api/discharge-plans/{self.plan1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.plan1.id)
        self.assertEqual(response.data['patient_name'], 'Rahul Kumar')
        self.assertEqual(response.data['patient_uhid'], 'P-101')
        self.assertEqual(len(response.data['medications']), 1)
        self.assertEqual(len(response.data['follow_ups']), 1)

    def test_doctor_cannot_view_unassigned_patient_discharge_plan(self):
        """Doctor 1 must receive HTTP 403 Forbidden when trying to view Doctor 2's patient's plan."""
        self.client.force_authenticate(user=self.doc1_user)
        response = self.client.get(f'/api/discharge-plans/{self.plan2.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_lookup_with_dp_prefix(self):
        """Doctor 1 can lookup plan using 'DP-1' or 'DP-001' reference format."""
        self.client.force_authenticate(user=self.doc1_user)
        response = self.client.get(f'/api/discharge-plans/DP-{self.plan1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.plan1.id)

    def test_patient_can_view_own_discharge_plan(self):
        """Patient 1 can view their own discharge plan."""
        self.client.force_authenticate(user=self.pat1_user)
        response = self.client.get(f'/api/discharge-plans/{self.plan1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['patient_name'], 'Rahul Kumar')

    def test_patient_cannot_view_other_patient_discharge_plan(self):
        """Patient 1 must receive HTTP 403 Forbidden when attempting to view Patient 2's plan."""
        self.client.force_authenticate(user=self.pat1_user)
        response = self.client.get(f'/api/discharge-plans/{self.plan2.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_caregiver_can_view_linked_patient_discharge_plan(self):
        """Caregiver 1 can view their linked patient's (Patient 1) discharge plan."""
        self.client.force_authenticate(user=self.cg1_user)
        response = self.client.get(f'/api/discharge-plans/{self.plan1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['patient_name'], 'Rahul Kumar')

    def test_caregiver_cannot_view_unlinked_patient_discharge_plan(self):
        """Caregiver 1 must receive HTTP 403 Forbidden when trying to view Patient 2's plan."""
        self.client.force_authenticate(user=self.cg1_user)
        response = self.client.get(f'/api/discharge-plans/{self.plan2.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_any_discharge_plan(self):
        """Administrator can view any discharge plan across the system."""
        self.client.force_authenticate(user=self.admin_user)
        res1 = self.client.get(f'/api/discharge-plans/{self.plan1.id}/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        res2 = self.client.get(f'/api/discharge-plans/{self.plan2.id}/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

    def test_nonexistent_discharge_plan_returns_404(self):
        """Request for a non-existent plan returns HTTP 404 Not Found."""
        self.client.force_authenticate(user=self.doc1_user)
        response = self.client.get('/api/discharge-plans/999999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_doctor_discharge_plans_list_filtering(self):
        """Doctor 1's list view must contain only Patient 1's plan and exclude Patient 2's."""
        self.client.force_authenticate(user=self.doc1_user)
        response = self.client.get('/api/discharge-plans/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan_ids = [p['id'] for p in response.data]
        self.assertIn(self.plan1.id, plan_ids)
        self.assertNotIn(self.plan2.id, plan_ids)
