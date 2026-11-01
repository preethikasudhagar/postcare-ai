from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Seeds database with realistic synthetic post-operative healthcare data (50 Patients, 12 Doctors, 15 Caregivers)'

    def handle(self, *args, **options):
        self.stdout.write("Invoking comprehensive PostCare AI clinical demo seeder...")
        call_command('seed_demo_data')
