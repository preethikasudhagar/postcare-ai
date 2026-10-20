import io
import shutil
import tempfile
from pathlib import Path
from PIL import Image

from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User
from apps.patients.models import Patient
from apps.recovery.models import WoundAssessment, RecoveryCheckIn

MEDIA_ROOT = tempfile.mkdtemp()

@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class PatientAccountAssociationTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)

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

        # Existing patient user and record
        self.patient_user1 = User.objects.create_user(
            email='patient1@postcare.test',
            username='patient1@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Rahul',
            last_name='Kumar'
        )
        self.patient_record1 = Patient.objects.create(
            user=self.patient_user1,
            patient_id='P-2026-0001',
            surgery_type='Total Knee Replacement'
        )

        # Existing secondary patient record
        self.patient_user2 = User.objects.create_user(
            email='patient2@postcare.test',
            username='patient2@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Anil',
            last_name='Sharma'
        )
        self.patient_record2 = Patient.objects.create(
            user=self.patient_user2,
            patient_id='P-2026-0002',
            surgery_type='Hip Replacement'
        )

        # Unlinked patient account
        self.unlinked_user = User.objects.create_user(
            email='unlinked@postcare.test',
            username='unlinked@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Pooja',
            last_name='K'
        )

        from django.utils import timezone
        # Create historical check-in for patient 1 to test preservation
        self.checkin = RecoveryCheckIn.objects.create(
            patient=self.patient_record1,
            date=timezone.now().date(),
            pain_level=3,
            temperature=36.8,
            wound_condition='Normal',
            recovery_score=85.0
        )

    def _generate_test_image(self, name='wound.jpg'):
        buf = io.BytesIO()
        img = Image.new('RGB', (100, 100), color=(180, 100, 100))
        img.save(buf, format='JPEG')
        buf.seek(0)
        buf.name = name
        return buf

    def test_admin_can_link_existing_user_to_existing_patient_record(self):
        """Admin links an unlinked user to an existing patient record; verifies association and clinical preservation."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/patients/link-account/', {
            'user_id': self.unlinked_user.id,
            'patient_id': self.patient_record1.id
        })

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('Successfully linked', res.data.get('message', ''))

        # Verify database association
        self.patient_record1.refresh_from_db()
        self.unlinked_user.refresh_from_db()
        self.assertEqual(self.patient_record1.user, self.unlinked_user)
        self.assertEqual(self.unlinked_user.patient_profile, self.patient_record1)

        # Verify clinical history is preserved under this patient record
        self.assertEqual(RecoveryCheckIn.objects.filter(patient=self.patient_record1).count(), 1)
        self.assertEqual(self.patient_record1.recovery_checkins.first().id, self.checkin.id)

    def test_admin_can_provision_new_patient_profile_for_unlinked_user(self):
        """Admin provisions a fresh patient profile for an unlinked user."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/patients/link-account/', {
            'user_id': self.unlinked_user.id,
            'create_new': True,
            'surgery_type': 'Cardiac Bypass Recovery'
        })

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.unlinked_user.refresh_from_db()
        self.assertIsNotNone(self.unlinked_user.patient_profile)
        self.assertEqual(self.unlinked_user.patient_profile.surgery_type, 'Cardiac Bypass Recovery')
        self.assertTrue(self.unlinked_user.patient_profile.patient_id.startswith('PAT-'))

    def test_non_admin_cannot_link_patient_record(self):
        """Non-admin users (patients, caregivers) are rejected with 403 Forbidden."""
        self.client.force_authenticate(user=self.patient_user1)
        res = self.client.post('/api/patients/link-account/', {
            'user_id': self.unlinked_user.id,
            'patient_id': self.patient_record2.id
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_prevention_already_linked_user(self):
        """Prevent linking a user who already has a patient profile to another record."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/patients/link-account/', {
            'user_id': self.patient_user1.id,
            'patient_id': self.patient_record2.id
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already linked', res.data.get('error', '').lower())

    def test_missing_profile_error_on_wound_upload(self):
        """An unlinked patient receives actionable error when attempting wound upload."""
        self.client.force_authenticate(user=self.unlinked_user)
        img = self._generate_test_image('unlinked.jpg')
        res = self.client.post('/api/recovery/wounds/upload/', {'image': img}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No linked patient profile found', res.data.get('error', ''))

    def test_wound_upload_succeeds_after_linking(self):
        """Once linked, authenticated patient automatically uploads without entering database ID."""
        # 1. Admin links unlinked user to patient record 1
        self.client.force_authenticate(user=self.admin)
        link_res = self.client.post('/api/patients/link-account/', {
            'user_id': self.unlinked_user.id,
            'patient_id': self.patient_record1.id
        })
        self.assertEqual(link_res.status_code, status.HTTP_200_OK)

        # 2. Patient authenticates and uploads wound image without specifying patient ID
        self.client.force_authenticate(user=self.unlinked_user)
        img = self._generate_test_image('healing_incision.jpg')
        upload_res = self.client.post(
            '/api/recovery/wounds/upload/',
            {'image': img, 'remarks': 'Day 3 post-op wound photo'},
            format='multipart'
        )

        self.assertEqual(upload_res.status_code, status.HTTP_201_CREATED)
        wound_id = upload_res.data['id']
        saved_wound = WoundAssessment.objects.get(id=wound_id)
        self.assertEqual(saved_wound.patient, self.patient_record1)
        self.assertEqual(saved_wound.uploaded_by, self.unlinked_user)
        self.assertEqual(saved_wound.remarks, 'Day 3 post-op wound photo')

    def test_get_unlinked_users_and_patients(self):
        """Admin can retrieve registry of unlinked users and existing patients for dropdown selection."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/patients/link-account/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('unlinked_users', res.data)
        self.assertIn('patients', res.data)

        unlinked_ids = [u['id'] for u in res.data['unlinked_users']]
        self.assertIn(self.unlinked_user.id, unlinked_ids)
        self.assertNotIn(self.patient_user1.id, unlinked_ids)


class PatientDetailByUHIDTests(TestCase):
    """
    Tests for the PatientDetailView that exercises both integer PK lookup
    and string UHID (patient_id) lookup added to fix the Recovery Timeline bug.
    """

    def setUp(self):
        self.client = APIClient()

        self.doctor_user = User.objects.create_user(
            email='doctor.uhid@postcare.test',
            username='doctor.uhid@postcare.test',
            password='TestPassword123!',
            role='doctor',
            first_name='Test',
            last_name='Doctor'
        )

        self.patient_user = User.objects.create_user(
            email='patient.uhid@postcare.test',
            username='patient.uhid@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Timeline',
            last_name='Patient'
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-UHID-001',
            gender='M',
            surgery_type='Total Knee Arthroplasty'
        )

    def test_patient_detail_by_integer_pk(self):
        """GET /api/patients/<int:pk>/ resolves by database primary key."""
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.get(f'/api/patients/{self.patient.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['patient_id'], 'P-UHID-001')

    def test_patient_detail_by_string_uhid(self):
        """GET /api/patients/<str:pk>/ resolves by patient_id field (UHID)."""
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.get('/api/patients/P-UHID-001/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['patient_id'], 'P-UHID-001')
        self.assertEqual(res.data['id'], self.patient.id)

    def test_patient_detail_nonexistent_uhid_returns_404(self):
        """GET /api/patients/P-NONEXISTENT/ returns 404 when UHID not in database."""
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.get('/api/patients/P-NONEXISTENT/')
        self.assertEqual(res.status_code, 404)

    def test_patient_detail_uhid_requires_authentication(self):
        """Unauthenticated access to UHID endpoint returns 401."""
        res = self.client.get('/api/patients/P-UHID-001/')
        self.assertEqual(res.status_code, 401)

    def test_string_uhid_does_not_shadow_named_routes(self):
        """Confirm doctors/ and nurses/ named routes still resolve correctly."""
        self.client.force_authenticate(user=self.doctor_user)
        # These must NOT be swallowed by the <str:pk> catch-all
        res_doctors = self.client.get('/api/patients/doctors/')
        self.assertNotEqual(res_doctors.status_code, 404)
        res_nurses = self.client.get('/api/patients/nurses/')
        self.assertNotEqual(res_nurses.status_code, 404)
        res_departments = self.client.get('/api/patients/departments/')
        self.assertNotEqual(res_departments.status_code, 404)


class PatientRecoveryHistoryByUHIDTests(TestCase):
    """
    Tests for PatientRecoveryHistoryView with string UHID, verifying
    that recovery check-ins are returned in ascending chronological order
    and that a non-existent UHID returns an empty list (not 404).
    """

    def setUp(self):
        self.client = APIClient()
        from datetime import date, timedelta
        from apps.recovery.models import RecoveryCheckIn

        self.doctor_user = User.objects.create_user(
            email='doctor.rec@postcare.test',
            username='doctor.rec@postcare.test',
            password='TestPassword123!',
            role='doctor',
            first_name='Recovery',
            last_name='Doctor'
        )

        self.patient_user = User.objects.create_user(
            email='patient.rec@postcare.test',
            username='patient.rec@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Recovery',
            last_name='Patient'
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-REC-001',
            gender='F',
            surgery_type='Hip Replacement'
        )

        from apps.recovery.models import RecoveryCheckIn
        today = date.today()
        self.checkin_day1 = RecoveryCheckIn.objects.create(
            patient=self.patient,
            date=today - timedelta(days=2),
            pain_level=6,
            temperature=37.0,
            wound_condition='normal',
            medication_adherence='all',
            recovery_score=80.0
        )
        self.checkin_day2 = RecoveryCheckIn.objects.create(
            patient=self.patient,
            date=today - timedelta(days=1),
            pain_level=4,
            temperature=36.8,
            wound_condition='normal',
            medication_adherence='all',
            recovery_score=85.0
        )
        self.checkin_day3 = RecoveryCheckIn.objects.create(
            patient=self.patient,
            date=today,
            pain_level=2,
            temperature=36.6,
            wound_condition='normal',
            medication_adherence='all',
            recovery_score=90.0
        )

    def test_recovery_history_by_string_uhid_returns_checkins(self):
        """GET /api/recovery/patient/P-REC-001/ returns all check-ins for the patient."""
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.get('/api/recovery/patient/P-REC-001/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 3)

    def test_recovery_history_ascending_chronological_order(self):
        """Check-ins are returned oldest-first (ascending date order)."""
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.get('/api/recovery/patient/P-REC-001/')
        self.assertEqual(res.status_code, 200)
        dates = [item['date'] for item in res.data]
        self.assertEqual(dates, sorted(dates))

    def test_recovery_history_nonexistent_uhid_returns_empty_list(self):
        """UHID with no patient returns 200 with empty list (not 404), so frontend shows empty state."""
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.get('/api/recovery/patient/P-GHOST-999/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])

    def test_recovery_history_requires_authentication(self):
        """Unauthenticated request to UHID recovery history returns 401."""
        res = self.client.get('/api/recovery/patient/P-REC-001/')
        self.assertEqual(res.status_code, 401)

    def test_recovery_history_contains_expected_fields(self):
        """Each check-in in the response includes the required clinical fields."""
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.get('/api/recovery/patient/P-REC-001/')
        self.assertEqual(res.status_code, 200)
        expected_fields = {'id', 'patient', 'date', 'pain_level', 'temperature',
                           'wound_condition', 'recovery_score'}
        for item in res.data:
            self.assertTrue(expected_fields.issubset(set(item.keys())),
                            f"Missing fields: {expected_fields - set(item.keys())}")


class AdminFacultyAndDepartmentManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_user(
            email='superadmin@postcare.test',
            username='superadmin@postcare.test',
            password='TestPassword123!',
            role='admin',
            first_name='Super',
            last_name='Admin'
        )

        self.doctor_user = User.objects.create_user(
            email='regular_doc@postcare.test',
            username='regular_doc@postcare.test',
            password='TestPassword123!',
            role='doctor',
            first_name='Regular',
            last_name='Doctor'
        )

        self.patient_user = User.objects.create_user(
            email='regular_pat@postcare.test',
            username='regular_pat@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Regular',
            last_name='Patient'
        )

        from apps.patients.models import Department
        self.dept = Department.objects.create(name='Cardiology', description='Heart care')

    def test_admin_can_create_department(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/patients/departments/', {
            'name': 'Neurology & Spine',
            'description': 'Advanced neurological surgery'
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['name'], 'Neurology & Spine')
        from apps.patients.models import Department
        self.assertTrue(Department.objects.filter(name='Neurology & Spine').exists())

    def test_duplicate_department_name_rejected(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/patients/departments/', {
            'name': 'Cardiology',
            'description': 'Duplicate'
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('name', res.data)

    def test_non_admin_cannot_create_department(self):
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.post('/api/patients/departments/', {'name': 'Unauthorized'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_create_doctor(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/patients/doctors/', {
            'first_name': 'Sanjay',
            'last_name': 'Kulkarni',
            'email': 'dr.sanjay@postcare.test',
            'specialization': 'Neurosurgery & Spine',
            'department': self.dept.id,
            'license_number': 'MCI-382910-B',
            'phone': '+91 98765 43210'
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['full_name'], 'Sanjay Kulkarni')
        self.assertEqual(res.data['specialization'], 'Neurosurgery & Spine')
        self.assertEqual(res.data['department_name'], 'Cardiology')

        from apps.patients.models import Doctor
        doc = Doctor.objects.get(user__email='dr.sanjay@postcare.test')
        self.assertEqual(doc.specialization, 'Neurosurgery & Spine')
        self.assertEqual(doc.user.role, 'doctor')

    def test_duplicate_doctor_email_rejected(self):
        self.client.force_authenticate(user=self.admin)
        # Create first doctor
        self.client.post('/api/patients/doctors/', {
            'first_name': 'First',
            'last_name': 'Doctor',
            'email': 'duplicate.doc@postcare.test',
            'specialization': 'Orthopedics'
        }, format='json')

        # Attempt to create second with same email
        res = self.client.post('/api/patients/doctors/', {
            'first_name': 'Second',
            'last_name': 'Doctor',
            'email': 'duplicate.doc@postcare.test',
            'specialization': 'Cardiology'
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)

    def test_non_admin_cannot_create_doctor(self):
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.post('/api/patients/doctors/', {
            'first_name': 'Hacker',
            'last_name': 'Doc',
            'email': 'hacker@postcare.test'
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_update_doctor(self):
        self.client.force_authenticate(user=self.admin)
        create_res = self.client.post('/api/patients/doctors/', {
            'first_name': 'Anand',
            'last_name': 'Deshmukh',
            'email': 'anand.doc@postcare.test',
            'specialization': 'Cardiothoracic Surgery'
        }, format='json')
        doc_id = create_res.data['id']

        patch_res = self.client.patch(f'/api/patients/doctors/{doc_id}/', {
            'specialization': 'Senior Cardiac Surgeon',
            'license_number': 'MCI-999999-Z'
        }, format='json')
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data['specialization'], 'Senior Cardiac Surgeon')
        self.assertEqual(patch_res.data['license_number'], 'MCI-999999-Z')

    def test_admin_can_create_nurse(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/patients/nurses/', {
            'first_name': 'Kavita',
            'last_name': 'Pillai',
            'email': 'nurse.kavita@postcare.test',
            'department': self.dept.id,
            'license_number': 'KNC-49201-C',
            'phone': '+91 91234 56789'
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['full_name'], 'Kavita Pillai')
        self.assertEqual(res.data['license_number'], 'KNC-49201-C')

        from apps.patients.models import Nurse
        nurse = Nurse.objects.get(user__email='nurse.kavita@postcare.test')
        self.assertEqual(nurse.user.role, 'nurse')

    def test_non_admin_cannot_create_nurse(self):
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.post('/api/patients/nurses/', {
            'first_name': 'Test',
            'last_name': 'Nurse',
            'email': 'testnurse@postcare.test'
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_request_rejected(self):
        res_doc = self.client.post('/api/patients/doctors/', {'first_name': 'Anon'}, format='json')
        self.assertEqual(res_doc.status_code, 401)
        res_dept = self.client.post('/api/patients/departments/', {'name': 'Anon'}, format='json')
        self.assertEqual(res_dept.status_code, 401)

