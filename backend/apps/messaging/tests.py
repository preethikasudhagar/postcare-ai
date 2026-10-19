from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.patients.models import Department, Doctor, Nurse, Patient
from apps.messaging.models import Conversation, Message


class MessagingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Departments
        self.ortho_dept = Department.objects.create(name='Orthopedic Surgery')
        self.cardio_dept = Department.objects.create(name='Cardiology')

        # Users
        self.patient_user = User.objects.create_user(
            username='test_patient@postcare.demo',
            email='test_patient@postcare.demo',
            password='TestPassword123',
            first_name='Rahul',
            last_name='Kumar',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='test_doctor@postcare.demo',
            email='test_doctor@postcare.demo',
            password='TestPassword123',
            first_name='Rajesh',
            last_name='Varma',
            role='doctor'
        )
        self.nurse_user = User.objects.create_user(
            username='test_nurse@postcare.demo',
            email='test_nurse@postcare.demo',
            password='TestPassword123',
            first_name='Priya',
            last_name='Nair',
            role='nurse'
        )
        self.unrelated_doctor_user = User.objects.create_user(
            username='unrelated_doc@postcare.demo',
            email='unrelated_doc@postcare.demo',
            password='TestPassword123',
            first_name='Vikram',
            last_name='Mehta',
            role='doctor'
        )

        # Profiles
        self.doctor_profile = Doctor.objects.create(
            user=self.doctor_user,
            department=self.ortho_dept,
            specialization='Orthopedic Surgeon'
        )
        self.nurse_profile = Nurse.objects.create(
            user=self.nurse_user,
            department=self.ortho_dept
        )
        self.unrelated_doctor_profile = Doctor.objects.create(
            user=self.unrelated_doctor_user,
            department=self.cardio_dept,
            specialization='Cardiologist'
        )

        self.patient_profile = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-TEST-101',
            surgery_type='Total Knee Arthroplasty',
            primary_doctor=self.doctor_profile
        )
        self.patient_profile.assigned_nurses.add(self.nurse_profile)

        # Existing Conversation
        self.conv = Conversation.objects.create(related_patient=self.patient_profile)
        self.conv.participants.add(self.patient_user, self.doctor_user)

        self.msg1 = Message.objects.create(
            conversation=self.conv,
            sender=self.doctor_user,
            content="Initial doctor instruction.",
            is_read=True
        )

    def test_list_conversations_for_patient(self):
        """Patient can list conversations and see doctor details."""
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/messages/conversations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)

        conv_item = next(c for c in data if c['id'] == self.conv.id)
        self.assertEqual(conv_item['other_participant']['name'], 'Dr. Rajesh Varma')
        self.assertEqual(conv_item['other_participant']['role'], 'doctor')
        self.assertEqual(conv_item['latest_message']['content'], 'Initial doctor instruction.')

    def test_send_message_patient_to_doctor_success(self):
        """Patient successfully sends message to doctor; persists in database."""
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.post(
            f'/api/messages/conversations/{self.conv.id}/messages/',
            {'content': 'Hello Dr. Varma, my knee swelling has reduced.'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn('id', data)
        self.assertEqual(data['sender'], self.patient_user.id)
        self.assertEqual(data['sender_name'], 'Rahul Kumar')
        self.assertEqual(data['content'], 'Hello Dr. Varma, my knee swelling has reduced.')
        self.assertFalse(data['is_read'])
        self.assertEqual(data['delivery_status'], 'delivered')
        self.assertTrue(data['is_me'])

        # Verify DB persistence
        db_msg = Message.objects.get(id=data['id'])
        self.assertEqual(db_msg.conversation_id, self.conv.id)
        self.assertEqual(db_msg.sender_id, self.patient_user.id)
        self.assertEqual(db_msg.content, 'Hello Dr. Varma, my knee swelling has reduced.')
        self.assertFalse(db_msg.is_read)

    def test_reject_empty_or_whitespace_message(self):
        """Sending empty or whitespace-only messages is rejected with 400 Bad Request."""
        self.client.force_authenticate(user=self.patient_user)
        
        # Empty string
        res1 = self.client.post(f'/api/messages/conversations/{self.conv.id}/messages/', {'content': ''}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)

        # Whitespace string
        res2 = self.client.post(f'/api/messages/conversations/{self.conv.id}/messages/', {'content': '   \n  \t '}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_reads_and_replies_to_patient(self):
        """Doctor opens conversation, unread message is marked as read, doctor replies."""
        # Patient sends message
        patient_msg = Message.objects.create(
            conversation=self.conv,
            sender=self.patient_user,
            content="Can I start walking without crutches?",
            is_read=False
        )

        # Doctor logs in and fetches messages
        self.client.force_authenticate(user=self.doctor_user)
        res_get = self.client.get(f'/api/messages/conversations/{self.conv.id}/messages/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        
        # Check that recipient viewing marked unread incoming messages as read
        patient_msg.refresh_from_db()
        self.assertTrue(patient_msg.is_read)

        # Doctor replies
        res_post = self.client.post(
            f'/api/messages/conversations/{self.conv.id}/messages/',
            {'content': 'Please use crutches for another 3 days before transitioning.'},
            format='json'
        )
        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)
        reply_id = res_post.json()['id']

        # Patient logs in and verifies reply is visible
        self.client.force_authenticate(user=self.patient_user)
        res_patient_view = self.client.get(f'/api/messages/conversations/{self.conv.id}/messages/')
        self.assertEqual(res_patient_view.status_code, status.HTTP_200_OK)
        msg_ids = [m['id'] for m in res_patient_view.json()]
        self.assertIn(reply_id, msg_ids)

    def test_unauthorized_user_cannot_access_or_post_to_conversation(self):
        """Users not participating in a conversation receive 403 Forbidden."""
        self.client.force_authenticate(user=self.unrelated_doctor_user)

        # Try to view messages
        res_get = self.client.get(f'/api/messages/conversations/{self.conv.id}/messages/')
        self.assertEqual(res_get.status_code, status.HTTP_403_FORBIDDEN)

        # Try to post a message
        res_post = self.client.post(
            f'/api/messages/conversations/{self.conv.id}/messages/',
            {'content': 'Sneaking into private conversation'},
            format='json'
        )
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_cannot_message_unauthorized_clinician(self):
        """Patient cannot start a conversation with a doctor outside their care team."""
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.post(
            '/api/messages/conversations/',
            {'recipient_id': self.unrelated_doctor_user.id},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("care team", res.json()['error'].lower())

    def test_unauthenticated_request_rejected(self):
        """Unauthenticated requests are rejected with 401 Unauthorized."""
        res = self.client.get('/api/messages/conversations/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_care_team_contacts_endpoint_for_patient_with_care_team(self):
        """Patient gets their linked primary doctor, assigned nurses, and department specialists."""
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.get('/api/messages/care-team/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(data['has_patient_profile'])
        self.assertTrue(data['has_care_team'])
        contacts = data['contacts']
        self.assertGreaterEqual(len(contacts), 2)
        contact_names = [c['name'] for c in contacts]
        self.assertIn('Dr. Rajesh Varma', contact_names)
        self.assertIn('Nurse Priya Nair', contact_names)

        # Check existing conversation ID is populated for Dr. Rajesh Varma
        doc_contact = next(c for c in contacts if c['user_id'] == self.doctor_user.id)
        self.assertEqual(doc_contact['conversation_id'], self.conv.id)
        self.assertTrue(doc_contact['is_primary'])
        self.assertIsNotNone(doc_contact['latest_message'])

    def test_care_team_contacts_for_patient_without_care_team(self):
        """Patient with no assigned doctor/nurse receives clean empty state explanation."""
        unassigned_user = User.objects.create_user(
            username='unassigned_patient@postcare.demo',
            email='unassigned_patient@postcare.demo',
            password='TestPassword123',
            role='patient'
        )
        Patient.objects.create(
            user=unassigned_user,
            patient_id='P-TEST-UNASSIGNED',
            surgery_type='General Care'
        )
        self.client.force_authenticate(user=unassigned_user)
        res = self.client.get('/api/messages/care-team/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(data['has_patient_profile'])
        self.assertFalse(data['has_care_team'])
        self.assertEqual(len(data['contacts']), 0)
        self.assertIn('assigned', data['message'].lower())

    def test_care_team_contacts_for_unlinked_user(self):
        """Account without a linked patient profile receives actionable resolution message."""
        unlinked_user = User.objects.create_user(
            username='unlinked_msg@postcare.demo',
            email='unlinked_msg@postcare.demo',
            password='TestPassword123',
            role='patient'
        )
        self.client.force_authenticate(user=unlinked_user)
        res = self.client.get('/api/messages/care-team/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertFalse(data['has_patient_profile'])
        self.assertFalse(data['has_care_team'])
        self.assertIn('No linked patient profile found', data['message'])

    def test_create_or_get_conversation_with_care_team_member(self):
        """Creating conversation with assigned nurse succeeds and deduplicates if called twice."""
        self.client.force_authenticate(user=self.patient_user)
        # Create conversation with nurse
        res1 = self.client.post(
            '/api/messages/conversations/',
            {'recipient_id': self.nurse_user.id},
            format='json'
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        conv1_id = res1.json()['id']

        # Calling again returns existing conversation without creating duplicate
        res2 = self.client.post(
            '/api/messages/conversations/',
            {'recipient_id': self.nurse_user.id},
            format='json'
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        conv2_id = res2.json()['id']
        self.assertEqual(conv1_id, conv2_id)

