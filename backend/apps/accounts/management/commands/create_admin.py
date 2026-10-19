import getpass
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Securely create or promote an Administrator account for PostCare AI'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Administrator email address')
        parser.add_argument('--username', type=str, help='Administrator username')
        parser.add_argument('--first-name', type=str, default='System', help='First name')
        parser.add_argument('--last-name', type=str, default='Admin', help='Last name')
        parser.add_argument('--password', type=str, help='Password (optional; prompted securely if omitted)')

    def handle(self, *args, **options):
        email = options.get('email')
        if not email:
            email = input('Enter Administrator email address: ').strip().lower()
        else:
            email = email.strip().lower()

        if not email:
            raise CommandError('Email address cannot be blank.')

        username = options.get('username') or email.split('@')[0]
        first_name = options.get('first-name') or 'System'
        last_name = options.get('last-name') or 'Admin'

        password = options.get('password')
        if not password:
            while True:
                p1 = getpass.getpass('Enter password: ')
                p2 = getpass.getpass('Confirm password: ')
                if p1 != p2:
                    self.stderr.write('Passwords do not match. Please try again.')
                    continue
                try:
                    validate_password(p1)
                except ValidationError as e:
                    for err in e.messages:
                        self.stderr.write(f"Password error: {err}")
                    continue
                password = p1
                break

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'first_name': first_name,
                'last_name': last_name,
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )

        user.set_password(password)
        user.role = 'admin'
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.first_name = first_name
        user.last_name = last_name
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Successfully created Administrator account: {email}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Successfully updated and promoted existing account to Administrator: {email}"))
