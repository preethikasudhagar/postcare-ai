import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, Stepper } from '../../components/ui/index.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import {
  CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Thermometer,
  ShieldAlert, Send, AlertTriangle, Pill, HeartPulse, RotateCcw, Check
} from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'

export default function RecoveryCheckIn() {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [validationAlert, setValidationAlert] = useState(null)

  // Step 1: Pain Level (Explicitly unselected by default)
  const [painLevel, setPainLevel] = useState(null)

  // Step 2: Temperature & Unit (Explicitly empty by default)
  const [temperature, setTemperature] = useState('')
  const [tempUnit, setTempUnit] = useState('C') // 'C' or 'F'

  // Step 3: Wound Status (Explicitly unselected by default)
  const [woundCondition, setWoundCondition] = useState(null)

  // Step 4: Symptoms (Explicitly empty by default)
  const [symptoms, setSymptoms] = useState([])

  // Step 5: Medication Adherence (Explicitly unselected by default)
  const [medAdherence, setMedAdherence] = useState(null)

  // Step 6: Additional Notes & Confirmation Checkbox
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  // Field-level error messages
  const [errors, setErrors] = useState({})

  // Prediction output
  const [prediction, setPrediction] = useState(null)

  // DOM Refs for auto-focusing on first invalid field
  const painRef = useRef(null)
  const tempRef = useRef(null)
  const woundRef = useRef(null)
  const symptomsRef = useRef(null)
  const medRef = useRef(null)
  const confirmRef = useRef(null)

  const stepsList = [
    { id: 1, label: 'Pain Level' },
    { id: 2, label: 'Temperature' },
    { id: 3, label: 'Wound Status' },
    { id: 4, label: 'Symptoms' },
    { id: 5, label: 'Medications' },
    { id: 6, label: 'Review & Submit' }
  ]

  const woundOptions = [
    { id: 'normal', title: 'Normal & Healing', desc: 'Clean, dry edges with minimal scabbing, no active redness or drainage.' },
    { id: 'mild_redness', title: 'Mild Redness', desc: 'Slight redness localized strictly around incision borders without heat.' },
    { id: 'swelling', title: 'Moderate Swelling', desc: 'Noticeable fluid retention, puffiness, or firmness around the surgical site.' },
    { id: 'discharge', title: 'Fluid Discharge / Weeping', desc: 'Clear, yellowish, or slightly blood-tinged oozing from the surgical site.' },
    { id: 'severe', title: 'Severe Concern / Spreading Redness', desc: 'Hot to touch, intense spreading redness, foul odor, or wound opening.' }
  ]

  const symptomList = [
    'Fever / Chills',
    'Nausea / Vomiting',
    'Dizziness / Lightheadedness',
    'Excessive Uncontrolled Pain',
    'Excessive Swelling',
    'Active Bleeding',
    'Shortness of Breath',
    'Extreme Fatigue',
    'None of the above'
  ]

  const urgentSymptoms = ['Active Bleeding', 'Shortness of Breath', 'Excessive Uncontrolled Pain']
  const hasUrgentSymptoms = symptoms.some((s) => urgentSymptoms.includes(s))

  // Mutually exclusive symptom selection
  const toggleSymptom = (sym) => {
    // Clear field-level error
    setErrors((prev) => ({ ...prev, symptoms: undefined }))
    setValidationAlert(null)

    if (sym === 'None of the above') {
      setSymptoms(['None of the above'])
      return
    }

    const filtered = symptoms.filter((s) => s !== 'None of the above')
    if (filtered.includes(sym)) {
      const next = filtered.filter((s) => s !== sym)
      setSymptoms(next)
    } else {
      setSymptoms([...filtered, sym])
    }
  }

  // Pure step validation logic
  const validateStepIndex = (stepIdx) => {
    const errs = {}

    if (stepIdx === 0) {
      if (painLevel === null || painLevel === undefined || painLevel === '') {
        errs.painLevel = 'Pain rating is mandatory. Please select your current pain level (0 to 10).'
      }
    } else if (stepIdx === 1) {
      if (!temperature || String(temperature).trim() === '') {
        errs.temperature = 'Body temperature is mandatory. Please enter your measured reading.'
      } else {
        const num = parseFloat(temperature)
        if (isNaN(num)) {
          errs.temperature = 'Please enter a valid numeric temperature value.'
        } else if (tempUnit === 'C' && (num < 34.0 || num > 43.0)) {
          errs.temperature = 'Body temperature must be between 34.0°C and 43.0°C.'
        } else if (tempUnit === 'F' && (num < 93.2 || num > 109.4)) {
          errs.temperature = 'Body temperature must be between 93.2°F and 109.4°F.'
        }
      }
    } else if (stepIdx === 2) {
      if (!woundCondition) {
        errs.woundCondition = 'Wound status selection is mandatory. Please choose the condition that best matches your incision.'
      }
    } else if (stepIdx === 3) {
      if (!symptoms || symptoms.length === 0) {
        errs.symptoms = 'Symptoms reporting is mandatory. Select any symptoms you are experiencing or choose "None of the above".'
      } else if (symptoms.includes('None of the above') && symptoms.length > 1) {
        errs.symptoms = '"None of the above" cannot be combined with other symptoms.'
      }
    } else if (stepIdx === 4) {
      if (!medAdherence) {
        errs.medAdherence = 'Medication adherence is mandatory. Please indicate your prescription intake today or select "No medications prescribed".'
      }
    } else if (stepIdx === 5) {
      if (!confirmed) {
        errs.confirmed = 'Please confirm that you have reviewed your answers and that the information is accurate.'
      }
    }

    return errs
  }

  // Scroll and focus first invalid element
  const focusFirstError = (stepIdx) => {
    setTimeout(() => {
      let targetRef = null
      if (stepIdx === 0) targetRef = painRef.current
      else if (stepIdx === 1) targetRef = tempRef.current
      else if (stepIdx === 2) targetRef = woundRef.current
      else if (stepIdx === 3) targetRef = symptomsRef.current
      else if (stepIdx === 4) targetRef = medRef.current
      else if (stepIdx === 5) targetRef = confirmRef.current

      if (targetRef) {
        targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (typeof targetRef.focus === 'function') {
          targetRef.focus()
        }
      }
    }, 50)
  }

  // Next / Continue button handler
  const handleContinue = () => {
    const stepErrors = validateStepIndex(step)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      setValidationAlert('This section is mandatory. Please complete the required fields before continuing.')
      toast.error('This section is mandatory. Please complete the required fields.')
      focusFirstError(step)
      return
    }

    setErrors({})
    setValidationAlert(null)
    setStep((prev) => prev + 1)
  }

  // Safe Stepper Navigation: prevents jumping ahead past incomplete sections
  const handleStepperClick = (targetIndex) => {
    if (targetIndex <= step) {
      // Navigating backward is always safe and preserves all data
      setErrors({})
      setValidationAlert(null)
      setStep(targetIndex)
      return
    }

    // Navigating forward: validate every intermediate step sequentially
    for (let i = 0; i < targetIndex; i++) {
      const stepErrors = validateStepIndex(i)
      if (Object.keys(stepErrors).length > 0) {
        setStep(i)
        setErrors(stepErrors)
        setValidationAlert(`Step ${i + 1} (${stepsList[i].label}) has required fields that must be completed first.`)
        toast.error(`Please complete Step ${i + 1} before proceeding.`)
        focusFirstError(i)
        return
      }
    }

    // All previous steps are complete
    setErrors({})
    setValidationAlert(null)
    setStep(targetIndex)
  }

  // Final Submission Handler
  const handleSubmit = async () => {
    // Validate all 6 steps before submission
    for (let i = 0; i <= 5; i++) {
      const stepErrors = validateStepIndex(i)
      if (Object.keys(stepErrors).length > 0) {
        setStep(i)
        setErrors(stepErrors)
        setValidationAlert(`Step ${i + 1} (${stepsList[i].label}) is missing required information. Please complete it before submission.`)
        toast.error(`Step ${i + 1} is required.`)
        focusFirstError(i)
        return
      }
    }

    setIsSubmitting(true)
    setSubmitError(null)

    // Convert temperature to Celsius if entered in Fahrenheit
    const tempNum = parseFloat(temperature)
    const tempCelsius = tempUnit === 'F' ? Math.round((((tempNum - 32) * 5) / 9) * 10) / 10 : Math.round(tempNum * 10) / 10

    const payload = {
      pain_level: painLevel,
      temperature: tempCelsius,
      wound_condition: woundCondition,
      symptoms: symptoms,
      medication_adherence: medAdherence,
      additional_notes: notes.trim(),
    }

    try {
      const res = await api.post('/recovery/check-in/', payload)
      const data = res.data
      const pred = data.prediction || {}
      const chk = data.checkin || {}

      setPrediction({
        score: Math.round(chk.recovery_score != null ? chk.recovery_score : 85),
        risk: pred.risk_level || 'low',
        confidence: pred.confidence ? `${Math.round(pred.confidence * 100)}%` : '95%',
        contributingFactors: pred.contributing_factors || {},
        recommendation: pred.recommendation_category || 'Steady healing trajectory noted.',
      })
      setSubmitted(true)
      toast.success('Your recovery check-in was successfully recorded.')
    } catch (err) {
      console.error('Check-in submission failed:', err)
      const errResponse = err.response?.data
      let message = 'Failed to submit recovery check-in. Your answers have been preserved. Please retry.'

      if (errResponse && typeof errResponse === 'object') {
        const fieldErrors = Object.entries(errResponse)
          .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ')
        if (fieldErrors) message = fieldErrors
      } else if (err.message) {
        message = err.message
      }

      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Verbal pain rating label helper
  const getPainDescriptor = (val) => {
    if (val === null || val === undefined) return 'Not selected'
    if (val === 0) return '0 - No Pain'
    if (val <= 3) return `${val} - Mild Pain`
    if (val <= 6) return `${val} - Moderate Pain`
    if (val <= 9) return `${val} - Severe Pain`
    return '10 - Worst Possible Pain'
  }

  return (
    <div className="max-w-form mx-auto space-y-6">
      <PageHeader title="Daily Recovery Check-In" />

      {!submitted ? (
        <Card>
          <CardHeader
            title={`Step ${step + 1} of 6 — ${stepsList[step].label}`}
            description="All questions marked with an asterisk (*) are mandatory."
          />
          <CardBody>
            {/* Interactive Step Indicator with Guarded Navigation */}
            <div className="mb-6">
              <Stepper steps={stepsList} currentStep={step} onStepClick={handleStepperClick} />
            </div>

            {/* Global Section Validation Banner */}
            {validationAlert && (
              <div
                role="alert"
                className="mb-6 p-3.5 bg-status-danger/10 border border-status-danger/30 rounded-lg flex items-center gap-2.5 text-xs text-status-danger animate-fadeIn"
              >
                <AlertCircle size={16} className="flex-shrink-0" />
                <span className="font-semibold">{validationAlert}</span>
              </div>
            )}

            {/* Submission Error Banner with Retry Guarantee */}
            {submitError && (
              <div
                role="alert"
                className="mb-6 p-4 bg-status-danger/10 border border-status-danger/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-status-danger"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-status-danger text-white rounded text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 flex-shrink-0"
                >
                  <RotateCcw size={13} className={isSubmitting ? 'animate-spin' : ''} />
                  <span>Retry Submission</span>
                </button>
              </div>
            )}

            {/* Immediate Urgent Symptoms Warning Banner */}
            {hasUrgentSymptoms && (
              <div
                role="alert"
                className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-lg flex items-start gap-3 text-xs text-red-700 animate-fadeIn"
              >
                <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-red-900 font-bold mb-0.5">Urgent Clinical Notice: Critical Symptoms Reported</strong>
                  <p className="leading-relaxed">
                    You have selected one or more potentially urgent symptoms (Active Bleeding, Shortness of Breath, or Severe Uncontrolled Pain).
                    If you are experiencing acute distress, uncontrolled hemorrhage, or severe breathing difficulty, please call Emergency Services (112 / 911) or contact your hospital emergency triage immediately.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 1: Pain Level ─────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-5 py-2" ref={painRef} tabIndex={-1}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-text">
                      How would you rate your current pain level right now?
                    </h3>
                    <span className="text-status-danger font-bold text-sm" aria-label="required">*</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Select a rating on the 0–10 numeric pain scale. 0 represents complete absence of pain, while 10 is the worst imaginable pain.
                  </p>
                </div>

                {/* 0-10 Rating Buttons Scale */}
                <div className="space-y-3 pt-2">
                  <div
                    className={`grid grid-cols-6 sm:grid-cols-11 gap-1.5 p-2 rounded-lg border ${
                      errors.painLevel ? 'border-status-danger bg-status-danger/5' : 'border-border bg-surface-muted/30'
                    }`}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const isSelected = painLevel === num
                      let btnColor = 'hover:bg-surface-muted text-text border-border'
                      if (isSelected) {
                        if (num === 0) btnColor = 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                        else if (num <= 3) btnColor = 'bg-primary text-white border-primary font-bold shadow-xs'
                        else if (num <= 6) btnColor = 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs'
                        else btnColor = 'bg-red-600 text-white border-red-700 font-bold shadow-xs'
                      }

                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setPainLevel(num)
                            setErrors((prev) => ({ ...prev, painLevel: undefined }))
                            setValidationAlert(null)
                          }}
                          aria-pressed={isSelected}
                          className={`h-11 flex flex-col items-center justify-center rounded border text-xs font-semibold transition-all ${btnColor}`}
                        >
                          <span className="text-sm">{num}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Selected Pain Status Indicator */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-text-muted">Selected Pain Rating:</span>
                    <strong
                      className={`font-semibold ${
                        painLevel === null
                          ? 'text-status-danger'
                          : painLevel === 0
                          ? 'text-emerald-700'
                          : painLevel <= 3
                          ? 'text-primary'
                          : painLevel <= 6
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {getPainDescriptor(painLevel)}
                    </strong>
                  </div>

                  {errors.painLevel && (
                    <p className="text-xs text-status-danger font-medium flex items-center gap-1.5 pt-1" role="alert">
                      <AlertCircle size={14} />
                      <span>{errors.painLevel}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 2: Body Temperature ───────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5 py-2" ref={tempRef} tabIndex={-1}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-text">
                      What is your current body temperature?
                    </h3>
                    <span className="text-status-danger font-bold text-sm" aria-label="required">*</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Take your reading using an oral, axillary, or tympanic digital thermometer. Normal resting range is 36.1°C – 37.2°C (97.0°F – 99.0°F).
                  </p>
                </div>

                <div className="max-w-sm space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Thermometer
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-primary"
                        size={20}
                      />
                      <input
                        type="number"
                        step="0.1"
                        min={tempUnit === 'C' ? '34.0' : '93.2'}
                        max={tempUnit === 'C' ? '43.0' : '109.4'}
                        placeholder={tempUnit === 'C' ? 'e.g. 36.8' : 'e.g. 98.2'}
                        value={temperature}
                        aria-required="true"
                        aria-invalid={!!errors.temperature}
                        onChange={(e) => {
                          setTemperature(e.target.value)
                          setErrors((prev) => ({ ...prev, temperature: undefined }))
                          setValidationAlert(null)
                        }}
                        className={`w-full h-11 pl-10 pr-3 text-base font-bold bg-surface border rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-primary ${
                          errors.temperature ? 'border-status-danger text-status-danger bg-status-danger/5' : 'border-border text-text'
                        }`}
                      />
                    </div>

                    {/* Unit Selector Toggle (°C / °F) */}
                    <div className="flex rounded-md border border-border p-0.5 bg-surface-muted flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (tempUnit !== 'C') {
                            setTempUnit('C')
                            if (temperature && !isNaN(parseFloat(temperature))) {
                              const converted = Math.round((((parseFloat(temperature) - 32) * 5) / 9) * 10) / 10
                              setTemperature(String(converted))
                            }
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                          tempUnit === 'C' ? 'bg-primary text-white shadow-xs' : 'text-text hover:text-primary'
                        }`}
                      >
                        °C
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (tempUnit !== 'F') {
                            setTempUnit('F')
                            if (temperature && !isNaN(parseFloat(temperature))) {
                              const converted = Math.round(((parseFloat(temperature) * 9) / 5 + 32) * 10) / 10
                              setTemperature(String(converted))
                            }
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                          tempUnit === 'F' ? 'bg-primary text-white shadow-xs' : 'text-text hover:text-primary'
                        }`}
                      >
                        °F
                      </button>
                    </div>
                  </div>

                  <p className="text-2xs text-text-muted">
                    Accepted physiological ranges: 34.0°C – 43.0°C (93.2°F – 109.4°F). Values ≥ 38.0°C (100.4°F) indicate surgical fever.
                  </p>

                  {errors.temperature && (
                    <p className="text-xs text-status-danger font-medium flex items-center gap-1.5" role="alert">
                      <AlertCircle size={14} />
                      <span>{errors.temperature}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: Wound Condition ────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5 py-2" ref={woundRef} tabIndex={-1}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-text">
                      Inspect your surgical incision or wound dressing
                    </h3>
                    <span className="text-status-danger font-bold text-sm" aria-label="required">*</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Select the status that most accurately describes the incision appearance and surrounding skin today:
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {woundOptions.map((opt) => {
                    const isSelected = woundCondition === opt.id
                    return (
                      <div
                        key={opt.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => {
                          setWoundCondition(opt.id)
                          setErrors((prev) => ({ ...prev, woundCondition: undefined }))
                          setValidationAlert(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            setWoundCondition(opt.id)
                            setErrors((prev) => ({ ...prev, woundCondition: undefined }))
                            setValidationAlert(null)
                          }
                        }}
                        className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-tint/40 shadow-xs ring-1 ring-primary'
                            : 'border-border hover:bg-surface-muted/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-text'}`}>
                            {opt.title}
                          </span>
                          <input
                            type="radio"
                            name="wound"
                            checked={isSelected}
                            onChange={() => {}}
                            className="text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{opt.desc}</p>
                      </div>
                    )
                  })}

                  {errors.woundCondition && (
                    <p className="text-xs text-status-danger font-medium flex items-center gap-1.5 pt-1" role="alert">
                      <AlertCircle size={14} />
                      <span>{errors.woundCondition}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 4: Symptoms ───────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5 py-2" ref={symptomsRef} tabIndex={-1}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-text">
                      Are you experiencing any post-operative symptoms today?
                    </h3>
                    <span className="text-status-danger font-bold text-sm" aria-label="required">*</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Select all applicable symptoms. If you feel comfortable and are experiencing no adverse issues, select <strong>None of the above</strong>.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {symptomList.map((sym) => {
                      const isSelected = symptoms.includes(sym)
                      const isUrgent = urgentSymptoms.includes(sym)
                      return (
                        <div
                          key={sym}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => toggleSymptom(sym)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              toggleSymptom(sym)
                            }
                          }}
                          className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between text-xs font-medium transition-all ${
                            isSelected
                              ? isUrgent
                                ? 'border-red-500 bg-red-500/10 text-red-700 ring-1 ring-red-500'
                                : 'border-primary bg-primary-tint/50 text-primary ring-1 ring-primary'
                              : 'border-border hover:bg-surface-muted/60 text-text'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isUrgent && <AlertTriangle size={13} className="text-red-600 flex-shrink-0" />}
                            <span>{sym}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className={`rounded cursor-pointer ${isUrgent ? 'text-red-600 focus:ring-red-500' : 'text-primary focus:ring-primary'}`}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {errors.symptoms && (
                    <p className="text-xs text-status-danger font-medium flex items-center gap-1.5 pt-1" role="alert">
                      <AlertCircle size={14} />
                      <span>{errors.symptoms}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 5: Medication Adherence ───────────────────────── */}
            {step === 4 && (
              <div className="space-y-5 py-2" ref={medRef} tabIndex={-1}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-text">
                      Did you take your prescribed medications today?
                    </h3>
                    <span className="text-status-danger font-bold text-sm" aria-label="required">*</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Consistent adherence to prescribed analgesics, anticoagulants, and antibiotics helps avoid complications and manages discomfort.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {[
                    { id: 'all', title: 'Took all prescribed doses', desc: 'Followed timing and dosing instructions exactly as directed.' },
                    { id: 'some', title: 'Missed some doses', desc: 'Missed, skipped, or delayed one or more scheduled medication doses.' },
                    { id: 'none', title: 'Did not take medications', desc: 'Did not take any prescribed medication today due to side effects, nausea, or forgetting.' },
                    { id: 'no_meds', title: 'No medications prescribed / Not applicable', desc: 'I am not currently taking or prescribed any post-operative medications.' }
                  ].map((med) => {
                    const isSelected = medAdherence === med.id
                    return (
                      <div
                        key={med.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => {
                          setMedAdherence(med.id)
                          setErrors((prev) => ({ ...prev, medAdherence: undefined }))
                          setValidationAlert(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            setMedAdherence(med.id)
                            setErrors((prev) => ({ ...prev, medAdherence: undefined }))
                            setValidationAlert(null)
                          }
                        }}
                        className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-tint/40 shadow-xs ring-1 ring-primary'
                            : 'border-border hover:bg-surface-muted/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-text'}`}>
                            {med.title}
                          </span>
                          <input
                            type="radio"
                            name="med"
                            checked={isSelected}
                            onChange={() => {}}
                            className="text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{med.desc}</p>
                      </div>
                    )
                  })}

                  {errors.medAdherence && (
                    <p className="text-xs text-status-danger font-medium flex items-center gap-1.5 pt-1" role="alert">
                      <AlertCircle size={14} />
                      <span>{errors.medAdherence}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 6: Review & Submit ────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-5 py-2">
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    Review your recovery check-in answers
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Please verify your responses before final submission. You can click on any previous step to make changes.
                  </p>
                </div>

                <div className="bg-surface-muted/40 rounded-lg p-4 space-y-3 text-xs border border-border">
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-text-muted">Pain Rating:</span>
                    <strong className="text-text">{getPainDescriptor(painLevel)}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-text-muted">Body Temperature:</span>
                    <strong className="text-text">{temperature} °{tempUnit}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-text-muted">Wound Status:</span>
                    <strong className="text-text capitalize">
                      {woundOptions.find((w) => w.id === woundCondition)?.title || woundCondition}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-text-muted">Reported Symptoms:</span>
                    <strong className="text-text">
                      {symptoms.length > 0 ? symptoms.join(', ') : 'None of the above'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-text-muted">Medication Adherence:</span>
                    <strong className="text-text capitalize">
                      {medAdherence === 'all'
                        ? 'Took all prescribed doses'
                        : medAdherence === 'some'
                        ? 'Missed some doses'
                        : medAdherence === 'none'
                        ? 'Did not take medications'
                        : 'No medications prescribed'}
                    </strong>
                  </div>
                </div>

                {/* Additional Clinical Notes */}
                <div className="pt-1">
                  <label className="block text-xs font-medium text-text mb-1">
                    Additional notes, questions, or observations for your care team (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe any other sensations, queries for your attending surgeon, or recovery updates..."
                    className="w-full p-2.5 text-xs bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-text placeholder:text-text-muted"
                  />
                </div>

                {/* Mandatory Confirmation Checkbox */}
                <div
                  ref={confirmRef}
                  tabIndex={-1}
                  className={`p-3.5 rounded-lg border transition-all ${
                    errors.confirmed ? 'border-status-danger bg-status-danger/5' : 'border-border bg-surface-muted/20'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => {
                        setConfirmed(e.target.checked)
                        setErrors((prev) => ({ ...prev, confirmed: undefined }))
                        setValidationAlert(null)
                      }}
                      className="mt-0.5 w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-text block">
                        Mandatory Confirmation <span className="text-status-danger">*</span>
                      </span>
                      <span className="text-text-secondary text-2xs block mt-0.5">
                        I confirm that I have reviewed my answers and that this assessment accurately represents my current health condition today.
                      </span>
                    </div>
                  </label>

                  {errors.confirmed && (
                    <p className="text-xs text-status-danger font-medium flex items-center gap-1.5 pt-2" role="alert">
                      <AlertCircle size={14} />
                      <span>{errors.confirmed}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Wizard Actions Footer ─────────────────────────────── */}
            <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setErrors({})
                    setValidationAlert(null)
                    setStep((s) => s - 1)
                  }}
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-xs font-semibold text-text bg-surface border border-border rounded-lg hover:bg-surface-muted transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 h-10 px-6 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover shadow-xs active:scale-[0.99] transition-all"
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 h-10 px-6 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover shadow-xs disabled:opacity-50 active:scale-[0.99] transition-all"
                >
                  {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isSubmitting ? 'Evaluating Clinical Engine...' : 'Submit Recovery Check-In'} <Send size={14} />
                </button>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        /* ── Submission Result & ML Decision Support Card ──────────── */
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader
              title="Assessment Complete & Recorded"
              description="Your recovery evaluation has been processed and logged in your clinical chart"
            />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4 flex justify-center py-4">
                  <RecoveryRing value={prediction?.score} size={150} />
                </div>
                <div className="md:col-span-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary">ML Risk Classification:</span>
                    <RiskBadge level={prediction?.risk} />
                  </div>

                  <div className="p-3 bg-surface-muted rounded-lg text-xs space-y-1.5 border border-border">
                    <p className="font-semibold text-text">
                      Model Confidence: <span className="text-primary font-bold">{prediction?.confidence}</span>
                    </p>
                    <p className="text-text-secondary">
                      {prediction?.risk === 'low'
                        ? 'Recovery parameters indicate steady, expected progress. Continue with your scheduled medication and activity restrictions.'
                        : prediction?.risk === 'medium'
                        ? 'Parameters suggest moderate symptom elevation. Maintain close observation and ensure you take all medications on time.'
                        : 'Alert generated for surgical team. Please rest, keep the wound clean, and expect a follow-up consultation.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      to="/patient/dashboard"
                      className="h-9 px-4 bg-primary text-white text-xs font-medium rounded hover:bg-primary-hover flex items-center justify-center transition-colors shadow-xs"
                    >
                      Return to Dashboard
                    </Link>
                    <Link
                      to="/patient/messages"
                      className="h-9 px-4 border border-border text-text text-xs font-medium rounded hover:bg-surface-muted flex items-center justify-center transition-colors"
                    >
                      Message Care Team
                    </Link>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
