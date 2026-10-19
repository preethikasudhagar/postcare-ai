"""
WSGI config for PostCare AI project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()

# Safe auto-bootstrap for production environments (e.g. Render) without requiring shell access
try:
    from apps.accounts.bootstrap import auto_bootstrap_admin
    auto_bootstrap_admin()
except Exception as _bootstrap_err:
    print(f"[Admin Setup] WSGI auto-bootstrap notice: {_bootstrap_err}")
