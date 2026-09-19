"""
ml/data_generator.py
--------------------
Generates a synthetic training dataset (2000 rows) for PostCare AI risk classification.

Columns
-------
pain_level           : int   0-10
temperature          : float 35.0-40.5
wound_condition      : int   0=normal, 1=mild_redness, 2=swelling, 3=discharge, 4=severe
symptoms_count       : int   0-8
medication_adherence : int   0=all, 1=some, 2=none
surgery_type         : int   0-5
recovery_days        : int   1-90
risk_label           : int   0=low, 1=medium, 2=high

Risk label rules (clinical plausibility)
-----------------------------------------
high   : pain >= 7  OR  temp >= 38.5  OR  wound >= 3  OR  (symptoms_count >= 4 AND med_adherence == 2)
medium : pain >= 5  OR  temp >= 37.8  OR  wound >= 2  OR  symptoms_count >= 2  OR  med_adherence == 1
low    : otherwise

10% random label noise is applied for realism.
"""

import numpy as np
import pandas as pd
from pathlib import Path


# ---------------------------------------------------------------------------
# Seed for reproducibility
# ---------------------------------------------------------------------------
RNG_SEED = 42
N_SAMPLES = 2000
NOISE_RATE = 0.10          # fraction of labels randomly flipped
N_CLASSES = 3              # 0=low, 1=medium, 2=high


def _assign_risk(pain: int, temp: float, wound: int,
                 symptoms: int, med_adh: int) -> int:
    """Apply deterministic clinical risk rules and return 0/1/2."""
    if (pain >= 7
            or temp >= 38.5
            or wound >= 3
            or (symptoms >= 4 and med_adh == 2)):
        return 2  # high

    if (pain >= 5
            or temp >= 37.8
            or wound >= 2
            or symptoms >= 2
            or med_adh == 1):
        return 1  # medium

    return 0  # low


def generate_dataset(n_samples: int = N_SAMPLES,
                     noise_rate: float = NOISE_RATE,
                     random_state: int = RNG_SEED) -> pd.DataFrame:
    """
    Generate a synthetic PostCare AI training dataset.

    Parameters
    ----------
    n_samples    : number of rows to generate
    noise_rate   : fraction of labels randomly flipped for realism
    random_state : NumPy random seed

    Returns
    -------
    pd.DataFrame with columns described in module docstring.
    """
    rng = np.random.default_rng(random_state)

    # ------------------------------------------------------------------
    # Sample raw features
    # ------------------------------------------------------------------
    pain_level = rng.integers(0, 11, size=n_samples)                    # 0-10 inclusive
    temperature = np.round(rng.uniform(35.0, 40.5, size=n_samples), 1) # one decimal
    wound_condition = rng.integers(0, 5, size=n_samples)                # 0-4 inclusive
    symptoms_count = rng.integers(0, 9, size=n_samples)                 # 0-8 inclusive
    medication_adherence = rng.integers(0, 3, size=n_samples)           # 0-2 inclusive
    surgery_type = rng.integers(0, 6, size=n_samples)                   # 0-5 inclusive
    recovery_days = rng.integers(1, 91, size=n_samples)                 # 1-90 inclusive

    # ------------------------------------------------------------------
    # Assign deterministic risk labels
    # ------------------------------------------------------------------
    risk_label = np.array([
        _assign_risk(pain_level[i], temperature[i], wound_condition[i],
                     symptoms_count[i], medication_adherence[i])
        for i in range(n_samples)
    ], dtype=int)

    # ------------------------------------------------------------------
    # Add ~10% label noise (random flip to a different class)
    # ------------------------------------------------------------------
    n_noisy = int(n_samples * noise_rate)
    noisy_indices = rng.choice(n_samples, size=n_noisy, replace=False)
    for idx in noisy_indices:
        other_classes = [c for c in range(N_CLASSES) if c != risk_label[idx]]
        risk_label[idx] = rng.choice(other_classes)

    # ------------------------------------------------------------------
    # Assemble DataFrame
    # ------------------------------------------------------------------
    df = pd.DataFrame({
        'pain_level':           pain_level,
        'temperature':          temperature,
        'wound_condition':      wound_condition,
        'symptoms_count':       symptoms_count,
        'medication_adherence': medication_adherence,
        'surgery_type':         surgery_type,
        'recovery_days':        recovery_days,
        'risk_label':           risk_label,
    })

    return df


def save_dataset(output_path: str | Path | None = None,
                 n_samples: int = N_SAMPLES,
                 noise_rate: float = NOISE_RATE,
                 random_state: int = RNG_SEED) -> Path:
    """
    Generate and save the dataset to CSV.

    Parameters
    ----------
    output_path  : destination path; defaults to ml/training_data.csv
                   relative to the repository root
    n_samples    : see generate_dataset()
    noise_rate   : see generate_dataset()
    random_state : see generate_dataset()

    Returns
    -------
    Absolute Path of the saved CSV file.
    """
    if output_path is None:
        # Resolve relative to this file: ml/ -> training_data.csv
        output_path = Path(__file__).resolve().parent / 'training_data.csv'
    else:
        output_path = Path(output_path).resolve()

    # Create parent directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)

    df = generate_dataset(n_samples=n_samples,
                          noise_rate=noise_rate,
                          random_state=random_state)

    df.to_csv(output_path, index=False)

    # Summary statistics
    print(f"[data_generator] Dataset saved → {output_path}")
    print(f"[data_generator] Shape: {df.shape}")
    print(f"[data_generator] Risk label distribution:")
    label_map = {0: 'low', 1: 'medium', 2: 'high'}
    for label, count in df['risk_label'].value_counts().sort_index().items():
        print(f"  {label_map[label]:8s} ({label}): {count:4d}  ({count/len(df)*100:.1f}%)")

    return output_path


if __name__ == '__main__':
    save_dataset()
