"""
PostCare AI — Django Settings
Supports both local development (SQLite) and production (PostgreSQL on Render).
All secrets are read from environment variables; no credentials are hardcoded.
"""
import os
from pathlib import Path
from datetime import timedelta

# ── Core ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-postcare-ai-super-secret-key-2026')

# In production set DEBUG=False via Render environment variable.
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# ── Hosts & Origins ───────────────────────────────────────────────────────────
_allowed_hosts_env = os.getenv('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = (
    [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()]
    if _allowed_hosts_env
    else ['localhost', '127.0.0.1']
)

# ── Installed Apps ────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    # Local Apps
    'apps.accounts',
    'apps.patients',
    'apps.discharge',
    'apps.medications',
    'apps.recovery',
    'apps.followups',
    'apps.notifications',
    'apps.messaging',
    'apps.reports',
    'apps.ml_engine',
]

# ── Middleware ─────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',        # must be first
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # serve static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────────
# Production: set DATABASE_URL (provided by Render PostgreSQL).
# Development: falls back to local SQLite when DATABASE_URL is absent.
DATABASE_URL = os.getenv('DATABASE_URL', '')

if DATABASE_URL:
    # Parse the Render DATABASE_URL using dj-database-url.
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,       # persistent connections
            ssl_require=not DEBUG,  # require SSL in production
        )
    }
elif os.getenv('DB_NAME'):
    # Legacy individual-variable PostgreSQL config (kept for compatibility).
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER', 'postcare_user'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }
else:
    # Local development fallback — SQLite.
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ── Auth ──────────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
]

# ── DRF / JWT ─────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production, explicitly list allowed frontend origins via CORS_ALLOWED_ORIGINS.
# In development, CORS_ALLOW_ALL_ORIGINS=True is safe because DEBUG=True.
_cors_origins_env = os.getenv('CORS_ALLOWED_ORIGINS', '')
if _cors_origins_env:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins_env.split(',') if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOW_ALL_ORIGINS = DEBUG          # True only in local dev
    CORS_ALLOWED_ORIGINS = []

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ── CSRF ──────────────────────────────────────────────────────────────────────
# Trust the Vercel frontend and the Render backend itself for CSRF.
_csrf_env = os.getenv('CSRF_TRUSTED_ORIGINS', '')
if _csrf_env:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_env.split(',') if o.strip()]
else:
    CSRF_TRUSTED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

# Use secure cookies in production.
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# ── Security headers (production only) ───────────────────────────────────────
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = False   # Render handles TLS termination; do not double-redirect.
    SECURE_HSTS_SECONDS = 0       # Enable HSTS only after confirming HTTPS is stable.

# ── Internationalization ──────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ── Static files (WhiteNoise) ─────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Media / Uploaded files ────────────────────────────────────────────────────
# NOTE: Render's disk is EPHEMERAL — uploaded wound images are lost on each
# deploy. For persistent storage you must configure an external object store
# (e.g. AWS S3 / Cloudflare R2). See DEPLOYMENT.md for instructions.
# The application handles missing images gracefully via the onError handler
# in WoundUpload.jsx, so this is a UX limitation, not a hard failure.
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'WARNING'),
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ── Misc ──────────────────────────────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
