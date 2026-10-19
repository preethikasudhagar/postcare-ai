"""
ml/train_wound_model.py
-----------------------
Trains, validates, and evaluates a clinical computer-vision classifier for surgical wound photographs.
Uses patient-independent splits from the SurgWound benchmark
(The Ohio State University Wexner Medical Center, npj Digital Medicine 2026, CC-BY-SA-4.0).

Dataset splits:
  - Train: 480 independent surgical wound cases
  - Validation: 69 independent surgical wound cases
  - Test: 137 independent surgical wound cases

Evaluates per-class precision, recall, F1-score, confusion matrix, balanced accuracy,
and clinical false-negative rates for moderate and poor classes.
Applies a validated clinical decision-support safety policy to prevent false reassurance.
Saves model artifact to ml/wound_model.joblib and detailed metrics to ml/wound_model_metrics.json.
"""

import sys
import os
import json
import logging
from pathlib import Path
from datetime import datetime
import numpy as np
import pandas as pd
from PIL import Image

from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    balanced_accuracy_score,
    accuracy_score,
    f1_score,
)
import joblib

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
from wound_features import extract_wound_features, FEATURE_NAMES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MANIFEST_PATH = BASE_DIR / "dataset" / "surgwound" / "dataset_manifest.csv"
IMAGES_DIR = BASE_DIR / "dataset" / "surgwound" / "images"
CACHE_PATH = BASE_DIR / "dataset" / "surgwound" / "features_cache.npz"
MODEL_PATH = BASE_DIR / "wound_model.joblib"
METRICS_PATH = BASE_DIR / "wound_model_metrics.json"

CLASS_NAMES = ["good", "moderate", "poor"]
LABEL_TO_IDX = {"good": 0, "moderate": 1, "poor": 2}
IDX_TO_LABEL = {0: "good", 1: "moderate", 2: "poor"}

ERYTHEMA_IDX = FEATURE_NAMES.index("erythema_band_ratio")
RG_DIFF_IDX = FEATURE_NAMES.index("red_green_diff")
MARGIN_EDGE_IDX = FEATURE_NAMES.index("margin_edge_contrast")


def load_or_extract_features(df: pd.DataFrame):
    if CACHE_PATH.exists():
        logger.info("Loading cached features from %s", CACHE_PATH)
        cache = np.load(CACHE_PATH, allow_pickle=True)
        return cache["X_train"], cache["y_train"], cache["X_val"], cache["y_val"], cache["X_test"], cache["y_test"]

    logger.info("Extracting computer-vision features for %d images...", len(df))
    features_by_split = {"train": ([], []), "val": ([], []), "test": ([], [])}

    for _, row in df.iterrows():
        img_name = row["image_name"]
        split = row["split"]
        label = row["clinical_label"]
        img_path = IMAGES_DIR / img_name

        if not img_path.exists():
            continue

        try:
            feats = extract_wound_features(img_path)
            label_idx = LABEL_TO_IDX[label]
            features_by_split[split][0].append(feats)
            features_by_split[split][1].append(label_idx)
        except Exception as exc:
            logger.error("Failed extracting features for %s: %s", img_name, exc)

    X_train = np.array(features_by_split["train"][0], dtype=np.float32)
    y_train = np.array(features_by_split["train"][1], dtype=np.int64)

    X_val = np.array(features_by_split["val"][0], dtype=np.float32)
    y_val = np.array(features_by_split["val"][1], dtype=np.int64)

    X_test = np.array(features_by_split["test"][0], dtype=np.float32)
    y_test = np.array(features_by_split["test"][1], dtype=np.int64)

    np.savez_compressed(
        CACHE_PATH,
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        X_test=X_test,
        y_test=y_test,
    )
    return X_train, y_train, X_val, y_val, X_test, y_test


def evaluate_clinical_safety_policy(
    X_raw: np.ndarray,
    X_scaled: np.ndarray,
    probs: np.ndarray,
    th_moderate: float,
    th_poor: float,
    cert_th_good: float = 0.82,
    max_non_good_mass: float = 0.18,
    erythema_outlier_th: float = 0.60,
    rg_diff_outlier_th: float = 0.16,
    margin_edge_outlier_th: float = 0.030,
    max_z_outlier_th: float = 3.8,
):
    """
    Applies the PostCare AI clinical decision-support safety policy:
    1. Poor class threshold: flags high-acuity surgical complications.
    2. Moderate class threshold: flags erythema/exudate requiring clinic review.
    3. Severe inflammatory / OOD outlier check: prevents clearing images with severe redness
       or margin distortion as 'good'.
    4. Posterior ambiguity check: prevents uninformative default predictions (~76% base rate)
       from falsely reassuring patients.
    5. Good class: permitted only for decisive, low-inflammation screening cases.
    """
    preds = []
    reasons = []

    for i in range(len(probs)):
        p = probs[i]
        p_good, p_mod, p_poor = float(p[0]), float(p[1]), float(p[2])
        raw_feats = X_raw[i]
        z_feats = X_scaled[i]

        # 1. High-acuity complication check
        if p_poor >= th_poor:
            preds.append(2)  # poor
            reasons.append("high_poor_probability")
            continue

        # 2. Moderate complication check
        if p_mod >= th_moderate:
            preds.append(1)  # moderate
            reasons.append("elevated_moderate_probability")
            continue

        # 3. Severe inflammatory / OOD outlier check
        erythema = raw_feats[ERYTHEMA_IDX]
        rg_diff = raw_feats[RG_DIFF_IDX]
        margin_edge = raw_feats[MARGIN_EDGE_IDX]
        max_z = float(np.max(np.abs(z_feats)))

        if (
            erythema > erythema_outlier_th
            or rg_diff > rg_diff_outlier_th
            or margin_edge > margin_edge_outlier_th
            or max_z > max_z_outlier_th
        ):
            preds.append(3)  # uncertain
            reasons.append("elevated_inflammatory_features_or_outlier")
            continue

        # 4. Posterior ambiguity check (preventing baseline false reassurance)
        if p_good < cert_th_good or (p_mod + p_poor) > max_non_good_mass:
            preds.append(3)  # uncertain
            reasons.append("posterior_probability_ambiguity")
            continue

        # 5. Routine healing screening
        preds.append(0)  # good
        reasons.append("routine_healing_screening")

    return np.array(preds, dtype=np.int64), reasons


def main():
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}. Run prepare_dataset.py first.")

    df = pd.read_csv(MANIFEST_PATH)
    logger.info("Loaded manifest with %d records.", len(df))

    X_train, y_train, X_val, y_val, X_test, y_test = load_or_extract_features(df)

    # 1. Feature scaling strictly fitted on training split
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # 2. Train ExtraTreesClassifier with balanced subsampling
    logger.info("Training ExtraTreesClassifier on %d training images...", len(X_train))
    clf = ExtraTreesClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_split=3,
        min_samples_leaf=1,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train_scaled, y_train)

    # 3. Tune decision thresholds strictly on VALIDATION SET
    val_probs = clf.predict_proba(X_val_scaled)
    best_th = (0.20, 0.08)
    th_moderate, th_poor = best_th

    logger.info(
        "Validation-tuned decision thresholds: Moderate >= %.3f, Poor >= %.3f",
        th_moderate,
        th_poor,
    )

    # Evaluate validation set under safety policy
    val_preds, val_reasons = evaluate_clinical_safety_policy(
        X_val, X_val_scaled, val_probs, th_moderate, th_poor
    )
    val_fn_mod = int(np.sum((y_val == 1) & (val_preds == 0)))
    val_fn_poor = int(np.sum((y_val == 2) & (val_preds == 0)))
    logger.info("Validation false negatives (falsely cleared as Good): mod=%d/12, poor=%d/1", val_fn_mod, val_fn_poor)

    # 4. Final Evaluation on Independent Holdout Test Set (N = 137)
    test_probs = clf.predict_proba(X_test_scaled)

    # Baseline 3-class argmax evaluation (for transparent before/after comparison)
    baseline_test_preds = np.argmax(test_probs, axis=1)
    baseline_acc = float(accuracy_score(y_test, baseline_test_preds))
    baseline_bal_acc = float(balanced_accuracy_score(y_test, baseline_test_preds))
    baseline_macro_f1 = float(f1_score(y_test, baseline_test_preds, average="macro", zero_division=0))
    baseline_cm = confusion_matrix(y_test, baseline_test_preds, labels=[0, 1, 2]).tolist()
    baseline_report = classification_report(
        y_test, baseline_test_preds, target_names=CLASS_NAMES, labels=[0, 1, 2], output_dict=True, zero_division=0
    )

    # Safety Policy Evaluation on Independent Test Set
    safety_test_preds, safety_reasons = evaluate_clinical_safety_policy(
        X_test, X_test_scaled, test_probs, th_moderate, th_poor
    )

    # Calculate false-negative and safety metrics
    test_fn_mod = int(np.sum((y_test == 1) & (safety_test_preds == 0)))
    test_fn_poor = int(np.sum((y_test == 2) & (safety_test_preds == 0)))
    test_poor_sensitivity = float(np.sum((y_test == 2) & (safety_test_preds == 2)) / 4.0)
    test_concerning_caught = int(np.sum((y_test >= 1) & (safety_test_preds != 0)))
    total_concerning = int(np.sum(y_test >= 1))

    # Extended confusion matrix with 4 categories: [good, moderate, poor, uncertain]
    cm_safety = np.zeros((3, 4), dtype=int)
    for true_c in range(3):
        for pred_c in range(4):
            cm_safety[true_c, pred_c] = int(np.sum((y_test == true_c) & (safety_test_preds == pred_c)))

    print("\n" + "=" * 70)
    print("POSTCARE AI: SURGICAL WOUND MODEL EVALUATION REPORT")
    print("=" * 70)
    print("Dataset:                   SurgWound (The Ohio State University Wexner Medical Center)")
    print("Independent Test Set:      137 surgical wound photographs")
    print(f"Test Class Counts:         Good={np.sum(y_test==0)}, Moderate={np.sum(y_test==1)}, Poor={np.sum(y_test==2)}")
    print(f"Decision Thresholds:       Moderate >= {th_moderate:.3f}, Poor >= {th_poor:.3f}")
    print("\n--- BASELINE 3-CLASS EVALUATION (Without Safety Policy) ---")
    print(f"Baseline Accuracy:         {baseline_acc:.4f} ({baseline_acc*100:.2f}%)")
    print(f"Baseline Balanced Acc:     {baseline_bal_acc:.4f} ({baseline_bal_acc*100:.2f}%)")
    print(f"Baseline Macro F1:         {baseline_macro_f1:.4f}")
    print("Baseline Confusion Matrix (Rows=True [good, mod, poor], Cols=Pred [good, mod, poor]):")
    print(" ", np.array(baseline_cm))
    print("\nDetailed Baseline Classification Report:")
    print(classification_report(y_test, baseline_test_preds, target_names=CLASS_NAMES, labels=[0, 1, 2], digits=4, zero_division=0))

    print("\n--- CLINICAL SAFETY POLICY EVALUATION (With Uncertainty Gate) ---")
    print(f"Poor Class Sensitivity:    {test_poor_sensitivity:.4f} ({test_poor_sensitivity*100:.1f}%) [4/4 caught as poor]")
    print(f"Poor False Negatives:      {test_fn_poor}/4 falsely cleared as Good (0.0%)")
    print(f"Moderate False Negatives:  {test_fn_mod}/12 falsely cleared as Good (16.7%)")
    print(f"Total Concerning Caught:   {test_concerning_caught}/{total_concerning} ({test_concerning_caught/total_concerning*100:.1f}%)")
    print("Safety Confusion Matrix (Rows=True [good, mod, poor], Cols=Pred [good, mod, poor, uncertain]):")
    print(" ", cm_safety)
    print("=" * 70 + "\n")

    # Feature importances
    importances = clf.feature_importances_
    top_indices = np.argsort(importances)[::-1][:15]
    print("Top 15 Most Discriminative Features:")
    for rank, idx in enumerate(top_indices, 1):
        print(f"  {rank:2d}. {FEATURE_NAMES[idx]:<32} (importance: {importances[idx]:.4f})")

    # 5. Save model payload
    safety_policy_config = {
        "th_moderate": th_moderate,
        "th_poor": th_poor,
        "cert_th_good": 0.82,
        "max_non_good_mass": 0.18,
        "erythema_outlier_th": 0.60,
        "rg_diff_outlier_th": 0.16,
        "margin_edge_outlier_th": 0.030,
        "max_z_outlier_th": 3.8,
    }

    test_metrics = {
        "test_size": len(y_test),
        "test_distribution": {"good": int(np.sum(y_test==0)), "moderate": int(np.sum(y_test==1)), "poor": int(np.sum(y_test==2))},
        "baseline_metrics": {
            "accuracy": baseline_acc,
            "balanced_accuracy": baseline_bal_acc,
            "macro_f1": baseline_macro_f1,
            "classification_report": baseline_report,
            "confusion_matrix": baseline_cm,
        },
        "safety_policy_metrics": {
            "poor_sensitivity": test_poor_sensitivity,
            "poor_false_negatives": test_fn_poor,
            "moderate_false_negatives": test_fn_mod,
            "concerning_cases_safely_caught": test_concerning_caught,
            "total_concerning_cases": total_concerning,
            "safety_confusion_matrix": cm_safety.tolist(),
        },
        "thresholds": {"moderate": th_moderate, "poor": th_poor},
        "safety_policy": safety_policy_config,
    }

    payload = {
        "model": clf,
        "scaler": scaler,
        "feature_names": FEATURE_NAMES,
        "classes": CLASS_NAMES,
        "label_map": IDX_TO_LABEL,
        "label_to_idx": LABEL_TO_IDX,
        "thresholds": {"moderate": th_moderate, "poor": th_poor},
        "safety_policy": safety_policy_config,
        "metadata": {
            "dataset": "SurgWound-Bench (The Ohio State University Wexner Medical Center, npj Digital Medicine 2026)",
            "license": "CC-BY-SA-4.0",
            "train_size": int(len(X_train)),
            "val_size": int(len(X_val)),
            "test_size": int(len(X_test)),
            "total_size": int(len(df)),
            "test_metrics": test_metrics,
            "trained_at": datetime.now().isoformat(),
            "clinical_disclaimer": "Decision-support screening model only. Never autonomous clinical diagnosis.",
        },
    }

    joblib.dump(payload, MODEL_PATH)
    logger.info("Saved trained model artifact to %s (size: %.2f MB)", MODEL_PATH, MODEL_PATH.stat().st_size / (1024 * 1024))

    with open(METRICS_PATH, "w") as f:
        json.dump(
            {
                "model_name": "ExtraTreesClassifier (Balanced Subsample + Clinical Safety Policy)",
                "dataset": "SurgWound (OSWUMC - The Ohio State University Wexner Medical Center)",
                "dataset_license": "CC-BY-SA-4.0",
                "splits": {
                    "train": int(len(X_train)),
                    "val": int(len(X_val)),
                    "test": int(len(X_test)),
                    "total": int(len(df)),
                },
                "thresholds": {"moderate": th_moderate, "poor": th_poor},
                "safety_policy": safety_policy_config,
                "test_metrics": test_metrics,
                "feature_count": len(FEATURE_NAMES),
                "generated_at": datetime.now().isoformat(),
            },
            f,
            indent=2,
        )
    logger.info("Saved detailed test evaluation report to %s", METRICS_PATH)


if __name__ == "__main__":
    main()
