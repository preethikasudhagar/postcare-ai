from django.core.management.base import BaseCommand
from apps.accounts.bootstrap import auto_bootstrap_admin


class Command(BaseCommand):
    help = 'Bootstrap Administrator account from environment variables (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME)'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Admin email (overrides ADMIN_EMAIL env var)')
        parser.add_argument('--password', type=str, help='Admin password (overrides ADMIN_PASSWORD env var)')
        parser.add_argument('--name', type=str, help='Admin full name (overrides ADMIN_NAME env var)')

    def handle(self, *args, **options):
        result = auto_bootstrap_admin(
            email=options.get('email'),
            password=options.get('password'),
            name=options.get('name')
        )
        if result['status'] in ('created', 'promoted'):
            self.stdout.write(self.style.SUCCESS(result['message']))
        elif result['status'] == 'skipped':
            self.stdout.write(self.style.WARNING(result['message']))
        else:
            self.stderr.write(self.style.ERROR(result['message']))
