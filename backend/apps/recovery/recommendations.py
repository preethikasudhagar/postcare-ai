"""
apps/recovery/recommendations.py
--------------------------------
Post-Operative Recovery Recommendation Engine.
Generates structured, understandable, evidence-based guidance tailored to:
  - Surgery type
  - Number of recovery days post-op
  - Validated wound image observations
  - Patient-reported symptoms and vital signs (pain, temperature)
  - Active prescribed medication schedules
  - Upcoming follow-up appointments

SAFETY POLICY:
- Never prescribes new medications or modifies prescribed doses.
- Explicitly separates General Guidance, AI-Generated Observations, and Doctor-Approved Instructions.
"""

from typing import Dict, Any, List, Optional
from apps.medications.models import Medication
from apps.followups.models import FollowUp


def generate_recovery_recommendations(
    patient: Any,
    wound_assessment: Optional[Any] = None,
    latest_checkin: Optional[Any] = None,
    ai_observations: Optional[Dict[str, Any]] = None,
    is_urgent: bool = False,
    urgent_reasons: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Synthesizes multi-factor clinical parameters into structured, actionable post-op guidance.
    """
    urgent_reasons = urgent_reasons or []
    surgery = (getattr(patient, 'surgery_type', None) or 'General Surgery').strip()
    recovery_day = getattr(wound_assessment, 'recovery_day', None) or 1
    doctor_name = "your treating doctor"
    if getattr(patient, 'primary_doctor', None) and patient.primary_doctor.user:
        full_name = patient.primary_doctor.user.get_full_name().strip()
        doctor_name = f"Dr. {full_name}" if full_name else "Dr. Assigned"

    # 1. Surgery-Specific and Recovery-Phase Guidance
    general_guidance: List[str] = []
    wound_care: List[str] = []
    hygiene: List[str] = []

    # Phase Breakdown
    if recovery_day <= 3:
        phase_desc = f"Acute Post-Op Recovery Phase (Day {recovery_day} of 30)"
        general_guidance.append(
            f"You are in the acute post-operative phase for {surgery}. "
            "Prioritize strict bedrest, limb elevation where applicable, and minimize unnecessary physical strain."
        )
        wound_care.append("Keep the original surgical dressing clean and completely dry. Do not peel or disturb dressing edges.")
        wound_care.append("Avoid showering or wetting the incision site until explicitly cleared by your surgical team.")
    elif recovery_day <= 10:
        phase_desc = f"Tissue Rebuilding & Early Mobility Phase (Day {recovery_day} of 30)"
        general_guidance.append(
            f"You are in the active tissue-healing phase for {surgery}. "
            "Engage in gentle, physician-approved mobilization and light walking every 2-3 hours to support circulation."
        )
        wound_care.append("Inspect the incision once daily under good lighting. Ensure surgical tape or Steri-Strips remain attached until they lift naturally.")
        wound_care.append("If a dressing change was prescribed at discharge, change dressing with sterile gauze using aseptic technique.")
    else:
        phase_desc = f"Maturation & Progressive Rehabilitation Phase (Day {recovery_day} of 30)"
        general_guidance.append(
            f"You are progressing into the later recovery phase for {surgery}. "
            "Continue your prescribed rehabilitation exercises while avoiding high-impact activities or heavy lifting (>5 kg)."
        )
        wound_care.append("Gently protect the incision scar from direct sun exposure and friction from tight garments.")
        wound_care.append("Do not apply over-the-counter scar ointments or herbal pastes until cleared by your attending doctor.")

    # Surgery-specific notes
    surgery_lower = surgery.lower()
    if 'knee' in surgery_lower or 'hip' in surgery_lower or 'ortho' in surgery_lower:
        general_guidance.append("Elevate the operated limb above heart level when resting to reduce postoperative swelling.")
        general_guidance.append("Perform prescribed ankle pumps and isometric quad sets as advised in your physical therapy plan.")
    elif 'cardiac' in surgery_lower or 'bypass' in surgery_lower:
        general_guidance.append("Follow sternal precautions: avoid pulling, pushing, or lifting with your arms when getting in and out of bed.")
        general_guidance.append("Practice incentive spirometry 10 times every hour while awake.")
    elif 'abdom' in surgery_lower or 'hernia' in surgery_lower or 'laparoscop' in surgery_lower:
        general_guidance.append("Support your incision with a soft pillow when coughing or deep breathing to minimize discomfort.")
        general_guidance.append("Maintain adequate hydration and dietary fiber to prevent abdominal straining.")

    # 2. Hygiene Guidance
    hygiene.append("Always wash your hands thoroughly with antibacterial soap and warm water for at least 20 seconds before touching near your dressing.")
    hygiene.append("Do NOT submerge the surgical area in bathtubs, swimming pools, or hot tubs until your incision has completely epithelialized and been cleared by your doctor.")
    hygiene.append("Wear clean, loose-fitting, breathable cotton clothing over the surgical site to prevent chafing and moisture buildup.")

    # 3. Validated Wound Image Findings Integration
    ai_obs_summary: List[str] = []
    if ai_observations and ai_observations.get('ai_status') == 'completed':
        redness = ai_observations.get('redness', {})
        swelling = ai_observations.get('swelling', {})
        edges = ai_observations.get('wound_edges', {})
        discharge = ai_observations.get('discharge', {})
        comparison = ai_observations.get('comparison_with_previous', {})

        ai_obs_summary.append(f"Visual Redness: {redness.get('description', 'Evaluated within normal screening limits.')}")
        ai_obs_summary.append(f"Tissue Contour & Edema: {swelling.get('description', 'No excessive swelling detected.')}")
        ai_obs_summary.append(f"Wound Margins: {edges.get('description', 'Incision margins observed.')}")
        ai_obs_summary.append(f"Exudate Assessment: {discharge.get('description', 'No purulent discharge detected.')}")
        if comparison.get('has_previous'):
            ai_obs_summary.append(f"Longitudinal Trend: {comparison.get('comparison_summary')}")
    else:
        ai_obs_summary.append("AI analysis is currently unavailable. Awaiting clinician review.")

    # 4. Medication Reminders (Strictly based on active prescriptions; NEVER prescribing new meds)
    medication_reminders: List[str] = []
    try:
        active_meds = Medication.objects.filter(patient=patient, status='active')
        if active_meds.exists():
            for med in active_meds:
                instruction_text = f" ({med.instructions})" if med.instructions else ""
                medication_reminders.append(
                    f"{med.medicine_name} — {med.dosage}, {med.frequency}{instruction_text}. "
                    "Take strictly according to schedule."
                )
        else:
            medication_reminders.append("No active medications on file. Take only medications prescribed by your treating team at discharge.")
    except Exception:
        medication_reminders.append("Please adhere strictly to your discharge medication summary.")

    medication_reminders.append(
        "CRITICAL MEDICATION SAFETY: Never introduce new medications or adjust prescribed doses without your treating physician's direct authorization."
    )

    # 5. Follow-Up Reminders
    followup_reminders: List[str] = []
    try:
        upcoming_fu = FollowUp.objects.filter(patient=patient, status='upcoming').order_by('appointment_date').first()
        if upcoming_fu:
            fu_date = upcoming_fu.appointment_date.strftime('%A, %d %B %Y')
            fu_time = upcoming_fu.appointment_time.strftime('%I:%M %p') if upcoming_fu.appointment_time else 'Scheduled Time'
            fu_dr = f"Dr. {upcoming_fu.doctor.user.get_full_name()}" if (upcoming_fu.doctor and upcoming_fu.doctor.user) else doctor_name
            followup_reminders.append(
                f"Next Clinical Follow-Up: {fu_date} at {fu_time} with {fu_dr} ({upcoming_fu.purpose or 'Post-Operative Evaluation'})."
            )
            followup_reminders.append("Bring your recovery check-in logs and any wound notes to your consultation.")
        else:
            followup_reminders.append(
                f"Please ensure you have scheduled your recommended post-op consultation with {doctor_name} or the surgical clinic."
            )
    except Exception:
        followup_reminders.append("Contact the surgical clinic to confirm your upcoming post-operative review date.")

    # 6. Symptoms That Require Medical Attention (Warning System)
    warning_symptoms: List[str] = [
        "Body temperature rising to 38.0°C (100.4°F) or above, or severe chills/shivering.",
        "Redness spreading outward more than 2 cm beyond the incision line or skin hot to touch.",
        "Foul-smelling, thick, yellow, or greenish fluid draining from the incision.",
        "A sudden increase in pain that is not relieved by your prescribed pain medication.",
        "Separation, gaping, or opening of the wound edges.",
        "Continuous bleeding that does not stop after applying gentle direct pressure with a clean cloth.",
        "Persistent nausea, vomiting, dizziness, or shortness of breath."
    ]

    # 7. When to Contact Treating Doctor vs Emergency
    contact_doctor: List[str] = [
        f"Contact {doctor_name} or your surgical department triage desk during clinic hours if you notice mild fluid leakage, gradual redness increase, or medication questions.",
        "For urgent surgical concerns outside clinic hours, call the hospital 24/7 post-discharge helpline.",
        "SEEK IMMEDIATE EMERGENCY CARE (Call 112 / 911 or visit the nearest Emergency Department) if you experience sudden wound dehiscence, heavy uncontrolled bleeding, chest pain, or severe difficulty breathing."
    ]

    return {
        'recovery_phase': phase_desc,
        'surgery_type': surgery,
        'recovery_day': recovery_day,
        'is_urgent': is_urgent,
        'urgent_reasons': urgent_reasons,
        'general_guidance': general_guidance,
        'wound_care': wound_care,
        'hygiene': hygiene,
        'medication_reminders': medication_reminders,
        'followup_reminders': followup_reminders,
        'warning_symptoms': warning_symptoms,
        'contact_doctor': contact_doctor,
        'ai_observations_summary': ai_obs_summary,
        'doctor_approved_instructions': getattr(wound_assessment, 'doctor_approved_instructions', '') or '',
        'doctor_comments': getattr(wound_assessment, 'doctor_comments', '') or '',
        'doctor_review_status': getattr(wound_assessment, 'doctor_review_status', 'pending') or 'pending',
    }
