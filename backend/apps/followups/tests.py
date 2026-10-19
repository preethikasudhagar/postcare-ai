from datetime import date, time, timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User
from apps.patients.models import Department, Doctor, Patient
from apps.followups.models import FollowUp
from apps.notifications.models import Notification


class FollowUpRescheduleTests(APITestCase):
    def setUp(self):
        # Create department
        self.dept = Department.objects.create(name='Orthopedics')

        # Create Doctor User & Profile
        self.doctor_user = User.objects.create_user(
            username='doctor_test',
            email='doc@postcare.test',
            password='TestPassword123',
            first_name='Rajesh',
            last_name='Varma',
            role='doctor'
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            department=self.dept,
            specialization='Orthopedic Surgeon'
        )

        # Create Second Doctor for conflict tests
        self.doctor2_user = User.objects.create_user(
            username='doctor2_test',
            email='doc2@postcare.test',
            password='TestPassword123',
            first_name='Ananya',
            last_name='Iyer',
            role='doctor'
        )
        self.doctor2 = Doctor.objects.create(
            user=self.doctor2_user,
            department=self.dept,
            specialization='Physical Therapist'
        )

        # Create Patient 1 User & Profile
        self.patient1_user = User.objects.create_user(
            username='patient1_test',
            email='patient1@postcare.test',
            password='TestPassword123',
            first_name='Rahul',
            last_name='Kumar',
            role='patient'
        )
        self.patient1 = Patient.objects.create(
            user=self.patient1_user,
            patient_id='PAT-TEST-001',
            primary_doctor=self.doctor
        )

        # Create Patient 2 User & Profile
        self.patient2_user = User.objects.create_user(
            username='patient2_test',
            email='patient2@postcare.test',
            password='TestPassword123',
            first_name='Sanjay',
            last_name='Deshmukh',
            role='patient'
        )
        self.patient2 = Patient.objects.create(
            user=self.patient2_user,
            patient_id='PAT-TEST-002',
            primary_doctor=self.doctor
        )

        # Future dates for test appointments
        self.future_date_1 = date.today() + timedelta(days=5)
        self.future_date_2 = date.today() + timedelta(days=10)
        self.past_date = date.today() - timedelta(days=5)

        # Create FollowUp for Patient 1
        self.followup1 = FollowUp.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            department='Orthopedics',
            appointment_date=self.future_date_1,
            appointment_time=time(10, 30),
            purpose='Staple Removal & Incision Review',
            status='upcoming'
        )

    def test_patient_can_request_reschedule_successfully(self):
        self.client.force_authenticate(user=self.patient1_user)
        url = f'/api/follow-ups/{self.followup1.id}/request-reschedule/'
        payload = {
            'reschedule_date': str(self.future_date_2),
            'reschedule_time': '14:00',
            'reschedule_reason': 'Need afternoon consultation due to transport schedule'
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.followup1.refresh_from_db()
        self.assertTrue(self.followup1.reschedule_requested)
        self.assertEqual(self.followup1.status, 'reschedule_requested')
        self.assertEqual(self.followup1.reschedule_date, self.future_date_2)
        self.assertEqual(self.followup1.reschedule_time, time(14, 0))
        self.assertEqual(self.followup1.reschedule_reason, payload['reschedule_reason'])
        # Original appointment is NOT altered automatically
        self.assertEqual(self.followup1.appointment_date, self.future_date_1)
        self.assertEqual(self.followup1.appointment_time, time(10, 30))

        # Check notification generated for doctor
        notif = Notification.objects.filter(recipient=self.doctor_user, type='appointment_update').first()
        self.assertIsNotNone(notif)
        self.assertIn('Rahul Kumar', notif.message)

    def test_prevent_reschedule_with_past_date(self):
        self.client.force_authenticate(user=self.patient1_user)
        url = f'/api/follow-ups/{self.followup1.id}/request-reschedule/'
        payload = {
            'reschedule_date': str(self.past_date),
            'reschedule_time': '10:30',
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('past', res.data['error'].lower())

    def test_prevent_reschedule_when_fields_missing(self):
        self.client.force_authenticate(user=self.patient1_user)
        url = f'/api/follow-ups/{self.followup1.id}/request-reschedule/'
        res = self.client.post(url, {'reschedule_date': str(self.future_date_2)}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('required', res.data['error'].lower())

    def test_prevent_duplicate_reschedule_requests(self):
        self.client.force_authenticate(user=self.patient1_user)
        url = f'/api/follow-ups/{self.followup1.id}/request-reschedule/'
        # First request succeeds
        res1 = self.client.post(url, {
            'reschedule_date': str(self.future_date_2),
            'reschedule_time': '11:00',
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Duplicate request should fail
        res2 = self.client.post(url, {
            'reschedule_date': str(self.future_date_2 + timedelta(days=1)),
            'reschedule_time': '11:00',
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already pending', res2.data['error'].lower())

    def test_cannot_reschedule_completed_or_cancelled_appointments(self):
        self.followup1.status = 'completed'
        self.followup1.save()

        self.client.force_authenticate(user=self.patient1_user)
        url = f'/api/follow-ups/{self.followup1.id}/request-reschedule/'
        res = self.client.post(url, {
            'reschedule_date': str(self.future_date_2),
            'reschedule_time': '11:00',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('completed', res.data['error'].lower())

    def test_unauthorized_patient_cannot_reschedule_another_patients_appointment(self):
        self.client.force_authenticate(user=self.patient2_user)
        url = f'/api/follow-ups/{self.followup1.id}/request-reschedule/'
        res = self.client.post(url, {
            'reschedule_date': str(self.future_date_2),
            'reschedule_time': '11:00',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_conflict_detection_prevents_double_booking_doctor(self):
        # Create an existing confirmed appointment for doctor at future_date_2 11:00
        FollowUp.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            department='Orthopedics',
            appointment_date=self.future_date_2,
            appointment_time=time(11, 0),
            purpose='Post-Op Review',
            status='upcoming'
        )

        self.client.force_authenticate(user=self.patient1_user)
        url = f'/api/follow-ups/{self.followup1.id}/request-reschedule/'
        res = self.client.post(url, {
            'reschedule_date': str(self.future_date_2),
            'reschedule_time': '11:00',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already has an appointment', res.data['error'])

    def test_doctor_can_approve_reschedule_request(self):
        # Setup pending reschedule
        self.followup1.reschedule_requested = True
        self.followup1.reschedule_date = self.future_date_2
        self.followup1.reschedule_time = time(14, 30)
        self.followup1.reschedule_reason = 'Need change'
        self.followup1.status = 'reschedule_requested'
        self.followup1.save()

        self.client.force_authenticate(user=self.doctor_user)
        url = f'/api/follow-ups/{self.followup1.id}/review-reschedule/'
        res = self.client.post(url, {
            'action': 'approve',
            'note': 'Approved. Clinic room 304 reserved.'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.followup1.refresh_from_db()
        self.assertEqual(self.followup1.status, 'rescheduled')
        self.assertFalse(self.followup1.reschedule_requested)
        self.assertIsNone(self.followup1.reschedule_date)
        self.assertIsNone(self.followup1.reschedule_time)
        self.assertEqual(self.followup1.appointment_date, self.future_date_2)
        self.assertEqual(self.followup1.appointment_time, time(14, 30))
        self.assertIn('[Reschedule Approved]', self.followup1.notes)

        # Patient receives notification
        notif = Notification.objects.filter(recipient=self.patient1_user, type='appointment_update').first()
        self.assertIsNotNone(notif)
        self.assertIn('approved', notif.title.lower())

    def test_doctor_can_reject_reschedule_request(self):
        # Setup pending reschedule
        self.followup1.reschedule_requested = True
        self.followup1.reschedule_date = self.future_date_2
        self.followup1.reschedule_time = time(14, 30)
        self.followup1.reschedule_reason = 'Need change'
        self.followup1.status = 'reschedule_requested'
        self.followup1.save()

        self.client.force_authenticate(user=self.doctor_user)
        url = f'/api/follow-ups/{self.followup1.id}/review-reschedule/'
        res = self.client.post(url, {
            'action': 'reject',
            'note': 'Slot unavailable due to scheduled emergency surgery.'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.followup1.refresh_from_db()
        # Original appointment is retained
        self.assertEqual(self.followup1.status, 'upcoming')
        self.assertFalse(self.followup1.reschedule_requested)
        self.assertEqual(self.followup1.appointment_date, self.future_date_1)
        self.assertEqual(self.followup1.appointment_time, time(10, 30))
        self.assertIn('[Reschedule Declined]', self.followup1.notes)

        # Patient receives notification explaining rejection
        notif = Notification.objects.filter(recipient=self.patient1_user, type='appointment_update').first()
        self.assertIsNotNone(notif)
        self.assertIn('declined', notif.title.lower())

    def test_doctor_approval_revalidates_conflicts(self):
        # Setup pending reschedule
        self.followup1.reschedule_requested = True
        self.followup1.reschedule_date = self.future_date_2
        self.followup1.reschedule_time = time(14, 30)
        self.followup1.status = 'reschedule_requested'
        self.followup1.save()

        # In the meantime, another appointment was booked at that slot
        FollowUp.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            department='Orthopedics',
            appointment_date=self.future_date_2,
            appointment_time=time(14, 30),
            purpose='Emergency post-op',
            status='upcoming'
        )

        self.client.force_authenticate(user=self.doctor_user)
        url = f'/api/follow-ups/{self.followup1.id}/review-reschedule/'
        res = self.client.post(url, {'action': 'approve'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('conflict', res.data['error'].lower())
