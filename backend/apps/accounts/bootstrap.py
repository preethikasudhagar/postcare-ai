"""
PostCare AI — Administrator Bootstrap Utility
Allows automatic provisioning and role promotion of an administrator using
environment variables (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME).
This enables zero-touch admin creation on platforms like Render without requiring
interactive terminal shells, One-Off Jobs, or paid plans.
"""

import os
from django.db import connection
from apps.accounts.models import User


def auto_bootstrap_admin(email=None, password=None, name=None):
    """
    Provisions or promotes an administrator account.
    - If email is not passed, falls back to ADMIN_EMAIL environment variable.
    - If password is not passed, falls back to ADMIN_PASSWORD environment variable.
    - If name is not passed, falls back to ADMIN_NAME environment variable (default: 'System Administrator').

    Behavior:
    - If user exists: promotes role to 'admin', sets is_staff=True, is_superuser=True, is_active=True.
      If password is provided, updates their password.
    - If user does not exist: creates a new active admin user with the provided password.
    - If database table is not ready (e.g. before migrations), safely exits without raising errors.
    """
    target_email = (email or os.getenv('ADMIN_EMAIL') or '').strip().lower()
    target_password = (password or os.getenv('ADMIN_PASSWORD') or '').strip()
    target_name = (name or os.getenv('ADMIN_NAME') or 'System Administrator').strip()

    if not target_email:
        return {'status': 'skipped', 'message': 'No ADMIN_EMAIL defined.'}

    # Safe check if table exists
    try:
        tables = connection.introspection.table_names()
        if 'users' not in tables:
            return {'status': 'skipped', 'message': 'users table does not exist yet.'}
    except Exception as exc:
        return {'status': 'error', 'message': f'Database table introspection failed: {exc}'}

    name_parts = target_name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else 'Admin'
    username = target_email.split('@')[0]

    try:
        user = User.objects.filter(email=target_email).first()
        if user:
            user.role = 'admin'
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            if target_password:
                user.set_password(target_password)
            user.save()
            msg = f"Successfully promoted existing user '{target_email}' to Administrator."
            print(f"[Admin Setup] {msg}")
            return {'status': 'promoted', 'email': target_email, 'message': msg}
        else:
            if not target_password:
                msg = f"ADMIN_EMAIL '{target_email}' provided, but no existing user was found and no ADMIN_PASSWORD was given. Cannot create without password."
                print(f"[Admin Setup] {msg}")
                return {'status': 'skipped', 'message': msg}

            user = User.objects.create(
                email=target_email,
                username=username,
                first_name=first_name,
                last_name=last_name,
                role='admin',
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            user.set_password(target_password)
            user.save()
            msg = f"Successfully created new Administrator account '{target_email}'."
            print(f"[Admin Setup] {msg}")
            return {'status': 'created', 'email': target_email, 'message': msg}
    except Exception as exc:
        msg = f"Auto-bootstrap exception for '{target_email}': {exc}"
        print(f"[Admin Setup] {msg}")
        return {'status': 'error', 'message': msg}
