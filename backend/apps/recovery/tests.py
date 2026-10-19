import os
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
from apps.recovery.models import WoundAssessment
from apps.ml_engine.wound_service import assess_wound_image, ML_DIR

MEDIA_ROOT = tempfile.mkdtemp()

@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class WoundModelIntegrationTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.client = APIClient()

        # Create doctor
        self.doctor_user = User.objects.create_user(
            email='doctor@postcare.test',
            username='doctor@postcare.test',
            password='TestPassword123!',
            role='doctor',
            first_name='Clinical',
            last_name='Reviewer'
        )

        # Create primary patient
        self.patient_user = User.objects.create_user(
            email='patient@postcare.test',
            username='patient@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='John',
            last_name='Doe'
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-TEST-001',
            gender='M',
            surgery_type='Knee Arthroscopy'
        )

        # Create unrelated patient
        self.other_user = User.objects.create_user(
            email='other@postcare.test',
            username='other@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Jane',
            last_name='Smith'
        )
        self.other_patient = Patient.objects.create(
            user=self.other_user,
            patient_id='P-TEST-002',
            gender='F',
            surgery_type='Hip Replacement'
        )

    def _generate_test_image_bytes(self, color=(180, 60, 60), size=(200, 200)):
        buf = io.BytesIO()
        img = Image.new('RGB', size, color=color)
        img.save(buf, format='JPEG')
        buf.seek(0)
        return buf

    def test_genuine_model_artifact_exists_and_evaluates(self):
        """Verify that genuine wound_model.joblib exists and produces valid clinical inferences."""
        model_path = ML_DIR / 'wound_model.joblib'
        self.assertTrue(model_path.exists(), f"Model artifact missing at {model_path}")

        img_buf = self._generate_test_image_bytes(color=(160, 120, 110))
        temp_img = Path(MEDIA_ROOT) / 'eval_test.jpg'
        with open(temp_img, 'wb') as f:
            f.write(img_buf.getvalue())

        res = assess_wound_image(temp_img)
        self.assertEqual(res['status'], 'completed')
        self.assertIn(res['assessment_result'], ['good', 'moderate', 'poor', 'uncertain'])
        self.assertIn('raw_probabilities', res)
        raw_p = res['raw_probabilities']
        self.assertIsNotNone(raw_p)
        self.assertIn('good', raw_p)
        self.assertIn('moderate', raw_p)
        self.assertIn('poor', raw_p)
        prob_sum = raw_p['good'] + raw_p['moderate'] + raw_p['poor']
        self.assertAlmostEqual(prob_sum, 1.0, places=2)

    def test_clinical_safety_policy_flags_extreme_erythema_as_uncertain(self):
        """Verify that an image with extreme redness is gated as uncertain, never falsely cleared as good."""
        # Pure red image triggers severe erythema outlier check
        img_buf = self._generate_test_image_bytes(color=(255, 10, 10))
        temp_img = Path(MEDIA_ROOT) / 'severe_erythema_test.jpg'
        with open(temp_img, 'wb') as f:
            f.write(img_buf.getvalue())

        res = assess_wound_image(temp_img)
        self.assertEqual(res['status'], 'completed')
        self.assertIn(res['assessment_result'], ['moderate', 'poor', 'uncertain'])
        self.assertNotEqual(res['assessment_result'], 'good', "Severe redness must never be cleared as good")

    def test_assess_wound_image_missing_file_fails_gracefully(self):
        """Verify that missing files return failed status without crashing."""
        res = assess_wound_image(Path(MEDIA_ROOT) / 'nonexistent.jpg')
        self.assertEqual(res['status'], 'failed')
        self.assertIsNone(res['confidence'])
        self.assertIsNone(res['raw_probabilities'])

    def test_wound_upload_end_to_end_pipeline(self):
        """Test patient image upload, genuine inference, persistence, doctor review, and deletion."""
        self.client.force_authenticate(user=self.patient_user)

        img_buf = self._generate_test_image_bytes()
        img_buf.name = 'incision_day7.jpg'

        # 1. Patient uploads wound image
        upload_res = self.client.post(
            '/api/recovery/wounds/upload/',
            data={'image': img_buf, 'remarks': 'Incision healing check Day 7.'},
            format='multipart'
        )
        self.assertEqual(upload_res.status_code, status.HTTP_201_CREATED)
        wound_id = upload_res.data['id']
        result_label = upload_res.data['assessment_result']
        conf = upload_res.data['confidence']
        raw_p = upload_res.data.get('raw_probabilities')

        self.assertIn(result_label, ['good', 'moderate', 'poor', 'uncertain'])
        self.assertIsNotNone(raw_p)

        # 2. Verify database persistence
        db_wound = WoundAssessment.objects.get(id=wound_id)
        self.assertEqual(db_wound.patient, self.patient)
        self.assertEqual(db_wound.assessment_result, result_label)
        self.assertEqual(db_wound.confidence, conf)
        self.assertEqual(db_wound.raw_probabilities, raw_p)
        self.assertEqual(db_wound.assessment_reason, upload_res.data.get('assessment_reason'))
        self.assertTrue(os.path.exists(db_wound.image.path))
        disk_path = db_wound.image.path

        # 3. Verify history listing
        list_res = self.client.get('/api/recovery/wounds/patient/me/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        items = [x for x in list_res.data if x['id'] == wound_id]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['assessment_result'], result_label)
        self.assertEqual(items[0]['confidence'], conf)
        self.assertEqual(items[0]['raw_probabilities'], raw_p)
        self.assertEqual(items[0]['assessment_reason'], upload_res.data.get('assessment_reason'))

        # 4. Unauthorized patient cannot delete image
        self.client.force_authenticate(user=self.other_user)
        unauth_del = self.client.delete(f'/api/recovery/wounds/{wound_id}/')
        self.assertEqual(unauth_del.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(WoundAssessment.objects.filter(id=wound_id).exists())

        # 5. Doctor marks image as reviewed
        self.client.force_authenticate(user=self.doctor_user)
        review_res = self.client.patch(
            f'/api/recovery/wounds/{wound_id}/review/',
            data={'doctor_review': True},
            format='json'
        )
        self.assertEqual(review_res.status_code, status.HTTP_200_OK)

        # 6. Retention policy blocks deletion of reviewed records
        self.client.force_authenticate(user=self.patient_user)
        retention_del = self.client.delete(f'/api/recovery/wounds/{wound_id}/')
        self.assertEqual(retention_del.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('retention policy', retention_del.data.get('error', '').lower())

        # 7. Unmark review and test authorized deletion
        db_wound.doctor_review = False
        db_wound.save()

        auth_del = self.client.delete(f'/api/recovery/wounds/{wound_id}/')
        self.assertEqual(auth_del.status_code, status.HTTP_200_OK)
        self.assertFalse(WoundAssessment.objects.filter(id=wound_id).exists())
        self.assertFalse(os.path.exists(disk_path), "Physical image file was not deleted from storage")

        # 8. Subsequent delete returns 404
        del_404 = self.client.delete(f'/api/recovery/wounds/{wound_id}/')
        self.assertEqual(del_404.status_code, status.HTTP_404_NOT_FOUND)

    def test_clear_history_bulk_delete_and_retention(self):
        """Test bulk clearing of wound history: deletes unreviewed, retains doctor-reviewed, preserves other patients."""
        self.client.force_authenticate(user=self.patient_user)

        # Upload 2 images for patient
        buf1 = self._generate_test_image_bytes(color=(120, 100, 100))
        buf1.name = 'wound1.jpg'
        res1 = self.client.post('/api/recovery/wounds/upload/', data={'image': buf1}, format='multipart')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        w1_id = res1.data['id']

        buf2 = self._generate_test_image_bytes(color=(130, 110, 110))
        buf2.name = 'wound2.jpg'
        res2 = self.client.post('/api/recovery/wounds/upload/', data={'image': buf2}, format='multipart')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        w2_id = res2.data['id']

        # Doctor marks wound 1 as reviewed
        w1_obj = WoundAssessment.objects.get(id=w1_id)
        w1_obj.doctor_review = True
        w1_obj.save()
        w1_path = w1_obj.image.path

        w2_obj = WoundAssessment.objects.get(id=w2_id)
        w2_path = w2_obj.image.path

        # Upload 1 image for other patient
        self.client.force_authenticate(user=self.other_user)
        buf_other = self._generate_test_image_bytes(color=(140, 120, 120))
        buf_other.name = 'wound_other.jpg'
        res_other = self.client.post('/api/recovery/wounds/upload/', data={'image': buf_other}, format='multipart')
        self.assertEqual(res_other.status_code, status.HTTP_201_CREATED)
        other_w_id = res_other.data['id']

        # Patient calls Clear History
        self.client.force_authenticate(user=self.patient_user)
        clear_res = self.client.delete('/api/recovery/wounds/clear/')
        self.assertEqual(clear_res.status_code, status.HTTP_200_OK)
        clear_data = clear_res.data

        self.assertEqual(clear_data['deleted_count'], 1)
        self.assertEqual(clear_data['retained_count'], 1)
        self.assertEqual(clear_data['deleted_ids'], [w2_id])
        self.assertEqual(clear_data['retained_ids'], [w1_id])

        # Verify database state
        self.assertFalse(WoundAssessment.objects.filter(id=w2_id).exists(), "Eligible unreviewed record was not deleted")
        self.assertFalse(os.path.exists(w2_path), "Eligible image file was not deleted from storage")

        self.assertTrue(WoundAssessment.objects.filter(id=w1_id).exists(), "Reviewed record was incorrectly deleted")
        self.assertTrue(os.path.exists(w1_path), "Reviewed image file was incorrectly removed from storage")

        # Other patient record must be completely untouched
        self.assertTrue(WoundAssessment.objects.filter(id=other_w_id).exists(), "Other patient record was affected")

    def test_clear_history_unauthorized_user_blocked(self):
        """Verify that an unauthorized user cannot clear another patient's wound history."""
        self.client.force_authenticate(user=self.patient_user)
        buf = self._generate_test_image_bytes()
        buf.name = 'test_unauth.jpg'
        self.client.post('/api/recovery/wounds/upload/', data={'image': buf}, format='multipart')

        # Other patient tries to clear primary patient's history
        self.client.force_authenticate(user=self.other_user)
        unauth_clear = self.client.delete(f'/api/recovery/wounds/patient/{self.patient.id}/clear/')
        self.assertEqual(unauth_clear.status_code, status.HTTP_403_FORBIDDEN)

    def test_wound_upload_with_explicit_matching_patient_id(self):
        """Verify patient can upload with explicit patient ID matching their profile."""
        self.client.force_authenticate(user=self.patient_user)
        buf = self._generate_test_image_bytes()
        buf.name = 'explicit_patient_id.jpg'
        res = self.client.post(
            '/api/recovery/wounds/upload/',
            data={'image': buf, 'patient': self.patient.id, 'remarks': 'Test with explicit ID'},
            format='multipart'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['patient'], self.patient.id)

    def test_wound_upload_with_explicit_matching_uhid(self):
        """Verify patient can upload with explicit UHID matching their profile."""
        self.client.force_authenticate(user=self.patient_user)
        buf = self._generate_test_image_bytes()
        buf.name = 'explicit_uhid.jpg'
        res = self.client.post(
            '/api/recovery/wounds/upload/',
            data={'image': buf, 'patient': self.patient.patient_id, 'remarks': 'Test with explicit UHID'},
            format='multipart'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['patient'], self.patient.id)

    def test_wound_upload_unauthorized_patient_id_mismatch(self):
        """Verify patient cannot upload for another patient's ID."""
        self.client.force_authenticate(user=self.patient_user)
        buf = self._generate_test_image_bytes()
        buf.name = 'mismatch_patient.jpg'
        res = self.client.post(
            '/api/recovery/wounds/upload/',
            data={'image': buf, 'patient': self.other_patient.id},
            format='multipart'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('yourself', res.data.get('error', '').lower())

    def test_wound_upload_missing_patient_profile(self):
        """Verify patient account lacking a Patient profile receives actionable error."""
        unlinked_user = User.objects.create_user(
            email='unlinked@postcare.test',
            username='unlinked@postcare.test',
            password='TestPassword123!',
            role='patient'
        )
        self.client.force_authenticate(user=unlinked_user)
        buf = self._generate_test_image_bytes()
        buf.name = 'unlinked.jpg'
        res = self.client.post(
            '/api/recovery/wounds/upload/',
            data={'image': buf},
            format='multipart'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No linked patient profile found', res.data.get('error', ''))


class RecoveryHistoryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Doctor
        self.doctor_user = User.objects.create_user(
            email='dr.sharma@postcare.test',
            username='dr.sharma@postcare.test',
            password='TestPassword123!',
            role='doctor',
            first_name='Anil',
            last_name='Sharma'
        )

        # Primary patient with check-ins
        self.patient_user = User.objects.create_user(
            email='rahul.k@postcare.test',
            username='rahul.k@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Rahul',
            last_name='Kumar'
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-2026-8941',
            gender='M',
            surgery_type='Total Knee Replacement'
        )

        # Caregiver assigned to primary patient
        self.caregiver_user = User.objects.create_user(
            email='caregiver.k@postcare.test',
            username='caregiver.k@postcare.test',
            password='TestPassword123!',
            role='caregiver',
            first_name='Priya',
            last_name='Kumar'
        )
        from apps.patients.models import Caregiver
        self.caregiver = Caregiver.objects.create(
            user=self.caregiver_user,
            patient=self.patient,
            relationship='Spouse'
        )

        # Patient with 0 check-ins (edge case)
        self.empty_patient_user = User.objects.create_user(
            email='new.patient@postcare.test',
            username='new.patient@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='New',
            last_name='Patient'
        )
        self.empty_patient = Patient.objects.create(
            user=self.empty_patient_user,
            patient_id='P-2026-0000',
            gender='F',
            surgery_type='General Recovery'
        )

        # Patient with 1 check-in (edge case)
        self.single_patient_user = User.objects.create_user(
            email='single.patient@postcare.test',
            username='single.patient@postcare.test',
            password='TestPassword123!',
            role='patient',
            first_name='Single',
            last_name='Checkin'
        )
        self.single_patient = Patient.objects.create(
            user=self.single_patient_user,
            patient_id='P-2026-0001',
            gender='M',
            surgery_type='Arthroscopy'
        )

        from apps.recovery.models import RecoveryCheckIn
        import datetime
        # Create check-ins for primary patient (chronological)
        for i in range(5):
            c = RecoveryCheckIn.objects.create(
                patient=self.patient,
                date=datetime.date(2026, 9, 6 + i),
                pain_level=6 - i,
                temperature=36.8 - (i * 0.1),
                wound_condition='normal',
                symptoms=[],
                medication_adherence='all',
                additional_notes=f'Day {i + 1} checkin'
            )
            c.calculate_score()
            c.save()

        # Create 1 check-in for single check-in patient
        c_single = RecoveryCheckIn.objects.create(
            patient=self.single_patient,
            date=datetime.date(2026, 9, 10),
            pain_level=3,
            temperature=36.6,
            wound_condition='normal',
            symptoms=[],
            medication_adherence='all'
        )
        c_single.calculate_score()
        c_single.save()

    def test_authenticated_patient_gets_own_history_chronologically(self):
        """Authenticated patient gets their own recovery check-ins in chronological order."""
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.get('/api/recovery/history/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 5)
        # Check chronological order
        dates = [item['date'] for item in res.data]
        self.assertEqual(dates, sorted(dates))
        first = res.data[0]
        self.assertEqual(first['pain_level'], 6)
        self.assertEqual(first['temperature'], 36.8)
        self.assertIsNotNone(first['recovery_score'])
        self.assertEqual(first['medication_adherence'], 'all')

    def test_caregiver_gets_assigned_patient_history(self):
        """Caregiver gets the check-in history of their assigned patient."""
        self.client.force_authenticate(user=self.caregiver_user)
        res = self.client.get('/api/recovery/history/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 5)
        self.assertEqual(res.data[0]['patient_name'], 'Rahul Kumar')

    def test_patient_with_zero_checkins_returns_empty_list(self):
        """Patient with zero check-ins receives a clean empty list []."""
        self.client.force_authenticate(user=self.empty_patient_user)
        res = self.client.get('/api/recovery/history/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    def test_patient_with_single_checkin_returns_one_record(self):
        """Patient with exactly one check-in receives single record."""
        self.client.force_authenticate(user=self.single_patient_user)
        res = self.client.get('/api/recovery/history/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['pain_level'], 3)

    def test_doctor_can_query_patient_by_id_and_uhid(self):
        """Doctor can query any patient's check-in history by integer PK and string UHID."""
        self.client.force_authenticate(user=self.doctor_user)
        # By integer ID in URL path
        res1 = self.client.get(f'/api/recovery/patient/{self.patient.id}/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res1.data), 5)

        # By string UHID in URL path
        res2 = self.client.get(f'/api/recovery/patient/{self.patient.patient_id}/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res2.data), 5)

        # By query parameter
        res3 = self.client.get(f'/api/recovery/history/?patient={self.patient.id}')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res3.data), 5)

    def test_patient_cannot_query_another_patient_history(self):
        """Patient attempting to query another patient's records receives empty list."""
        self.client.force_authenticate(user=self.empty_patient_user)
        res = self.client.get(f'/api/recovery/patient/{self.patient.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    def test_unauthenticated_request_rejected(self):
        """Unauthenticated request to recovery history receives 401."""
        res = self.client.get('/api/recovery/history/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


