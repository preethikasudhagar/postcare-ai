"""
apps/recovery/urgent_system.py
------------------------------
Urgent Clinical Warning and Escalation Engine for Post-Operative Wound Care.
Evaluates patient-reported symptoms, biometric vitals, and image observations for emergency red flags.
Immediately dispatches high-priority clinician notifications according to clinical escalation rules.
"""

import logging
from typing import Tuple, List, Dict, Any, Optional
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)

CONCERNING_KEYWORD_PATTERNS = {
    'wound_opening': ['open', 'opening', 'gap', 'gaping', 'split', 'stitches broke', 'separated', 'dehiscence', 'burst', 'torn'],
    'bleeding': ['bleeding', 'blood', 'soaked', 'hemorrhage', 'dripping blood', 'oozing blood'],
    'purulent_discharge': ['pus', 'yellow fluid', 'green fluid', 'foul smell', 'smelly', 'purulent', 'cloudy discharge', 'milky fluid'],
    'severe_pain': ['unbearable pain', 'extreme pain', 'severe pain', 'worse pain', 'throbbing severely', 'crying from pain'],
    'fever_reported': ['fever', 'high temp', 'chills', 'shivering', 'burning up', 'sweats'],
    'spreading_redness': ['redness spreading', 'streaking', 'hot to touch', 'expanding red', 'swelling worse', 'huge swelling'],
}


def evaluate_urgency(
    patient: Any,
    remarks: str = "",
    wound_assessment: Optional[Any] = None,
    latest_checkin: Optional[Any] = None,
    ai_observations: Optional[Dict[str, Any]] = None
) -> Tuple[bool, List[str], str]:
    """
    Evaluates clinical urgency based on patient-reported remarks, latest check-in vitals,
    and genuine computer-vision observations.

    Returns:
        (is_urgent: bool, urgent_reasons: List[str], urgent_message: str)
    """
    reasons = []
    remarks_lower = (remarks or "").lower()

    # 1. Immediate Patient-Reported Red Flags (Do not wait for AI analysis)
    for category, keywords in CONCERNING_KEYWORD_PATTERNS.items():
        matched = [kw for kw in keywords if kw in remarks_lower]
        if matched:
            if category == 'wound_opening':
                reasons.append(f"Reported wound edge opening or separation ('{matched[0]}')")
            elif category == 'bleeding':
                reasons.append(f"Reported active wound bleeding ('{matched[0]}')")
            elif category == 'purulent_discharge':
                reasons.append(f"Reported purulent or foul-smelling discharge ('{matched[0]}')")
            elif category == 'severe_pain':
                reasons.append(f"Reported acute or worsening severe wound pain ('{matched[0]}')")
            elif category == 'fever_reported':
                reasons.append(f"Reported fever or systemic chills ('{matched[0]}')")
            elif category == 'spreading_redness':
                reasons.append(f"Reported spreading redness or rapidly expanding swelling ('{matched[0]}')")

    # 2. Check-In Vitals (Fever & Pain Thresholds)
    if latest_checkin is not None:
        temp = getattr(latest_checkin, 'temperature', None)
        if temp is not None:
            try:
                temp_val = float(temp)
                if temp_val >= 38.0:
                    reasons.append(f"Elevated body temperature: {temp_val:.1f}°C (febrile threshold >= 38.0°C / 100.4°F)")
            except (ValueError, TypeError):
                pass

        pain = getattr(latest_checkin, 'pain_level', None)
        if pain is not None:
            try:
                pain_val = int(pain)
                if pain_val >= 7:
                    reasons.append(f"High-acuity pain rating: {pain_val}/10 reported")
            except (ValueError, TypeError):
                pass

        symptoms = getattr(latest_checkin, 'symptoms', []) or []
        if isinstance(symptoms, list):
            symptoms_str = " ".join([str(s).lower() for s in symptoms])
            if 'discharge' in symptoms_str or 'fluid' in symptoms_str:
                if not any('discharge' in r.lower() for r in reasons):
                    reasons.append("Fluid discharge reported in recent recovery check-in")
            if 'severe' in symptoms_str or 'intense' in symptoms_str:
                if not any('pain' in r.lower() for r in reasons):
                    reasons.append("Severe discomfort flagged in recovery symptoms")

        wound_cond = getattr(latest_checkin, 'wound_condition', '')
        if wound_cond in ['severe', 'discharge']:
            cond_label = "Severe Concern" if wound_cond == 'severe' else "Fluid Discharge"
            if not any(cond_label.lower() in r.lower() for r in reasons):
                reasons.append(f"Check-in wound status categorized as '{cond_label}'")

    # 3. Validated Computer-Vision Acuity Findings
    if ai_observations and isinstance(ai_observations, dict):
        discharge_info = ai_observations.get('discharge', {})
        if discharge_info.get('level') == 'conspicuous_discharge':
            if not any('discharge' in r.lower() for r in reasons):
                reasons.append("Computer vision detected conspicuous exudate / slough chromophore")

        edge_info = ai_observations.get('wound_edges', {})
        if edge_info.get('alignment') == 'separated_or_gapping':
            if not any('opening' in r.lower() or 'separation' in r.lower() for r in reasons):
                reasons.append("Computer vision detected elevated margin contrast indicating potential edge separation")

        comparison = ai_observations.get('comparison_with_previous', {})
        if comparison.get('overall_trend') == 'worsening':
            if not any('worsening' in r.lower() or 'spreading' in r.lower() for r in reasons):
                reasons.append("Longitudinal visual comparison shows worsening inflammation / swelling trend")

    if wound_assessment is not None:
        if getattr(wound_assessment, 'assessment_result', '') == 'poor':
            if not any('high-acuity' in r.lower() or 'poor' in r.lower() for r in reasons):
                reasons.append("Validated CV model classified wound as Poor class (high complication risk)")

    is_urgent = len(reasons) > 0
    urgent_msg = ""
    if is_urgent:
        urgent_msg = (
            "URGENT ATTENTION ADVISED: One or more concerning post-operative recovery indicators have been detected. "
            "Please review the details below and contact your treating physician or hospital triage immediately."
        )

    return is_urgent, reasons, urgent_msg


def trigger_urgent_clinical_escalation(
    patient: Any,
    wound_assessment: Any,
    urgent_reasons: List[str]
) -> None:
    """
    Sends urgent clinical notifications to the assigned primary doctor and clinical care team.
    """
    if not patient or not urgent_reasons:
        return

    patient_name = patient.user.get_full_name() if patient.user else f"Patient {patient.patient_id}"
    reasons_summary = "; ".join(urgent_reasons[:3])
    if len(urgent_reasons) > 3:
        reasons_summary += f" (+{len(urgent_reasons) - 3} more)"

    # Notify Primary Doctor
    if patient.primary_doctor and patient.primary_doctor.user:
        try:
            Notification.objects.create(
                recipient=patient.primary_doctor.user,
                type='high_risk_alert',
                title=f"URGENT WOUND ALERT: {patient_name} ({patient.patient_id})",
                message=(
                    f"Urgent post-op warning signs detected for {patient_name} "
                    f"({patient.surgery_type or 'Post-Op'}, Day {wound_assessment.recovery_day or 1}): "
                    f"{reasons_summary}. Immediate clinical evaluation required."
                ),
                related_patient=patient
            )
            logger.info("Sent urgent wound alert to primary doctor: %s", patient.primary_doctor.user.email)
        except Exception as e:
            logger.error("Failed creating urgent doctor notification: %s", e)

    # Notify Assigned Nurses
    try:
        assigned_nurses = patient.assigned_nurses.all()
        for nurse in assigned_nurses:
            if nurse.user:
                Notification.objects.create(
                    recipient=nurse.user,
                    type='high_risk_alert',
                    title=f"URGENT CLINICAL ALERT: {patient_name} ({patient.patient_id})",
                    message=(
                        f"Post-op patient {patient_name} has urgent wound concerns: {reasons_summary}. "
                        "Please verify vitals and alert attending surgical resident."
                    ),
                    related_patient=patient
                )
    except Exception as e:
        logger.error("Failed notifying assigned nurses: %s", e)
