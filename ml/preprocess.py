"""
ml/preprocess.py
----------------
Preprocessing pipeline for PostCare AI risk classifier.

Steps
-----
1. Load ml/training_data.csv (generates it first if missing).
2. Select all 7 input features.
3. Apply StandardScaler to continuous features: temperature, recovery_days.
4. Perform stratified 80/20 train/test split.
5. Return (X_train, X_test, y_train, y_test, scaler, feature_names).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent
DEFAULT_CSV_PATH = ML_DIR / 'training_data.csv'

FEATURE_NAMES = [
    'pain_level',
    'temperature',
    'wound_condition',
    'symptoms_count',
    'medication_adherence',
    'surgery_type',
    'recovery_days',
]
TARGET_NAME = 'risk_label'

# Only these continuous features are scaled
CONTINUOUS_FEATURES = ['temperature', 'recovery_days']

RANDOM_STATE = 42
TEST_SIZE = 0.20


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_data(csv_path: str | Path | None = None) -> pd.DataFrame:
    """
    Load the training CSV.  If the file does not exist, auto-generate it.

    Parameters
    ----------
    csv_path : path to training_data.csv; defaults to ml/training_data.csv

    Returns
    -------
    pd.DataFrame
    """
    if csv_path is None:
        csv_path = DEFAULT_CSV_PATH
    csv_path = Path(csv_path)

    if not csv_path.exists():
        print(f"[preprocess] '{csv_path}' not found — generating dataset …")
        from data_generator import save_dataset
        save_dataset(output_path=csv_path)

    df = pd.read_csv(csv_path)
    print(f"[preprocess] Loaded {len(df)} rows from '{csv_path}'.")
    return df


def build_pipeline(
    csv_path: str | Path | None = None,
    scale_continuous: bool = True,
    random_state: int = RANDOM_STATE,
    test_size: float = TEST_SIZE,
) -> tuple[
    np.ndarray, np.ndarray,
    np.ndarray, np.ndarray,
    StandardScaler | None,
    list[str],
]:
    """
    Full preprocessing pipeline.

    Parameters
    ----------
    csv_path         : path to training CSV
    scale_continuous : whether to apply StandardScaler to continuous features
    random_state     : split seed
    test_size        : fraction of data to hold out for testing

    Returns
    -------
    X_train, X_test, y_train, y_test, scaler, feature_names

    Notes
    -----
    * When scale_continuous=True, temperature and recovery_days are
      fitted on the training split and applied to both splits.
    * When scale_continuous=False, scaler is None (raw features).
    """
    df = load_data(csv_path)

    X: np.ndarray = df[FEATURE_NAMES].values
    y: np.ndarray = df[TARGET_NAME].values

    # Stratified split so class proportions are preserved
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )

    scaler: StandardScaler | None = None

    if scale_continuous:
        # Identify column indices for continuous features
        continuous_indices = [FEATURE_NAMES.index(f) for f in CONTINUOUS_FEATURES]

        scaler = StandardScaler()
        X_train_scaled = X_train.copy().astype(float)
        X_test_scaled  = X_test.copy().astype(float)

        X_train_scaled[:, continuous_indices] = scaler.fit_transform(
            X_train[:, continuous_indices]
        )
        X_test_scaled[:, continuous_indices] = scaler.transform(
            X_test[:, continuous_indices]
        )

        X_train = X_train_scaled
        X_test  = X_test_scaled

    print(f"[preprocess] Train: {X_train.shape}  Test: {X_test.shape}")
    print(f"[preprocess] y_train class distribution: "
          f"{ {int(c): int(n) for c, n in zip(*np.unique(y_train, return_counts=True))} }")
    print(f"[preprocess] y_test  class distribution: "
          f"{ {int(c): int(n) for c, n in zip(*np.unique(y_test,  return_counts=True))} }")

    return X_train, X_test, y_train, y_test, scaler, FEATURE_NAMES


# ---------------------------------------------------------------------------
# Convenience wrapper (keeps backward-compat signature)
# ---------------------------------------------------------------------------

def preprocess(
    csv_path: str | Path | None = None,
    scale_continuous: bool = True,
    random_state: int = RANDOM_STATE,
    test_size: float = TEST_SIZE,
) -> tuple:
    """
    Alias for build_pipeline().  Returns the same 6-tuple.
    """
    return build_pipeline(
        csv_path=csv_path,
        scale_continuous=scale_continuous,
        random_state=random_state,
        test_size=test_size,
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    X_train, X_test, y_train, y_test, scaler, features = preprocess()
    print(f"Features: {features}")
    print(f"Scaler:   {scaler}")
