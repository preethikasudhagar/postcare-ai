import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, Stepper, DisclaimerNote } from '../../components/ui/index.jsx'
import { Slider } from '../../components/ui/FormFields.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import { CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Activity, Thermometer, ShieldAlert, HeartPulse, Send } from 'lucide-react'

export default function RecoveryCheckIn() {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [painLevel, setPainLevel] = useState(2)
  const [temperature, setTemperature] = useState('36.6')
  const [woundCondition, setWoundCondition] = useState('normal')
  const [symptoms, setSymptoms] = useState([])
  const [medAdherence, setMedAdherence] = useState('all')
  const [notes, setNotes] = useState('')

  // Prediction output (demo state initialized or computed)
  const [prediction, setPrediction] = useState(null)

  const stepsList = [
    { id: 1, label: 'Pain Level' },
    { id: 2, label: 'Temperature' },
    { id: 3, label: 'Wound Status' },
    { id: 4, label: 'Symptoms' },
    { id: 5, label: 'Medications' },
    { id: 6, label: 'Review & Submit' }
  ]

  const woundOptions = [
    { id: 'normal', title: 'Normal & Healing', desc: 'Clean, dry edges with minimal scabbing, no active redness.' },
    { id: 'mild_redness', title: 'Mild Redness', desc: 'Slight redness localized strictly around incision borders.' },
    { id: 'swelling', title: 'Moderate Swelling', desc: 'Noticeable fluid retention or firmness around the surgical site.' },
    { id: 'discharge', title: 'Fluid Discharge / Weeping', desc: 'Clear, yellowish, or slightly blood-tinged oozing from incision.' },
    { id: 'severe', title: 'Severe Concern / Spreading Redness', desc: 'Hot to touch, intense spreading redness, foul odor, or opening.' }
  ]

  const symptomList = [
    'Fever / Chills', 'Nausea / Vomiting', 'Dizziness / Lightheadedness',
    'Excessive Uncontrolled Pain', 'Excessive Swelling', 'Active Bleeding',
    'Shortness of Breath', 'Extreme Fatigue', 'None of the above'
  ]

  const toggleSymptom = (sym) => {
    if (sym === 'None of the above') {
      setSymptoms(['None of the above'])
      return
    }
    const filtered = symptoms.filter(s => s !== 'None of the above')
    if (filtered.includes(sym)) {
      setSymptoms(filtered.filter(s => s !== sym))
    } else {
      setSymptoms([...filtered, sym])
    }
  }

  const handleSubmit = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      // Calculate recovery score
      let score = 100 - (painLevel * 4)
      const tempNum = parseFloat(temperature) || 36.6
      if (tempNum > 37.5) score -= 15
      if (tempNum > 38.2) score -= 25
      if (woundCondition === 'mild_redness') score -= 5
      if (woundCondition === 'swelling') score -= 15
      if (woundCondition === 'discharge') score -= 25
      if (woundCondition === 'severe') score -= 40
      if (medAdherence === 'some') score -= 10
      if (medAdherence === 'none') score -= 25
      score -= symptoms.filter(s => s !== 'None of the above').length * 5
      score = Math.max(10, Math.min(100, Math.round(score)))

      let risk = 'low'
      if (score < 50 || painLevel >= 8 || tempNum >= 38.5 || woundCondition === 'severe') {
        risk = 'high'
      } else if (score < 80 || painLevel >= 5 || tempNum >= 37.6 || woundCondition === 'swelling') {
        risk = 'medium'
      }

      setPrediction({
        score,
        risk,
        confidence: '92%',
        contributingFactors: [
          { name: 'Pain Level', weight: '30%' },
          { name: 'Wound Condition', weight: '25%' },
          { name: 'Body Temperature', weight: '20%' },
          { name: 'Medication Adherence', weight: '15%' },
          { name: 'Symptom Count', weight: '10%' }
        ]
      })
      setIsSubmitting(false)
      setSubmitted(true)
    }, 800)
  }

  return (
    <div className="max-w-form mx-auto space-y-6">
      <PageHeader
        title="Daily Recovery Check-In"
        description="Step-by-step health assessment to monitor your healing journey"
      />

      {!submitted ? (
        <Card>
          <CardHeader title={`Step ${step + 1} of 6`} />
          <CardBody>
            <div className="mb-8">
              <Stepper steps={stepsList} currentStep={step} />
            </div>

            {/* STEP 1: Pain */}
            {step === 0 && (
              <div className="space-y-4 py-4">
                <h3 className="text-md font-semibold text-text">How would you rate your current pain level?</h3>
                <p className="text-xs text-text-muted">Rate your pain right now on a scale from 0 (no pain) to 10 (worst possible pain).</p>
                <div className="py-6">
                  <Slider
                    min={0}
                    max={10}
                    value={painLevel}
                    onChange={setPainLevel}
                    minLabel="0 - No Pain"
                    maxLabel="10 - Severe Pain"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Temperature */}
            {step === 1 && (
              <div className="space-y-4 py-4">
                <h3 className="text-md font-semibold text-text">What is your current body temperature?</h3>
                <p className="text-xs text-text-muted">Take your temperature using a digital thermometer in Celsius (°C). Normal range is 36.1°C – 37.2°C.</p>
                <div className="flex items-center gap-3 max-w-xs pt-4">
                  <Thermometer className="text-primary" size={24} />
                  <input
                    type="number"
                    step="0.1"
                    min="34.0"
                    max="42.0"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full h-11 px-3 text-lg font-bold border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                  />
                  <span className="text-md font-semibold text-text-muted">°C</span>
                </div>
              </div>
            )}

            {/* STEP 3: Wound Condition */}
            {step === 2 && (
              <div className="space-y-4 py-4">
                <h3 className="text-md font-semibold text-text">Inspect your surgical incision / wound area</h3>
                <p className="text-xs text-text-muted">Select the option that best describes the incision appearance today:</p>
                <div className="space-y-2.5 pt-2">
                  {woundOptions.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setWoundCondition(opt.id)}
                      className={`p-3.5 border rounded-[8px] cursor-pointer transition-colors ${
                        woundCondition === opt.id
                          ? 'border-primary bg-primary-tint/40 shadow-xs'
                          : 'border-border hover:bg-surface-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-text">{opt.title}</span>
                        <input
                          type="radio"
                          name="wound"
                          checked={woundCondition === opt.id}
                          onChange={() => setWoundCondition(opt.id)}
                          className="text-primary"
                        />
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Symptoms */}
            {step === 3 && (
              <div className="space-y-4 py-4">
                <h3 className="text-md font-semibold text-text">Are you experiencing any of these symptoms today?</h3>
                <p className="text-xs text-text-muted">Select all that apply:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {symptomList.map((sym) => {
                    const isSelected = symptoms.includes(sym)
                    return (
                      <div
                        key={sym}
                        onClick={() => toggleSymptom(sym)}
                        className={`p-3 border rounded-[8px] cursor-pointer flex items-center justify-between text-xs font-medium transition-colors ${
                          isSelected ? 'border-primary bg-primary-tint/50 text-primary' : 'border-border hover:bg-surface-muted text-text'
                        }`}
                      >
                        <span>{sym}</span>
                        <input type="checkbox" checked={isSelected} onChange={() => {}} className="text-primary rounded" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 5: Medication Adherence */}
            {step === 4 && (
              <div className="space-y-4 py-4">
                <h3 className="text-md font-semibold text-text">Did you take all prescribed medications as instructed?</h3>
                <p className="text-xs text-text-muted">Keeping up with your prescription schedule ensures steady pain relief and avoids complications.</p>
                <div className="space-y-3 pt-2">
                  {[
                    { id: 'all', title: 'Took all prescribed doses', desc: 'Followed timing and dosing exactly as prescribed.' },
                    { id: 'some', title: 'Missed some doses', desc: 'Missed or delayed one or more prescribed medication doses.' },
                    { id: 'none', title: 'Did not take medications', desc: 'Did not take medications today due to side effects or forgetting.' }
                  ].map((med) => (
                    <div
                      key={med.id}
                      onClick={() => setMedAdherence(med.id)}
                      className={`p-3.5 border rounded-[8px] cursor-pointer transition-colors ${
                        medAdherence === med.id ? 'border-primary bg-primary-tint/40' : 'border-border hover:bg-surface-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-text">{med.title}</span>
                        <input type="radio" name="med" checked={medAdherence === med.id} onChange={() => setMedAdherence(med.id)} className="text-primary" />
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{med.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: Review & Submit */}
            {step === 5 && (
              <div className="space-y-4 py-4">
                <h3 className="text-md font-semibold text-text">Review your check-in answers</h3>
                <div className="bg-surface-muted rounded-[8px] p-4 space-y-3 text-xs border border-border">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-muted">Pain Rating:</span>
                    <strong className="text-text">{painLevel} / 10</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-muted">Body Temperature:</span>
                    <strong className="text-text">{temperature} °C</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-muted">Wound Condition:</span>
                    <strong className="text-text capitalize">{woundCondition.replace('_', ' ')}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-muted">Reported Symptoms:</span>
                    <strong className="text-text">{symptoms.length > 0 ? symptoms.join(', ') : 'None'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-text-muted">Medication Adherence:</span>
                    <strong className="text-text capitalize">{medAdherence}</strong>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-text mb-1">Additional notes or observations (optional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe any other sensations, questions for your doctor, or general feedback..."
                    className="w-full p-2.5 text-xs border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Form Actions Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-xs font-medium text-text-secondary border border-border rounded-sm hover:bg-surface-muted"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : <div />}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  className="inline-flex items-center gap-1.5 h-10 px-5 text-xs font-medium text-white bg-primary rounded-sm hover:bg-primary-hover shadow-xs"
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 h-10 px-6 text-xs font-semibold text-white bg-primary rounded-sm hover:bg-primary-hover shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Evaluating ML Model...' : 'Submit Recovery Check-In'} <Send size={14} />
                </button>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        /* Submission Result & ML Decision Support Card */
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader
              title="Assessment Complete & Recorded"
              description="Your recovery assessment has been processed through the decision-support engine"
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

                  <div className="p-3 bg-surface-muted rounded-[8px] text-xs space-y-1.5 border border-border">
                    <p className="font-semibold text-text">Model Confidence – Academic Prototype: <span className="text-primary font-bold">{prediction?.confidence}</span></p>
                    <p className="text-text-secondary">
                      {prediction?.risk === 'low'
                        ? 'Recovery parameters indicate steady, expected progress. Continue with your scheduled medication and activity restrictions.'
                        : prediction?.risk === 'medium'
                        ? 'Parameters suggest moderate symptom elevation. Maintain close observation and ensure you take all medications on time.'
                        : 'Alert generated for clinical staff. Please rest, keep the wound clean, and expect a follow-up consultation.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      to="/patient/dashboard"
                      className="h-9 px-4 bg-primary text-white text-xs font-medium rounded-sm hover:bg-primary-hover flex items-center justify-center"
                    >
                      Return to Dashboard
                    </Link>
                    <Link
                      to="/patient/messages"
                      className="h-9 px-4 border border-border-strong text-text text-xs font-medium rounded-sm hover:bg-surface-muted flex items-center justify-center"
                    >
                      Message Care Team
                    </Link>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <DisclaimerNote />
        </div>
      )}
    </div>
  )
}
