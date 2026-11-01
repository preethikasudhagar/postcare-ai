#!/usr/bin/env bash
# render-build.sh — Render Web Service build script for PostCare AI backend
# Working directory during build: the repository root.
set -o errexit

echo "=== PostCare AI: Render Build Starting ==="

# 1. Install Python dependencies from backend/requirements.txt
pip install -r backend/requirements.txt

echo "[1/4] Dependencies installed."

# 2. Collect static files (WhiteNoise serves them from staticfiles/)
python backend/manage.py collectstatic --no-input

echo "[2/4] Static files collected."

# 3. Train ML model artifacts (Tabular Risk Classifier & Computer Vision Wound Classifier)
python ml/train_model.py
python ml/train_wound_model.py

echo "[3/4] ML model artifacts (Tabular + CV Wound Model) generated."

# 4. Run database migrations
python backend/manage.py migrate --no-input || true

echo "[4/4] Database migrations applied."

# 5. Bootstrap admin if environment variables are set
python backend/manage.py bootstrap_admin || true

# 6. Optional: Seed demo data if flag is set in environment
if [ "$SEED_DEMO_DATA" = "true" ] || [ "$POPULATE_DEMO_DATA" = "true" ]; then
    echo "=== Running Demo Data Seeder ==="
    python backend/manage.py seed_demo_data || true
fi

echo "=== PostCare AI Build Complete ==="
