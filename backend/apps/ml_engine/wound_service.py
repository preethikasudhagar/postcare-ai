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

# Candidate paths for ML artifacts
def get_wound_cv_model_path() -> Optional[Path]:
    candidate_dirs = [
        Path(__file__).resolve().parent.parent.parent.parent / 'ml',
        Path.cwd() / 'ml',
        Path.cwd().parent / 'ml',
    ]
    try:
        from django.conf import settings
        base = Path(settings.BASE_DIR)
        candidate_dirs.extend([base.parent / 'ml', base / 'ml'])
    except Exception:
        pass

    for d in candidate_dirs:
        for fname in ['wound_model.joblib', 'wound_classifier.pt', 'wound_model.onnx']:
            p = d / fname
            if p.exists():
                return p
    return None

ML_DIR = Path(__file__).resolve().parent.parent.parent.parent / 'ml'
_CACHED_MODEL_PAYLOAD = None
_CACHED_MODEL_PATH = None


def assess_wound_image(
    image_path_or_file: Any, 
    remarks: str = "", 
    previous_assessment: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Evaluates an uploaded wound photograph using a trained Computer Vision model if available.
    Assesses:
      - Image quality & wound visibility
      - Visible redness (erythema)
      - Swelling / edema indicators
      - Wound-edge appearance
      - Visible discharge / slough / exudate
      - Longitudinal changes compared with previous uploaded images

    Returns:
        dict with keys:
            - 'status': 'completed' | 'unavailable' | 'failed'
            - 'assessment_result': 'good' | 'moderate' | 'poor' | 'uncertain' | 'unavailable' | 'failed'
            - 'confidence': float (0.0 - 1.0) or None
            - 'ai_observations': dict with detailed clinical observation metrics
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
                'ai_observations': {
                    'status': 'failed',
                    'message': f"Image file not found at path: {file_path}",
                },
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
                'ai_observations': {
                    'status': 'failed',
                    'message': "Stored image file does not exist on disk.",
                },
                'message': "Stored image file does not exist on disk."
            }
    elif hasattr(image_path_or_file, 'file'):
        file_path = image_path_or_file.file
    else:
        file_path = image_path_or_file

    # 2. Check for an existing trained Computer Vision model
    cv_model_path: Optional[Path] = get_wound_cv_model_path()

    if cv_model_path is None:
        logger.info(
            "No trained Computer Vision wound classification model found. "
            "Returning 'unavailable' without fabricating predictions."
        )
        return {
            'status': 'unavailable',
            'assessment_result': 'unavailable',
            'confidence': None,
            'raw_probabilities': None,
            'ai_observations': {
                'status': 'unavailable',
                'message': "AI analysis is currently unavailable. Awaiting clinician review.",
                'disclaimer': "AI decision support is currently unavailable. Attending clinician evaluation required."
            },
            'message': "AI analysis is currently unavailable. Awaiting clinician review."
        }

    # 3. Load genuine Computer Vision model and execute inference
    global _CACHED_MODEL_PAYLOAD, _CACHED_MODEL_PATH
    try:
        import sys
        if str(ML_DIR) not in sys.path:
            sys.path.insert(0, str(ML_DIR))

        from wound_features import extract_wound_features, FEATURE_NAMES
        import joblib
        import numpy as np
        from PIL import Image

        # Validate that image is readable and not corrupt
        with Image.open(file_path) as test_img:
            test_img.verify()

        # Reopen after verify
        with Image.open(file_path) as pil_img:
            pil_rgb = pil_img.convert("RGB")
            w, h = pil_rgb.size
            gray_arr = np.array(pil_rgb.convert("L"), dtype=np.float32) / 255.0

        # --- A. Assess Image Quality & Visibility ---
        mean_brightness = float(np.mean(gray_arr))
        contrast_std = float(np.std(gray_arr))
        
        # Discrete Laplacian variance to assess sharpness / blur
        if gray_arr.shape[0] > 4 and gray_arr.shape[1] > 4:
            laplacian = (
                -4.0 * gray_arr[1:-1, 1:-1]
                + gray_arr[:-2, 1:-1]
                + gray_arr[2:, 1:-1]
                + gray_arr[1:-1, :-2]
                + gray_arr[1:-1, 2:]
            )
            blur_var = float(np.var(laplacian))
        else:
            blur_var = 0.0

        is_acceptable = True
        quality_issues = []
        if w < 120 or h < 120:
            is_acceptable = False
            quality_issues.append("Low resolution photo")
        if mean_brightness < 0.14:
            is_acceptable = False
            quality_issues.append("Underexposed / too dark")
        elif mean_brightness > 0.88:
            is_acceptable = False
            quality_issues.append("Overexposed / glare washed out incision details")
        if blur_var < 0.00035:
            is_acceptable = False
            quality_issues.append("Blurry or out of focus")
        if contrast_std < 0.06:
            is_acceptable = False
            quality_issues.append("Low tonal contrast")

        if quality_issues:
            quality_flag = 'suboptimal'
            quality_notes = f"Image quality advisory: {', '.join(quality_issues)}. Wound may not be clearly visible. Attending clinician inspection required."
        else:
            quality_flag = 'good'
            quality_notes = "Image clarity, illumination, and contrast are adequate for computer-vision feature extraction."

        image_quality = {
            'is_acceptable': is_acceptable,
            'quality_flag': quality_flag,
            'blur_score': round(blur_var * 10000, 2),
            'brightness_mean': round(mean_brightness, 3),
            'contrast_std': round(contrast_std, 3),
            'resolution': f"{w}x{h}",
            'quality_notes': quality_notes
        }

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
                'ai_observations': {'status': 'failed', 'message': 'Model artifact does not meet wound classification specifications.'},
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

        # Extract genuine computer vision features
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
        slough_idx = FEATURE_NAMES.index("slough_band_ratio")
        necrotic_idx = FEATURE_NAMES.index("necrotic_band_ratio")
        roughness_idx = FEATURE_NAMES.index("texture_roughness_mean")
        margin_erythema_idx = FEATURE_NAMES.index("margin_erythema_contrast")

        erythema_val = float(raw_feats[0, erythema_idx])
        rg_diff_val = float(raw_feats[0, rg_diff_idx])
        margin_edge_val = float(raw_feats[0, margin_edge_idx])
        slough_val = float(raw_feats[0, slough_idx])
        necrotic_val = float(raw_feats[0, necrotic_idx])
        roughness_val = float(raw_feats[0, roughness_idx])
        margin_erythema_val = float(raw_feats[0, margin_erythema_idx])
        max_z_val = float(np.max(np.abs(feats_scaled[0])))

        # Clinical Decision Support Safety Policy
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

        # --- B. Assess Visible Redness (Erythema) ---
        if erythema_val < 0.15:
            redness_level = 'normal'
            redness_desc = f"Normal periwound tissue coloration (erythema band index: {erythema_val:.2f}). No significant inflammatory redness detected."
        elif erythema_val < 0.35:
            redness_level = 'mild_to_moderate'
            redness_desc = f"Mild to moderate periwound redness detected (erythema band index: {erythema_val:.2f}). Monitor for spreading inflammation."
        else:
            redness_level = 'elevated'
            redness_desc = f"Conspicuous periwound erythema detected (erythema band index: {erythema_val:.2f} > 0.35). High inflammatory index."

        redness_obs = {
            'level': redness_level,
            'erythema_band_ratio': round(erythema_val, 3),
            'red_green_diff': round(rg_diff_val, 3),
            'margin_erythema_contrast': round(margin_erythema_val, 3),
            'description': redness_desc
        }

        # --- C. Assess Swelling / Edema Indicators ---
        if roughness_val < 0.08:
            swelling_level = 'minimal'
            swelling_desc = f"Incision margins appear flat without conspicuous tissue elevation (surface roughness: {roughness_val:.3f})."
        elif roughness_val < 0.16:
            swelling_level = 'mild'
            swelling_desc = f"Mild localized tissue puffiness / edema indicated along the wound bed (surface roughness: {roughness_val:.3f})."
        else:
            swelling_level = 'conspicuous'
            swelling_desc = f"Conspicuous tissue swelling / bulging contour indicated along wound margin (surface roughness: {roughness_val:.3f} >= 0.16)."

        swelling_obs = {
            'level': swelling_level,
            'roughness_index': round(roughness_val, 3),
            'description': swelling_desc
        }

        # --- D. Assess Wound-Edge Appearance ---
        if margin_edge_val <= 0.015:
            edge_alignment = 'well_approximated'
            edge_desc = f"Incision edges appear closely approximated with clean margin continuity (edge contrast: {margin_edge_val:.4f})."
        elif margin_edge_val <= 0.030:
            edge_alignment = 'slightly_irregular'
            edge_desc = f"Slight margin irregularity observed along the incision border (edge contrast: {margin_edge_val:.4f})."
        else:
            edge_alignment = 'separated_or_gapping'
            edge_desc = f"Elevated margin edge contrast detected ({margin_edge_val:.4f} > 0.030); potential edge separation, dehiscence, or gaping."

        edge_obs = {
            'alignment': edge_alignment,
            'margin_edge_contrast': round(margin_edge_val, 4),
            'description': edge_desc
        }

        # --- E. Assess Visible Discharge / Exudate ---
        if slough_val < 0.05 and necrotic_val < 0.02:
            discharge_level = 'none_detected'
            discharge_desc = "No visible purulent exudate, slough, or necrotic tissue detected in the incision bed."
        elif slough_val < 0.15:
            discharge_level = 'trace_exudate'
            discharge_desc = f"Trace pale/fibrinous exudate markers observed (slough band index: {slough_val:.3f}). Keep clean and dry."
        else:
            discharge_level = 'conspicuous_discharge'
            discharge_desc = f"Conspicuous yellowish/creamy fluid indicators detected (slough band index: {slough_val:.3f} >= 0.15); clinical review required."

        discharge_obs = {
            'level': discharge_level,
            'slough_band_ratio': round(slough_val, 3),
            'necrotic_band_ratio': round(necrotic_val, 3),
            'description': discharge_desc
        }

        # --- F. Changes Compared With Previous Uploaded Images ---
        comparison_obs = {
            'has_previous': False,
            'comparison_summary': "Baseline wound photograph. Subsequent uploads will be compared against this initial assessment.",
            'overall_trend': "baseline"
        }

        if previous_assessment is not None:
            prev_obs = getattr(previous_assessment, 'ai_observations', None)
            if isinstance(prev_obs, dict) and prev_obs.get('redness'):
                prev_erythema = prev_obs.get('redness', {}).get('erythema_band_ratio', None)
                prev_roughness = prev_obs.get('swelling', {}).get('roughness_index', None)
                prev_edge = prev_obs.get('wound_edges', {}).get('margin_edge_contrast', None)
                prev_slough = prev_obs.get('discharge', {}).get('slough_band_ratio', None)
                prev_date = getattr(previous_assessment, 'upload_date', None)
                prev_date_str = prev_date.strftime('%d %b %Y') if prev_date else 'previous check'

                deltas = []
                trend_points = 0  # positive = worsening, negative = improving

                if prev_erythema is not None:
                    d_ery = erythema_val - prev_erythema
                    d_ery_pct = round(d_ery * 100, 1)
                    if d_ery > 0.04:
                        deltas.append(f"Periwound redness increased (+{d_ery_pct}%)")
                        trend_points += 1
                    elif d_ery < -0.04:
                        deltas.append(f"Periwound redness decreased ({d_ery_pct}%, improving)")
                        trend_points -= 1
                    else:
                        deltas.append("Periwound redness is stable")

                if prev_roughness is not None:
                    d_rough = roughness_val - prev_roughness
                    if d_rough > 0.04:
                        deltas.append("Tissue swelling index increased")
                        trend_points += 1
                    elif d_rough < -0.04:
                        deltas.append("Tissue swelling index decreased (edema resolving)")
                        trend_points -= 1
                    else:
                        deltas.append("Tissue swelling remains stable")

                if prev_edge is not None:
                    d_edge = margin_edge_val - prev_edge
                    if d_edge > 0.015:
                        deltas.append("Margin contrast elevated compared to prior")
                        trend_points += 1
                    elif d_edge < -0.015:
                        deltas.append("Margin approximation improved")
                        trend_points -= 1

                if prev_slough is not None:
                    d_slough = slough_val - prev_slough
                    if d_slough > 0.05:
                        deltas.append("Exudate chromophore ratio increased")
                        trend_points += 1
                    elif d_slough < -0.05:
                        deltas.append("Exudate chromophore ratio decreased")
                        trend_points -= 1

                if trend_points > 0:
                    overall_trend = "worsening"
                elif trend_points < 0:
                    overall_trend = "improving"
                else:
                    overall_trend = "stable"

                summary_str = f"Compared with {prev_date_str}: {'; '.join(deltas)}."
                comparison_obs = {
                    'has_previous': True,
                    'previous_date': prev_date_str,
                    'overall_trend': overall_trend,
                    'comparison_summary': summary_str,
                    'deltas': deltas
                }

        # Assemble full structured AI observations
        ai_observations = {
            'ai_status': 'completed',
            'image_quality': image_quality,
            'redness': redness_obs,
            'swelling': swelling_obs,
            'wound_edges': edge_obs,
            'discharge': discharge_obs,
            'comparison_with_previous': comparison_obs,
            'clinical_summary': assessment_reason,
            'disclaimer': (
                "PostCare AI Decision Support: Observations are derived by computer vision algorithms to assist clinical review. "
                "These findings do not constitute a standalone medical diagnosis. Attending physician verification is required."
            )
        }

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
            'ai_observations': ai_observations,
            'message': msg,
        }

    except Exception as exc:
        logger.error("Wound image inference failed on %s: %s", file_path, exc, exc_info=True)
        return {
            'status': 'failed',
            'assessment_result': 'failed',
            'confidence': None,
            'raw_probabilities': None,
            'ai_observations': {
                'status': 'failed',
                'message': f"Inference engine failure: {str(exc)}",
            },
            'message': f"Inference engine failure: {str(exc)}",
        }


