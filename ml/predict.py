"""
ml/predict.py
-------------
Standalone prediction module for PostCare AI.

Public API
----------
    predict(features_dict) -> dict
    predict_batch(list_of_feature_dicts) -> list[dict]
    load_model() -> dict  (lazy-loaded, cached)

Input Feature Dictionary Keys
------------------------------
    pain_level           : int   0-10
    temperature          : float 35.0-40.5
    wound_condition      : int   0=normal, 1=mild_redness, 2=swelling, 3=discharge, 4=severe
    symptoms_count       : int   0-8
    medication_adherence : int   0=all, 1=some, 2=none
    surgery_type         : int   0-5
    recovery_days        : int   1-90

Output Dictionary
-----------------
    risk_level           : str   'low' | 'medium' | 'high'
    risk_score           : int   0 | 1 | 2
    confidence           : float 0.0-1.0  (max class probability)
    probabilities        : dict  {'low': float, 'medium': float, 'high': float}
    contributing_factors : list[str]   top features that drove the prediction
    recommendation       : str   clinical recommendation text
    warnings             : list[str]  any input-validation warnings
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
ML_DIR             = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = ML_DIR / 'model.joblib'

FEATURE_NAMES = [
    'pain_level',
    'temperature',
    'wound_condition',
    'symptoms_count',
    'medication_adherence',
    'surgery_type',
    'recovery_days',
]

LABEL_MAP = {0: 'low', 1: 'medium', 2: 'high'}

FEATURE_RANGES = {
    'pain_level':           (0,    10),
    'temperature':          (35.0, 40.5),
    'wound_condition':      (0,    4),
    'symptoms_count':       (0,    8),
    'medication_adherence': (0,    2),
    'surgery_type':         (0,    5),
    'recovery_days':        (1,    90),
}

# Clinical recommendation templates
RECOMMENDATIONS: dict[str, str] = {
    'low':    (
        "Your recovery is progressing well. Continue following your prescribed "
        "medication schedule and attend your next scheduled follow-up. Contact "
        "your care team if you notice any changes in your condition."
    ),
    'medium': (
        "Some concerning indicators have been detected. Please contact your "
        "healthcare provider within 24 hours for a review. Ensure you are taking "
        "all medications as prescribed and monitor your symptoms closely. If "
        "symptoms worsen, seek medical attention immediately."
    ),
    'high':   (
        "URGENT: High-risk indicators detected. Please contact your healthcare "
        "provider or seek emergency medical attention immediately. Do not delay "
        "seeking help. This may indicate a post-operative complication that "
        "requires prompt medical evaluation."
    ),
}

# Human-readable feature labels for contributing factors
FEATURE_LABELS: dict[str, str] = {
    'pain_level':           'Pain Level',
    'temperature':          'Body Temperature',
    'wound_condition':      'Wound Condition',
    'symptoms_count':       'Number of Symptoms',
    'medication_adherence': 'Medication Adherence',
    'surgery_type':         'Surgery Type',
    'recovery_days':        'Days Since Surgery',
}

# ---------------------------------------------------------------------------
# Model cache (module-level singleton)
# ---------------------------------------------------------------------------
_MODEL_CACHE: dict | None = None


def load_model(model_path: str | Path | None = None) -> dict:
    """
    Load and cache the trained model from disk.

    Parameters
    ----------
    model_path : path to model.joblib; defaults to ml/model.joblib

    Returns
    -------
    dict with keys: model, feature_names, label_map, metrics, …

    Raises
    ------
    FileNotFoundError if the model file does not exist.
    """
    global _MODEL_CACHE

    if model_path is None:
        model_path = DEFAULT_MODEL_PATH
    model_path = Path(model_path)

    # Return cached model if same path was loaded before
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model file not found at '{model_path}'. "
            "Run 'python ml/train_model.py' to train and save the model first."
        )

    import joblib
    _MODEL_CACHE = joblib.load(model_path)
    logger.info("Model loaded from '%s'", model_path)
    return _MODEL_CACHE


def _validate_features(features_dict: dict) -> tuple[list, list[str]]:
    """
    Validate and extract feature values in the correct order.

    Returns
    -------
    (feature_values, warnings)
    """
    warnings: list[str] = []
    values: list[float] = []

    for feat in FEATURE_NAMES:
        if feat not in features_dict:
            raise ValueError(
                f"Missing required feature: '{feat}'. "
                f"Expected keys: {FEATURE_NAMES}"
            )

        raw = features_dict[feat]
        try:
            val = float(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Feature '{feat}' must be numeric, got {type(raw).__name__!r}"
            ) from exc

        lo, hi = FEATURE_RANGES[feat]
        if not (lo <= val <= hi):
            warnings.append(
                f"'{feat}' value {val} is outside expected range [{lo}, {hi}]."
            )

        values.append(val)

    return values, warnings


def _get_contributing_factors(
    model_meta: dict,
    feature_values: list[float],
    top_n: int = 3,
) -> list[str]:
    """
    Identify the top feature contributors using global importance × local value.

    Returns a list of human-readable strings describing the main contributors.
    """
    importances: np.ndarray = model_meta['model'].feature_importances_
    feature_names = model_meta.get('feature_names', FEATURE_NAMES)

    # Simple weighted scoring: importance × normalised feature value
    scores = []
    for i, (feat, val) in enumerate(zip(feature_names, feature_values)):
        lo, hi = FEATURE_RANGES.get(feat, (0, 1))
        range_size = hi - lo or 1
        normalised = (val - lo) / range_size      # 0-1
        scores.append((importances[i] * normalised, feat, val))

    # Sort descending by weighted score
    scores.sort(key=lambda x: -x[0])

    factors = []
    wound_map  = {0: 'Normal', 1: 'Mild redness', 2: 'Swelling',
                  3: 'Discharge', 4: 'Severe condition'}
    adh_map    = {0: 'Full adherence', 1: 'Partial adherence', 2: 'No adherence'}

    for _, feat, val in scores[:top_n]:
        label = FEATURE_LABELS.get(feat, feat)
        if feat == 'wound_condition':
            desc = wound_map.get(int(val), str(val))
            factors.append(f"{label}: {desc}")
        elif feat == 'medication_adherence':
            desc = adh_map.get(int(val), str(val))
            factors.append(f"{label}: {desc}")
        elif feat == 'temperature':
            factors.append(f"{label}: {val:.1f}°C")
        elif feat == 'pain_level':
            factors.append(f"{label}: {int(val)}/10")
        else:
            factors.append(f"{label}: {int(val)}")

    return factors


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict(
    features_dict: dict[str, Any],
    model_path: str | Path | None = None,
) -> dict:
    """
    Predict post-operative risk for a single patient observation.

    Parameters
    ----------
    features_dict : dict with keys matching FEATURE_NAMES
    model_path    : optional override for model.joblib location

    Returns
    -------
    dict with keys:
        risk_level, risk_score, confidence, probabilities,
        contributing_factors, recommendation, warnings
    """
    model_meta = load_model(model_path)
    clf        = model_meta['model']

    feature_values, input_warnings = _validate_features(features_dict)

    X = np.array(feature_values, dtype=float).reshape(1, -1)

    # Raw prediction + probabilities
    pred_label: int       = int(clf.predict(X)[0])
    proba: np.ndarray     = clf.predict_proba(X)[0]  # shape (n_classes,)

    # Align probabilities to {0:low, 1:medium, 2:high}
    classes: list[int] = list(clf.classes_)
    prob_dict: dict[str, float] = {
        LABEL_MAP[c]: round(float(proba[i]), 4)
        for i, c in enumerate(classes)
    }
    # Ensure all three keys exist
    for lbl in LABEL_MAP.values():
        prob_dict.setdefault(lbl, 0.0)

    confidence = round(float(proba[classes.index(pred_label)]), 4)
    risk_level = LABEL_MAP[pred_label]

    contributing_factors = _get_contributing_factors(
        model_meta, feature_values, top_n=3
    )
    recommendation = RECOMMENDATIONS[risk_level]

    return {
        'risk_level':           risk_level,
        'risk_score':           pred_label,
        'confidence':           confidence,
        'probabilities':        prob_dict,
        'contributing_factors': contributing_factors,
        'recommendation':       recommendation,
        'warnings':             input_warnings,
    }


def predict_batch(
    feature_dicts: list[dict[str, Any]],
    model_path: str | Path | None = None,
) -> list[dict]:
    """
    Predict risk for a list of patient observations (efficient batch call).

    Parameters
    ----------
    feature_dicts : list of feature dictionaries
    model_path    : optional override for model.joblib location

    Returns
    -------
    list of prediction dicts (same structure as predict())
    """
    if not feature_dicts:
        return []

    model_meta = load_model(model_path)
    clf        = model_meta['model']

    all_values: list[list[float]] = []
    all_warnings: list[list[str]] = []

    for fd in feature_dicts:
        vals, warns = _validate_features(fd)
        all_values.append(vals)
        all_warnings.append(warns)

    X         = np.array(all_values, dtype=float)
    pred_lbls = clf.predict(X).tolist()
    probas    = clf.predict_proba(X)
    classes   = list(clf.classes_)

    results = []
    for i, (pred_label, proba_row) in enumerate(zip(pred_lbls, probas)):
        prob_dict: dict[str, float] = {
            LABEL_MAP[c]: round(float(proba_row[j]), 4)
            for j, c in enumerate(classes)
        }
        for lbl in LABEL_MAP.values():
            prob_dict.setdefault(lbl, 0.0)

        confidence = round(float(proba_row[classes.index(pred_label)]), 4)
        risk_level = LABEL_MAP[pred_label]

        contributing_factors = _get_contributing_factors(
            model_meta, all_values[i], top_n=3
        )

        results.append({
            'risk_level':           risk_level,
            'risk_score':           int(pred_label),
            'confidence':           confidence,
            'probabilities':        prob_dict,
            'contributing_factors': contributing_factors,
            'recommendation':       RECOMMENDATIONS[risk_level],
            'warnings':             all_warnings[i],
        })

    return results


def reload_model() -> None:
    """Force reload the model from disk (clears the cache)."""
    global _MODEL_CACHE
    _MODEL_CACHE = None
    logger.info("Model cache cleared — will reload on next predict() call.")


# ---------------------------------------------------------------------------
# Quick CLI test
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    import json

    test_cases = [
        {   # Expected: low risk
            'pain_level': 2, 'temperature': 36.8, 'wound_condition': 0,
            'symptoms_count': 1, 'medication_adherence': 0,
            'surgery_type': 1, 'recovery_days': 10,
        },
        {   # Expected: medium risk
            'pain_level': 5, 'temperature': 37.9, 'wound_condition': 2,
            'symptoms_count': 3, 'medication_adherence': 1,
            'surgery_type': 2, 'recovery_days': 20,
        },
        {   # Expected: high risk
            'pain_level': 8, 'temperature': 39.2, 'wound_condition': 3,
            'symptoms_count': 5, 'medication_adherence': 2,
            'surgery_type': 3, 'recovery_days': 5,
        },
    ]

    print("PostCare AI — Prediction Demo\n" + "=" * 45)
    for i, tc in enumerate(test_cases, 1):
        print(f"\nTest Case {i}:")
        print(f"  Input: {tc}")
        try:
            result = predict(tc)
            print(f"  Risk Level  : {result['risk_level'].upper()}")
            print(f"  Confidence  : {result['confidence']*100:.1f}%")
            print(f"  Probabilities:")
            for k, v in result['probabilities'].items():
                print(f"    {k:8s}: {v*100:.1f}%")
            print(f"  Contributing Factors:")
            for f in result['contributing_factors']:
                print(f"    - {f}")
            print(f"  Recommendation: {result['recommendation'][:80]}…")
        except FileNotFoundError as e:
            print(f"  ERROR: {e}")
            print("  Run: python train_model.py  to train the model first.")
            break
