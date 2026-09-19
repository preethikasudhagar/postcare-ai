def compute_recovery_score(pain_level, temperature, wound_condition, symptoms, medication_adherence):
    """
    Compute a 0–100 recovery score from daily check-in data.

    Component breakdown:
      - pain_score:    max(0, 10 - pain_level) * 3          → 0–30 pts
      - temp_score:    36.1–37.5 → 10, 37.5–38.5 → 5, else 0
      - wound_score:   normal→30, mild_redness→20, swelling→10, discharge→5, severe→0
      - med_score:     all→20, some→10, none→0
      - symptom_score: max(0, 10 - len(symptoms)*2)         → 0–10 pts
    Total: 0–100
    """
    # Pain component (0–30)
    pain_score = max(0, 10 - int(pain_level)) * 3

    # Temperature component (0–10)
    temp = float(temperature)
    if 36.1 <= temp <= 37.5:
        temp_score = 10
    elif 37.5 < temp <= 38.5:
        temp_score = 5
    else:
        temp_score = 0

    # Wound condition component (0–30)
    wound_map = {
        'normal': 30,
        'mild_redness': 20,
        'swelling': 10,
        'discharge': 5,
        'severe': 0,
    }
    wound_score = wound_map.get(wound_condition, 0)

    # Medication adherence component (0–20)
    med_map = {'all': 20, 'some': 10, 'none': 0}
    med_score = med_map.get(medication_adherence, 0)

    # Symptom component (0–10)
    symptom_count = len(symptoms) if isinstance(symptoms, list) else 0
    symptom_score = max(0, 10 - symptom_count * 2)

    total = pain_score + temp_score + wound_score + med_score + symptom_score
    return min(100.0, max(0.0, float(total)))
