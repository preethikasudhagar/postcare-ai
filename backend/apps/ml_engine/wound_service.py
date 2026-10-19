"""
apps/ml_engine/wound_service.py
--------------------------------
Service for automated wound image assessment.

Verifies the presence of a compatible Computer Vision model.
If no trained computer vision model artifact is present in the ml/ directory,
the service reports status as 'unavailable' with confidence=None, rather than
fabricating predictions or generating synthetic confidence numbers.
"""

import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Base directory for ML artifacts
ML_DIR = Path(__file__).resolve().parent.parent.parent.parent / 'ml'
WOUND_CV_MODEL_PATHS = [
    ML_DIR / 'wound_model.joblib',
    ML_DIR / 'wound_classifier.pt',
    ML_DIR / 'wound_model.onnx',
]

_CACHED_MODEL_PAYLOAD = None
_CACHED_MODEL_PATH = None


def assess_wound_image(image_path_or_file: Any, remarks: str = "") -> Dict[str, Any]:
    """
    Evaluates an uploaded wound photograph using a trained Computer Vision model if available.

    Returns:
        dict with keys:
            - 'status': 'completed' | 'unavailable' | 'failed'
            - 'assessment_result': 'good' | 'moderate' | 'poor' | 'unavailable'
            - 'confidence': float (0.0 - 1.0) or None
            - 'message': str
    """
    # 1. Validate image file existence and readability
    file_path = None
    if isinstance(image_path_or_file, (str, Path)):
        file_path = Path(image_path_or_file)
        if not file_path.exists():
            return {
                'status': 'failed',
                'assessment_result': 'failed',
                'confidence': None,
                'raw_probabilities': None,
                'message': f"Image file not found at path: {file_path}"
            }
    elif hasattr(image_path_or_file, 'path'):
        file_path = Path(image_path_or_file.path)
        if not file_path.exists():
            return {
                'status': 'failed',
                'assessment_result': 'failed',
                'confidence': None,
                'raw_probabilities': None,
                'message': "Stored image file does not exist on disk."
            }

    # 2. Check for an existing trained Computer Vision model
    cv_model_path: Optional[Path] = None
    for p in WOUND_CV_MODEL_PATHS:
        if p.exists():
            cv_model_path = p
            break

    if cv_model_path is None:
        # Note: ml/model.joblib is exclusively a tabular Random Forest classifier
        # for daily recovery check-in biometrics (pain, temp, adherence), NOT an image model.
        logger.info(
            "No trained Computer Vision wound classification model found in %s. "
            "Returning 'unavailable' without fabricating predictions.",
            ML_DIR
        )
        return {
            'status': 'unavailable',
            'assessment_result': 'unavailable',
            'confidence': None,
            'raw_probabilities': None,
            'message': (
                "Automated image assessment model is currently unavailable. "
                "Attending clinical review is required."
            )
        }

    # 3. Load genuine Computer Vision model and execute inference
    global _CACHED_MODEL_PAYLOAD, _CACHED_MODEL_PATH
    try:
        import sys
        if str(ML_DIR) not in sys.path:
            sys.path.insert(0, str(ML_DIR))

        from wound_features import extract_wound_features
        import joblib
        import numpy as np
        from PIL import Image

        # Cache model payload in memory to prevent repeated disk I/O on every request
        if _CACHED_MODEL_PAYLOAD is None or _CACHED_MODEL_PATH != cv_model_path:
            logger.info("Loading wound classification model from %s", cv_model_path)
            _CACHED_MODEL_PAYLOAD = joblib.load(cv_model_path)
            _CACHED_MODEL_PATH = cv_model_path

        payload = _CACHED_MODEL_PAYLOAD

        if not (isinstance(payload, dict) and 'model' in payload and 'label_map' in payload):
            return {
                'status': 'failed',
                'assessment_result': 'failed',
                'confidence': None,
                'raw_probabilities': None,
                'message': "Model artifact does not meet wound classification specifications."
            }

        clf = payload['model']
        scaler = payload.get('scaler')
        label_map = payload['label_map']
        thresholds = payload.get('thresholds', {'moderate': 0.20, 'poor': 0.08})
        safety_policy = payload.get('safety_policy', {})

        # Safety policy configuration parameters
        th_poor = float(thresholds.get('poor', 0.08))
        th_mod = float(thresholds.get('moderate', 0.20))
        cert_th_good = float(safety_policy.get('cert_th_good', 0.82))
        max_non_good_mass = float(safety_policy.get('max_non_good_mass', 0.18))
        erythema_outlier_th = float(safety_policy.get('erythema_outlier_th', 0.60))
        rg_diff_outlier_th = float(safety_policy.get('rg_diff_outlier_th', 0.16))
        margin_edge_outlier_th = float(safety_policy.get('margin_edge_outlier_th', 0.030))
        max_z_outlier_th = float(safety_policy.get('max_z_outlier_th', 3.8))

        # Validate that image is readable and not corrupt
        with Image.open(file_path) as test_img:
            test_img.verify()

        # Extract genuine computer vision features
        from wound_features import FEATURE_NAMES
        raw_feats = extract_wound_features(file_path).reshape(1, -1)
        feats_scaled = scaler.transform(raw_feats) if scaler is not None else raw_feats

        # Generate genuine class probabilities
        if hasattr(clf, 'predict_proba'):
            probs = clf.predict_proba(feats_scaled)[0]
            p_good = float(probs[0])
            p_mod = float(probs[1]) if len(probs) > 1 else 0.0
            p_poor = float(probs[2]) if len(probs) > 2 else 0.0
        else:
            pred_idx = int(clf.predict(feats_scaled)[0])
            p_good = 1.0 if pred_idx == 0 else 0.0
            p_mod = 1.0 if pred_idx == 1 else 0.0
            p_poor = 1.0 if pred_idx == 2 else 0.0

        raw_pred_idx = int(np.argmax([p_good, p_mod, p_poor]))
        raw_pred_label = label_map.get(raw_pred_idx, 'good')

        raw_probs = {
            'good': round(p_good, 4),
            'moderate': round(p_mod, 4),
            'poor': round(p_poor, 4),
            'raw_prediction': raw_pred_label,
        }

        # Indices for inflammatory and margin contrast features
        erythema_idx = FEATURE_NAMES.index("erythema_band_ratio")
        rg_diff_idx = FEATURE_NAMES.index("red_green_diff")
        margin_edge_idx = FEATURE_NAMES.index("margin_edge_contrast")

        erythema_val = float(raw_feats[0, erythema_idx])
        rg_diff_val = float(raw_feats[0, rg_diff_idx])
        margin_edge_val = float(raw_feats[0, margin_edge_idx])
        max_z_val = float(np.max(np.abs(feats_scaled[0])))

        # Clinical Decision Support Safety Policy:
        # Prevents uncalibrated, uninformative predictions (~76% base rate)
        # from presenting false reassurance on ambiguous or inflamed wounds.
        uncertainty_reason = None
        assessment_reason = ""
        if p_poor >= th_poor:
            result_label = 'poor'
            conf = p_poor
            assessment_reason = (
                f"Model output Poor class: High-acuity complication features detected exceeding urgency threshold "
                f"(P(poor) = {p_poor:.1%} >= {th_poor:.1%}). Prompt attending clinician evaluation required."
            )
        elif p_mod >= th_mod:
            result_label = 'moderate'
            conf = p_mod
            assessment_reason = (
                f"Model output Moderate class: Elevated risk indicators detected exceeding surveillance threshold "
                f"(P(moderate) = {p_mod:.1%} >= {th_mod:.1%}). Clinician review required within 48 hours."
            )
        elif (
            erythema_val > erythema_outlier_th
            or rg_diff_val > rg_diff_outlier_th
            or margin_edge_val > margin_edge_outlier_th
            or max_z_val > max_z_outlier_th
        ):
            result_label = 'uncertain'
            conf = None
            uncertainty_reason = "elevated_inflammatory_features_or_outlier"
            outlier_triggers = []
            if margin_edge_val > margin_edge_outlier_th:
                outlier_triggers.append(f"margin edge contrast={margin_edge_val:.4f} (limit {margin_edge_outlier_th:.4f})")
            if erythema_val > erythema_outlier_th:
                outlier_triggers.append(f"erythema ratio={erythema_val:.2f} (limit {erythema_outlier_th:.2f})")
            if rg_diff_val > rg_diff_outlier_th:
                outlier_triggers.append(f"red-green diff={rg_diff_val:.3f} (limit {rg_diff_outlier_th:.3f})")
            if max_z_val > max_z_outlier_th:
                outlier_triggers.append(f"max feature Z-score={max_z_val:.2f} (limit {max_z_outlier_th:.1f})")

            trigger_str = ", ".join(outlier_triggers)
            assessment_reason = (
                f"Assessment Uncertain (Clinician Review Required): Wound features [{trigger_str}] "
                f"lie outside the validated closed-incision training distribution. "
                f"Raw model probability ({p_good:.1%} Good) reflects uncalibrated majority-class training baseline "
                f"on out-of-distribution wound appearance and cannot be used to establish safety. "
                f"Attending clinician evaluation is mandatory."
            )
        elif p_good < cert_th_good or (p_mod + p_poor) > max_non_good_mass:
            result_label = 'uncertain'
            conf = None
            uncertainty_reason = "posterior_probability_ambiguity"
            assessment_reason = (
                f"Assessment Uncertain (Clinician Review Required): Posterior model probabilities are ambiguous "
                f"(P(good) = {p_good:.1%}, combined non-good mass = {(p_mod + p_poor):.1%} > {max_non_good_mass:.1%}). "
                f"Automated screening cannot rule out complications; attending clinician review required."
            )
        else:
            result_label = 'good'
            conf = p_good
            assessment_reason = (
                f"Screening output Good class: Routine healing screening within validated closed-incision boundaries "
                f"(P(good) = {p_good:.1%}). Automated screening does not establish clinical safety; "
                f"attending clinician review still required."
            )

        conf_rounded = round(conf, 4) if conf is not None else None

        clinical_messages = {
            'good': "Screening output: Good class — Attending clinician review still required. Automated screening does not replace medical evaluation.",
            'moderate': "Model output: Moderate class — Clinician review required within 48 hours for erythema/exudate monitoring.",
            'poor': "Model output: Poor class — Prompt clinical assessment required for potential wound complication.",
            'uncertain': "Assessment uncertain — Clinician review required. Image presents ambiguous or elevated inflammatory features that cannot be cleared by automated screening.",
        }
        msg = clinical_messages.get(result_label, f"Automated assessment: {result_label}.")

        logger.info(
            "Wound inference completed for %s: result=%s, confidence=%s, raw_probs=%s",
            file_path.name,
            result_label,
            conf_rounded,
            raw_probs,
        )
        return {
            'status': 'completed',
            'assessment_result': result_label,
            'confidence': conf_rounded,
            'raw_prediction': raw_pred_label,
            'raw_probabilities': raw_probs,
            'uncertainty_reason': uncertainty_reason,
            'assessment_reason': assessment_reason,
            'message': msg,
        }

    except Exception as exc:
        logger.error("Wound image inference failed on %s: %s", file_path, exc, exc_info=True)
        return {
            'status': 'failed',
            'assessment_result': 'failed',
            'confidence': None,
            'raw_probabilities': None,
            'message': f"Inference engine failure: {str(exc)}",
        }

