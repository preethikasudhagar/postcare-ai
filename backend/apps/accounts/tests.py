from django.test import TestCase
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework import status
from .models import User


class AccountsAuthenticationAndPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create standard test users
        self.admin_user = User.objects.create_user(
            email='admin@postcare.test',
            username='admin_test',
            password='AdminPassword123!',
            first_name='Admin',
            last_name='User',
            role='admin',
            is_staff=True,
            is_superuser=True
        )

        self.doctor_user = User.objects.create_user(
            email='doctor@postcare.test',
            username='doctor_test',
            password='DoctorPassword123!',
            first_name='Doctor',
            last_name='User',
            role='doctor'
        )

        self.patient_user = User.objects.create_user(
            email='patient@postcare.test',
            username='patient_test',
            password='PatientPassword123!',
            first_name='Patient',
            last_name='User',
            role='patient'
        )

        self.nurse_user = User.objects.create_user(
            email='nurse@postcare.test',
            username='nurse_test',
            password='NursePassword123!',
            first_name='Nurse',
            last_name='User',
            role='nurse'
        )

        self.caregiver_user = User.objects.create_user(
            email='caregiver@postcare.test',
            username='caregiver_test',
            password='CaregiverPassword123!',
            first_name='Caregiver',
            last_name='User',
            role='caregiver'
        )

    def test_admin_login_success(self):
        """Administrator can authenticate and receives admin role and JWT tokens."""
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@postcare.test',
            'password': 'AdminPassword123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'admin')
        self.assertEqual(response.data['user']['email'], 'admin@postcare.test')

    def test_admin_login_invalid_password(self):
        """Incorrect password for admin is rejected with 401."""
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@postcare.test',
            'password': 'WrongPassword999!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('message', response.data)

    def test_admin_login_inactive_account(self):
        """Deactivated admin account cannot sign in."""
        self.admin_user.is_active = False
        self.admin_user.save()

        response = self.client.post('/api/auth/login/', {
            'email': 'admin@postcare.test',
            'password': 'AdminPassword123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_standard_roles_login_returns_correct_role(self):
        """Patients, doctors, nurses, and caregivers authenticate and receive their respective roles."""
        roles = [
            ('doctor@postcare.test', 'DoctorPassword123!', 'doctor'),
            ('patient@postcare.test', 'PatientPassword123!', 'patient'),
            ('nurse@postcare.test', 'NursePassword123!', 'nurse'),
            ('caregiver@postcare.test', 'CaregiverPassword123!', 'caregiver'),
        ]
        for email, password, expected_role in roles:
            with self.subTest(role=expected_role):
                res = self.client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
                self.assertEqual(res.status_code, status.HTTP_200_OK)
                self.assertEqual(res.data['user']['role'], expected_role)

    def test_public_registration_prohibits_admin_role(self):
        """Public self-registration with role='admin' is strictly prohibited."""
        response = self.client.post('/api/auth/register/', {
            'email': 'hacker_admin@postcare.test',
            'password': 'HackerPassword123!',
            'first_name': 'Bad',
            'last_name': 'Actor',
            'role': 'admin'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Verify user was not created
        self.assertFalse(User.objects.filter(email='hacker_admin@postcare.test').exists())

    def test_public_registration_allows_standard_roles(self):
        """Public registration allows valid roles (patient, doctor, nurse, caregiver)."""
        response = self.client.post('/api/auth/register/', {
            'email': 'newpatient@postcare.test',
            'password': 'SecurePassword123!',
            'first_name': 'New',
            'last_name': 'Patient',
            'role': 'patient'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='newpatient@postcare.test')
        self.assertEqual(user.role, 'patient')
        self.assertTrue(hasattr(user, 'patient_profile'))

    def test_admin_users_endpoint_unauthorized_for_anonymous(self):
        """Unauthenticated requests to /api/admin/users/ return 401."""
        response = self.client.get('/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_users_endpoint_forbidden_for_non_admins(self):
        """Non-admin roles (patient, doctor, nurse, caregiver) receive 403 Forbidden on /api/admin/users/."""
        non_admin_users = [self.patient_user, self.doctor_user, self.nurse_user, self.caregiver_user]

        for user in non_admin_users:
            with self.subTest(role=user.role):
                self.client.force_authenticate(user=user)
                response = self.client.get('/api/admin/users/')
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_users_endpoint_accessible_for_admin(self):
        """Authenticated administrator can access /api/admin/users/."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 5)

    def test_admin_can_provision_new_users_including_admins(self):
        """Administrator using /api/admin/users/ can provision users of any role."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/admin/users/', {
            'email': 'second_admin@postcare.test',
            'password': 'SecondAdminPassword123!',
            'first_name': 'Second',
            'last_name': 'Administrator',
            'role': 'admin'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_user = User.objects.get(email='second_admin@postcare.test')
        self.assertEqual(created_user.role, 'admin')
        self.assertTrue(created_user.is_staff)

    def test_create_admin_management_command(self):
        """The create_admin management command correctly provisions an admin user."""
        call_command(
            'create_admin',
            email='cli_admin@postcare.test',
            password='CliAdminPassword123!',
            username='cli_admin',
            first_name='CLI',
            last_name='Admin'
        )

        user = User.objects.get(email='cli_admin@postcare.test')
        self.assertEqual(user.role, 'admin')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password('CliAdminPassword123!'))

    def test_auto_bootstrap_admin_creates_new_user(self):
        """auto_bootstrap_admin creates a new administrator when given credentials."""
        from apps.accounts.bootstrap import auto_bootstrap_admin
        result = auto_bootstrap_admin(
            email='auto_boot_admin@postcare.test',
            password='AutoBootPassword123!',
            name='Auto Admin'
        )
        self.assertEqual(result['status'], 'created')
        user = User.objects.get(email='auto_boot_admin@postcare.test')
        self.assertEqual(user.role, 'admin')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password('AutoBootPassword123!'))

    def test_auto_bootstrap_admin_promotes_existing_user(self):
        """auto_bootstrap_admin promotes an existing user without breaking their password if none given."""
        from apps.accounts.bootstrap import auto_bootstrap_admin
        # self.patient_user is 'patient'
        result = auto_bootstrap_admin(email=self.patient_user.email)
        self.assertEqual(result['status'], 'promoted')
        self.patient_user.refresh_from_db()
        self.assertEqual(self.patient_user.role, 'admin')
        self.assertTrue(self.patient_user.is_staff)
        self.assertTrue(self.patient_user.is_superuser)
        # Original password remains valid
        self.assertTrue(self.patient_user.check_password('PatientPassword123!'))

    def test_auto_bootstrap_admin_skips_when_no_email(self):
        """auto_bootstrap_admin skips gracefully when no email is supplied."""
        from apps.accounts.bootstrap import auto_bootstrap_admin
        result = auto_bootstrap_admin(email='', password='')
        self.assertEqual(result['status'], 'skipped')

    def test_bootstrap_admin_management_command(self):
        """The bootstrap_admin management command successfully provisions an admin."""
        call_command(
            'bootstrap_admin',
            email='cmd_admin@postcare.test',
            password='CmdPassword123!',
            name='Cmd Administrator'
        )
        user = User.objects.get(email='cmd_admin@postcare.test')
        self.assertEqual(user.role, 'admin')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password('CmdPassword123!'))
