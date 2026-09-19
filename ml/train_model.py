"""
ml/train_model.py
-----------------
Complete training script for the PostCare AI risk classifier.

Usage
-----
    python train_model.py                          # saves to ml/model.joblib
    python train_model.py --output /path/to/dir    # custom output directory
    python -c "from train_model import train_and_save; train_and_save()"

Notes
-----
* The predictor uses RAW (unscaled) features so that predict.py can call
  the model directly without needing a separate scaler artifact.
* A balanced RandomForestClassifier handles the (likely) class imbalance
  produced by the clinical risk rules.
"""

from __future__ import annotations

import argparse
import sys
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
import joblib


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent
DEFAULT_CSV_PATH    = ML_DIR / 'training_data.csv'
DEFAULT_MODEL_PATH  = ML_DIR / 'model.joblib'

FEATURE_NAMES = [
    'pain_level',
    'temperature',
    'wound_condition',
    'symptoms_count',
    'medication_adherence',
    'surgery_type',
    'recovery_days',
]
TARGET_NAME  = 'risk_label'
LABEL_MAP    = {0: 'low', 1: 'medium', 2: 'high'}
RANDOM_STATE = 42
TEST_SIZE    = 0.20


# ---------------------------------------------------------------------------
# Data generation (inline, used when CSV is absent)
# ---------------------------------------------------------------------------

def _generate_data_inline(n_samples: int = 2000, noise_rate: float = 0.10,
                           random_state: int = RANDOM_STATE) -> pd.DataFrame:
    """Generate training data without requiring data_generator.py on sys.path."""
    rng = np.random.default_rng(random_state)

    pain   = rng.integers(0, 11, size=n_samples)
    temp   = np.round(rng.uniform(35.0, 40.5, size=n_samples), 1)
    wound  = rng.integers(0, 5,  size=n_samples)
    symp   = rng.integers(0, 9,  size=n_samples)
    med    = rng.integers(0, 3,  size=n_samples)
    stype  = rng.integers(0, 6,  size=n_samples)
    rdays  = rng.integers(1, 91, size=n_samples)

    labels = []
    for i in range(n_samples):
        if pain[i] >= 7 or temp[i] >= 38.5 or wound[i] >= 3 or (symp[i] >= 4 and med[i] == 2):
            labels.append(2)
        elif pain[i] >= 5 or temp[i] >= 37.8 or wound[i] >= 2 or symp[i] >= 2 or med[i] == 1:
            labels.append(1)
        else:
            labels.append(0)

    labels = np.array(labels, dtype=int)

    # 10% random label noise
    n_noisy = int(n_samples * noise_rate)
    noisy_idx = rng.choice(n_samples, size=n_noisy, replace=False)
    for idx in noisy_idx:
        others = [c for c in range(3) if c != labels[idx]]
        labels[idx] = rng.choice(others)

    return pd.DataFrame({
        'pain_level':           pain,
        'temperature':          temp,
        'wound_condition':      wound,
        'symptoms_count':       symp,
        'medication_adherence': med,
        'surgery_type':         stype,
        'recovery_days':        rdays,
        'risk_label':           labels,
    })


# ---------------------------------------------------------------------------
# Load / generate data
# ---------------------------------------------------------------------------

def _load_or_generate(csv_path: Path) -> pd.DataFrame:
    if csv_path.exists():
        print(f"[train] Loading data from '{csv_path}' ...")
        return pd.read_csv(csv_path)

    print(f"[train] '{csv_path}' not found - generating data inline ...")
    try:
        # Try importing data_generator if it is on sys.path
        sys.path.insert(0, str(csv_path.parent))
        from data_generator import generate_dataset  # type: ignore
        df = generate_dataset()
    except ImportError:
        df = _generate_data_inline()

    df.to_csv(csv_path, index=False)
    print(f"[train] Saved generated data -> '{csv_path}'")
    return df


# ---------------------------------------------------------------------------
# Evaluation helpers
# ---------------------------------------------------------------------------

def _print_metrics(y_true: np.ndarray, y_pred: np.ndarray,
                   split_name: str = 'Test') -> dict:
    acc  = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, average='weighted', zero_division=0)
    rec  = recall_score(y_true, y_pred, average='weighted', zero_division=0)
    f1   = f1_score(y_true, y_pred, average='weighted', zero_division=0)
    cm   = confusion_matrix(y_true, y_pred)

    print(f"\n{'='*55}")
    print(f"  {split_name} Set Evaluation")
    print(f"{'='*55}")
    print(f"  Accuracy  : {acc*100:.2f}%")
    print(f"  Precision : {prec*100:.2f}%  (weighted)")
    print(f"  Recall    : {rec*100:.2f}%  (weighted)")
    print(f"  F1 Score  : {f1*100:.2f}%  (weighted)")
    print(f"\n  Confusion Matrix (rows=actual, cols=predicted):")
    print(f"  Labels    : {list(LABEL_MAP.values())}")
    for i, row in enumerate(cm):
        print(f"  {LABEL_MAP[i]:8s}: {row.tolist()}")
    print(f"\n  Classification Report:")
    print(classification_report(y_true, y_pred,
                                target_names=[LABEL_MAP[i] for i in sorted(LABEL_MAP)],
                                zero_division=0))

    return {
        'accuracy':  round(acc,  4),
        'precision': round(prec, 4),
        'recall':    round(rec,  4),
        'f1':        round(f1,   4),
        'confusion_matrix': cm.tolist(),
    }


# ---------------------------------------------------------------------------
# Core training function
# ---------------------------------------------------------------------------

def train_and_save(
    output_path: str | Path | None = None,
    csv_path:    str | Path | None = None,
    n_estimators: int = 100,
) -> RandomForestClassifier:
    """
    Generate / load data, train a RandomForestClassifier, evaluate, and save.

    Parameters
    ----------
    output_path  : directory (or .joblib file path) to save the model.
                   Defaults to ml/model.joblib.
    csv_path     : path to training_data.csv.  Defaults to ml/training_data.csv.
    n_estimators : number of trees in the forest.

    Returns
    -------
    Trained RandomForestClassifier.
    """
    # ------------------------------------------------------------------
    # Resolve paths
    # ------------------------------------------------------------------
    csv_path = Path(csv_path) if csv_path else DEFAULT_CSV_PATH
    if output_path is None:
        model_path = DEFAULT_MODEL_PATH
    else:
        output_path = Path(output_path)
        model_path = (output_path / 'model.joblib'
                      if output_path.is_dir() or not output_path.suffix
                      else output_path)

    model_path.parent.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Data
    # ------------------------------------------------------------------
    df = _load_or_generate(csv_path)
    print(f"[train] Dataset shape : {df.shape}")
    print(f"[train] Class distribution:")
    for label, count in df[TARGET_NAME].value_counts().sort_index().items():
        print(f"         {LABEL_MAP[int(label)]:8s} ({label}): {count}")

    X = df[FEATURE_NAMES].values
    y = df[TARGET_NAME].values

    # NOTE: NO StandardScaler — raw features are used so predict.py can
    # call the model directly without loading a scaler artifact.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    print(f"\n[train] Train samples : {len(X_train)}")
    print(f"[train] Test  samples : {len(X_test)}")

    # ------------------------------------------------------------------
    # Model
    # ------------------------------------------------------------------
    print(f"\n[train] Training RandomForestClassifier "
          f"(n_estimators={n_estimators}, class_weight='balanced') ...")

    model = RandomForestClassifier(
        n_estimators=n_estimators,
        random_state=RANDOM_STATE,
        class_weight='balanced',
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------
    train_pred = model.predict(X_train)
    test_pred  = model.predict(X_test)

    _print_metrics(y_train, train_pred, split_name='Train')
    metrics = _print_metrics(y_test, test_pred, split_name='Test')

    # Feature importances
    print(f"\n  Feature Importances:")
    importances = model.feature_importances_
    for name, imp in sorted(zip(FEATURE_NAMES, importances),
                             key=lambda x: -x[1]):
        bar = '#' * int(imp * 50)
        print(f"  {name:25s}: {imp:.4f}  {bar}")

    # ------------------------------------------------------------------
    # Save model
    # ------------------------------------------------------------------
    model_meta = {
        'model':          model,
        'feature_names':  FEATURE_NAMES,
        'label_map':      LABEL_MAP,
        'metrics':        metrics,
        'n_estimators':   n_estimators,
        'random_state':   RANDOM_STATE,
    }
    joblib.dump(model_meta, model_path)
    print(f"\n[train] Model saved -> '{model_path}'")
    print(f"[train] Done [OK]")

    return model


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='Train PostCare AI risk classifier')
    p.add_argument('--output',       '-o', default=None,
                   help='Output directory or .joblib path (default: ml/model.joblib)')
    p.add_argument('--csv',          '-c', default=None,
                   help='Path to training_data.csv')
    p.add_argument('--n-estimators', '-n', type=int, default=100,
                   help='Number of trees (default: 100)')
    return p.parse_args()


if __name__ == '__main__':
    args = _parse_args()
    train_and_save(
        output_path=args.output,
        csv_path=args.csv,
        n_estimators=args.n_estimators,
    )
