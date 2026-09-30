import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, Stepper, ConfirmDialog } from '../../components/ui/index.jsx'
import { ArrowLeft, ArrowRight, Save, Check, Plus, Trash2, AlertCircle, FileCheck, CheckCircle } from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'

export default function DischargePlanEdit() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(false)
  const [publishModal, setPublishModal] = useState(false)
  const [errors, setErrors] = useState({})

  const stepsList = [
    { id: 1, label: 'Patient & Surgery' },
    { id: 2, label: 'Instructions' },
    { id: 3, label: 'Medications' },
    { id: 4, label: 'Activity & Wound' },
    { id: 5, label: 'Follow-Up Plan' },
    { id: 6, label: 'Review & Publish' },
  ]

  // Form State
  const [formData, setFormData] = useState({
    // Section 1
    patientId: '',
    surgeryType: 'Total Knee Arthroplasty (L)',
    surgeryDate: '2026-09-04',
    dischargeDate: '2026-09-06',
    diagnosis: 'Severe Grade IV Tricompartmental Osteoarthritis of left knee.',

    // Section 2
    generalInstructions: 'Rest with limb elevated on 2 pillows for 48 hours. Monitor for fever (>38°C) or acute calf pain. Take all prescribed medications as scheduled.',
    warningSigns: 'Sudden chest tightness, shortness of breath, continuous wound bleeding, persistent calf pain or swelling.',
    specialNotes: '',

    // Section 3
    medications: [
      { medicine_name: 'Cefuroxime Axetil', dosage: '500 mg', frequency: 'Twice daily', duration_days: 5, instructions: 'Take after meals with water' },
      { medicine_name: 'Paracetamol / Tramadol', dosage: '325mg / 37.5mg', frequency: 'As needed (every 8 hrs)', duration_days: 7, instructions: 'For acute post-op breakthrough pain' },
    ],

    // Section 4
    woundCare: 'Keep dressing dry and sealed. Sponge bath only until staple removal. Do not apply unprescribed ointments.',
    activityRestrictions: 'Walker-assisted ambulation only. Perform quad sets and ankle pumps 3x daily. No stair climbing without assistance.',
    dietInstructions: 'High protein recovery diet (eggs, lentils, lean protein). Minimum 2.5 liters of water daily.',

    // Section 5
    followUpDate: '2026-09-18',
    followUpTime: '10:00',
    department: 'Orthopedic Surgery OPD',
    followUpPurpose: 'Post-Op Day 14 Staple Removal and Joint Range of Motion Evaluation',
    emergencyContact: 'Orthopedic Triage Hotline: +91 98765 43210 (24/7)',
  })

  const [newMed, setNewMed] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'Twice daily',
    duration_days: 7,
    instructions: ''
  })

  // Fetch real patient list from backend
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get('/patients/')
        const list = Array.isArray(res.data) ? res.data : res.data.results || []
        setPatients(list)
        if (list.length > 0 && !formData.patientId) {
          setFormData(prev => ({ ...prev, patientId: list[0].id }))
        }
      } catch (err) {
        // Fallback default
        setFormData(prev => ({ ...prev, patientId: 1 }))
      }
    }
    fetchPatients()
  }, [])

  const validateStep = (currentStep) => {
    const newErrors = {}

    if (currentStep === 0) {
      if (!formData.patientId) newErrors.patientId = 'Please select a patient before continuing.'
      if (!formData.surgeryType?.trim()) newErrors.surgeryType = 'Please specify the surgical procedure.'
      if (!formData.surgeryDate) newErrors.surgeryDate = 'Please select the date of surgery.'
      if (!formData.dischargeDate) newErrors.dischargeDate = 'Please select the discharge date.'
    } else if (currentStep === 1) {
      if (!formData.generalInstructions?.trim()) {
        newErrors.generalInstructions = 'Please provide primary post-operative care instructions.'
      }
      if (!formData.warningSigns?.trim()) {
        newErrors.warningSigns = 'Please specify red flag warning signs and escalation criteria.'
      }
    } else if (currentStep === 2) {
      if (formData.medications.length === 0) {
        newErrors.medications = 'Please prescribe at least one discharge medication before proceeding.'
      }
    } else if (currentStep === 3) {
      if (!formData.woundCare?.trim()) {
        newErrors.woundCare = 'Please complete wound care & dressing instructions.'
      }
      if (!formData.activityRestrictions?.trim()) {
        newErrors.activityRestrictions = 'Please complete mobility & activity restrictions.'
      }
    } else if (currentStep === 4) {
      if (!formData.followUpDate) newErrors.followUpDate = 'Please specify the follow-up appointment date.'
      if (!formData.department?.trim()) newErrors.department = 'Please specify the follow-up department or clinic.'
      if (!formData.followUpPurpose?.trim()) newErrors.followUpPurpose = 'Please specify the clinical purpose of the visit.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, 5))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      toast.error('Please complete all required fields in this section before continuing.')
    }
  }

  const handlePrev = () => {
    setErrors({})
    setStep(s => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addMedication = () => {
    if (!newMed.medicine_name.trim() || !newMed.dosage.trim()) {
      toast.error('Please provide medication name and dosage.')
      return
    }
    setFormData({
      ...formData,
      medications: [...formData.medications, { ...newMed, duration_days: parseInt(newMed.duration_days) || 7 }]
    })
    setNewMed({ medicine_name: '', dosage: '', frequency: 'Twice daily', duration_days: 7, instructions: '' })
    setErrors(prev => ({ ...prev, medications: null }))
  }

  const removeMedication = (index) => {
    setFormData({
      ...formData,
      medications: formData.medications.filter((_, i) => i !== index)
    })
  }

  const handlePublishPlan = async () => {
    try {
      setLoading(true)
      const payload = {
        patient: formData.patientId,
        surgery_type: formData.surgeryType,
        surgery_date: formData.surgeryDate,
        discharge_date: formData.dischargeDate,
        diagnosis: formData.diagnosis || 'Post-operative recovery management',
        general_instructions: `${formData.generalInstructions}\n\nWARNING SIGNS:\n${formData.warningSigns}${formData.specialNotes ? `\n\nNOTES:\n${formData.specialNotes}` : ''}`,
        wound_care_instructions: formData.woundCare,
        activity_restrictions: formData.activityRestrictions,
        diet_instructions: formData.dietInstructions,
        status: 'published',
        medications: formData.medications,
        follow_ups: [{
          appointment_date: formData.followUpDate,
          appointment_time: formData.followUpTime ? `${formData.followUpTime}:00` : '10:00:00',
          department: formData.department,
          purpose: `${formData.followUpPurpose}${formData.emergencyContact ? ` | Emergency Contact: ${formData.emergencyContact}` : ''}`
        }]
      }

      await api.post('/discharge-plans/', payload)
      toast.success('Post-operative discharge plan authorized and published successfully!')
      setPublishModal(false)
      navigate('/doctor/discharge-plans')
    } catch (err) {
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to publish discharge plan')
    } finally {
      setLoading(false)
    }
  }

  const selectedPatient = patients.find(p => p.id === parseInt(formData.patientId))

  return (
    <div className="max-w-form mx-auto space-y-6">
      <PageHeader
        title="Author Post-Operative Discharge Plan"
        description="Controlled 6-step clinical protocol wizard for post-surgical care trajectories"
      />

      <Card>
        <CardHeader
          title={`Step ${step + 1} of 6: ${stepsList[step].label}`}
          description="Complete all mandatory clinical parameters indicated with Required *"
        />
        <CardBody>
          <div className="mb-8">
            <Stepper steps={stepsList} currentStep={step} onStepClick={(targetStep) => {
              if (targetStep < step || validateStep(step)) {
                setStep(targetStep)
              }
            }} />
          </div>

          {/* STEP 1: Patient & Surgery Information */}
          {step === 0 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-surface-muted rounded-lg border border-border">
                <h4 className="font-bold text-text mb-1">Section 1: Patient Demographics & Surgical Particulars</h4>
                <p className="text-2xs text-text-muted">Select patient record and verify procedure dates.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-text mb-1">
                    Select Patient <span className="text-danger">* (Required)</span>
                  </label>
                  <select
                    value={formData.patientId}
                    onChange={e => {
                      setFormData({ ...formData, patientId: e.target.value })
                      setErrors({ ...errors, patientId: null })
                    }}
                    className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.patientId ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  >
                    {patients.length === 0 ? (
                      <option value="1">Rahul Kumar (PAT-001) - Knee Surgery</option>
                    ) : (
                      patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.patient_name || p.user?.first_name ? `${p.user?.first_name} ${p.user?.last_name || ''} (${p.patient_id || p.id})` : `Patient #${p.id}`} — {p.surgery_type || 'General Surgery'}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.patientId && (
                    <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {errors.patientId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">
                    Surgical Procedure <span className="text-danger">* (Required)</span>
                  </label>
                  <input
                    value={formData.surgeryType}
                    onChange={e => {
                      setFormData({ ...formData, surgeryType: e.target.value })
                      setErrors({ ...errors, surgeryType: null })
                    }}
                    placeholder="e.g. Total Knee Arthroplasty (L)"
                    className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.surgeryType ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  />
                  {errors.surgeryType && (
                    <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {errors.surgeryType}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">
                    Date of Surgery <span className="text-danger">* (Required)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.surgeryDate}
                    onChange={e => {
                      setFormData({ ...formData, surgeryDate: e.target.value })
                      setErrors({ ...errors, surgeryDate: null })
                    }}
                    className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.surgeryDate ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  />
                  {errors.surgeryDate && (
                    <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {errors.surgeryDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">
                    Date of Discharge <span className="text-danger">* (Required)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dischargeDate}
                    onChange={e => {
                      setFormData({ ...formData, dischargeDate: e.target.value })
                      setErrors({ ...errors, dischargeDate: null })
                    }}
                    className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.dischargeDate ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  />
                  {errors.dischargeDate && (
                    <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {errors.dischargeDate}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Primary Clinical Diagnosis <span className="text-text-muted font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.diagnosis}
                  onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Primary surgical diagnosis and operative notes..."
                  className="w-full p-2.5 bg-surface border border-border rounded text-xs focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Post-Operative Instructions */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-surface-muted rounded-lg border border-border">
                <h4 className="font-bold text-text mb-1">Section 2: Post-Operative Instructions & Red Flags</h4>
                <p className="text-2xs text-text-muted">Define mandatory care instructions and acute escalation triggers.</p>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  General Recovery Care Protocol <span className="text-danger">* (Required)</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.generalInstructions}
                  onChange={e => {
                    setFormData({ ...formData, generalInstructions: e.target.value })
                    setErrors({ ...errors, generalInstructions: null })
                  }}
                  className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.generalInstructions ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  placeholder="Mandatory patient recovery guidance..."
                />
                {errors.generalInstructions && (
                  <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} /> {errors.generalInstructions}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Acute Warning Signs & Escalation Triggers <span className="text-danger">* (Required)</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.warningSigns}
                  onChange={e => {
                    setFormData({ ...formData, warningSigns: e.target.value })
                    setErrors({ ...errors, warningSigns: null })
                  }}
                  className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.warningSigns ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  placeholder="Red flags requiring immediate emergency room visit or triage call..."
                />
                {errors.warningSigns && (
                  <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} /> {errors.warningSigns}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Additional Clinical Notes <span className="text-text-muted font-normal">(Optional)</span>
                </label>
                <input
                  value={formData.specialNotes}
                  onChange={e => setFormData({ ...formData, specialNotes: e.target.value })}
                  placeholder="Extra non-essential comments..."
                  className="w-full p-2.5 bg-surface border border-border rounded text-xs focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Medication Plan */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-surface-muted rounded-lg border border-border">
                <h4 className="font-bold text-text mb-1">Section 3: Discharge Medication Regimen</h4>
                <p className="text-2xs text-text-muted">Prescribe at least one mandatory discharge medication with clear dosage and frequency.</p>
              </div>

              {errors.medications && (
                <div className="p-3 bg-danger-tint border border-danger/20 rounded-lg flex items-center gap-2 text-danger">
                  <AlertCircle size={15} />
                  <span className="font-medium">{errors.medications}</span>
                </div>
              )}

              {/* Medication Table */}
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted border-b border-border font-semibold text-text-secondary">
                    <tr>
                      <th className="p-2.5">Medicine Name</th>
                      <th className="p-2.5">Dosage</th>
                      <th className="p-2.5">Frequency</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">Instructions</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {formData.medications.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-4 text-center text-text-muted">No medications prescribed yet. Add at least one below.</td>
                      </tr>
                    ) : (
                      formData.medications.map((m, idx) => (
                        <tr key={idx} className="hover:bg-surface-muted/50">
                          <td className="p-2.5 font-semibold text-text">{m.medicine_name}</td>
                          <td className="p-2.5 text-text-secondary">{m.dosage}</td>
                          <td className="p-2.5">{m.frequency}</td>
                          <td className="p-2.5 text-text-muted">{m.duration_days} days</td>
                          <td className="p-2.5 text-text-secondary">{m.instructions || 'As directed'}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeMedication(idx)}
                              className="text-danger hover:text-danger-hover p-1"
                              title="Remove medication"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add New Med Box */}
              <div className="p-3 border border-dashed border-primary/40 bg-primary-tint/20 rounded-lg space-y-3">
                <h5 className="font-semibold text-primary flex items-center gap-1.5">
                  <Plus size={14} /> Add Prescribed Medication
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-2xs font-medium text-text-secondary mb-1">Medicine Name *</label>
                    <input
                      placeholder="e.g. Amoxicillin"
                      value={newMed.medicine_name}
                      onChange={e => setNewMed({ ...newMed, medicine_name: e.target.value })}
                      className="w-full p-2 bg-surface border border-border rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-medium text-text-secondary mb-1">Dosage *</label>
                    <input
                      placeholder="e.g. 500 mg"
                      value={newMed.dosage}
                      onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="w-full p-2 bg-surface border border-border rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-medium text-text-secondary mb-1">Frequency *</label>
                    <select
                      value={newMed.frequency}
                      onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                      className="w-full p-2 bg-surface border border-border rounded text-xs"
                    >
                      <option value="Once daily">Once daily (OD)</option>
                      <option value="Twice daily">Twice daily (BD)</option>
                      <option value="Thrice daily">Thrice daily (TDS)</option>
                      <option value="Every 4-6 hours">Every 4-6 hours</option>
                      <option value="As needed (SOS)">As needed (SOS)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-2xs font-medium text-text-secondary mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={newMed.duration_days}
                      onChange={e => setNewMed({ ...newMed, duration_days: e.target.value })}
                      className="w-full p-2 bg-surface border border-border rounded text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    placeholder="Specific timing instructions (e.g. after meals with full glass of water)"
                    value={newMed.instructions}
                    onChange={e => setNewMed({ ...newMed, instructions: e.target.value })}
                    className="flex-1 p-2 bg-surface border border-border rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={addMedication}
                    className="px-3.5 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors whitespace-nowrap"
                  >
                    Add Medication
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Activity / Diet / Wound Care */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-surface-muted rounded-lg border border-border">
                <h4 className="font-bold text-text mb-1">Section 4: Activity, Diet & Wound Care Protocol</h4>
                <p className="text-2xs text-text-muted">Specify wound maintenance rules and weight-bearing/mobility milestones.</p>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Wound Dressing & Hygiene Instructions <span className="text-danger">* (Required)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.woundCare}
                  onChange={e => {
                    setFormData({ ...formData, woundCare: e.target.value })
                    setErrors({ ...errors, woundCare: null })
                  }}
                  className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.woundCare ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                />
                {errors.woundCare && (
                  <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} /> {errors.woundCare}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Physical Activity & Mobility Restrictions <span className="text-danger">* (Required)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.activityRestrictions}
                  onChange={e => {
                    setFormData({ ...formData, activityRestrictions: e.target.value })
                    setErrors({ ...errors, activityRestrictions: null })
                  }}
                  className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.activityRestrictions ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                />
                {errors.activityRestrictions && (
                  <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} /> {errors.activityRestrictions}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Dietary & Nutritional Guidance <span className="text-text-muted font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.dietInstructions}
                  onChange={e => setFormData({ ...formData, dietInstructions: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded text-xs focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* STEP 5: Follow-Up Plan */}
          {step === 4 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-surface-muted rounded-lg border border-border">
                <h4 className="font-bold text-text mb-1">Section 5: Post-Operative Follow-Up Consultation</h4>
                <p className="text-2xs text-text-muted">Schedule the initial mandatory clinic review and specify provider location.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-text mb-1">
                    Follow-Up Date <span className="text-danger">* (Required)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={e => {
                      setFormData({ ...formData, followUpDate: e.target.value })
                      setErrors({ ...errors, followUpDate: null })
                    }}
                    className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.followUpDate ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  />
                  {errors.followUpDate && (
                    <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {errors.followUpDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">
                    Appointment Time <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="time"
                    value={formData.followUpTime}
                    onChange={e => setFormData({ ...formData, followUpTime: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-text mb-1">
                    Department / Provider Clinic <span className="text-danger">* (Required)</span>
                  </label>
                  <input
                    value={formData.department}
                    onChange={e => {
                      setFormData({ ...formData, department: e.target.value })
                      setErrors({ ...errors, department: null })
                    }}
                    placeholder="e.g. Orthopedic Surgery OPD, Room 204"
                    className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.department ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  />
                  {errors.department && (
                    <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {errors.department}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-text mb-1">
                    Clinical Purpose of Follow-Up <span className="text-danger">* (Required)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.followUpPurpose}
                    onChange={e => {
                      setFormData({ ...formData, followUpPurpose: e.target.value })
                      setErrors({ ...errors, followUpPurpose: null })
                    }}
                    placeholder="e.g. Staple removal, wound inspection, ROM mobility checks"
                    className={`w-full p-2.5 bg-surface border rounded text-xs focus:ring-2 focus:ring-primary ${errors.followUpPurpose ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                  />
                  {errors.followUpPurpose && (
                    <p className="text-2xs text-danger mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {errors.followUpPurpose}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-text mb-1">
                    Emergency Helpline Contact <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    value={formData.emergencyContact}
                    onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Review & Publish */}
          {step === 5 && (
            <div className="space-y-5 text-xs">
              <div className="p-3.5 bg-success-tint border border-success/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-success font-medium">
                  <CheckCircle size={18} />
                  <span>All 5 mandatory sections have been completed and clinically validated.</span>
                </div>
                <span className="text-2xs font-semibold px-2 py-0.5 bg-success text-white rounded-full">Ready to Authorize</span>
              </div>

              {/* Review summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-surface-muted rounded-lg border border-border space-y-2">
                  <h5 className="font-bold text-text border-b border-border pb-1">1. Patient & Surgical Particulars</h5>
                  <p><span className="text-text-muted">Procedure:</span> <strong className="text-text">{formData.surgeryType}</strong></p>
                  <p><span className="text-text-muted">Surgery Date:</span> {formData.surgeryDate} | <span className="text-text-muted">Discharge:</span> {formData.dischargeDate}</p>
                  <p><span className="text-text-muted">Diagnosis:</span> {formData.diagnosis}</p>
                </div>

                <div className="p-4 bg-surface-muted rounded-lg border border-border space-y-2">
                  <h5 className="font-bold text-text border-b border-border pb-1">2. Instructions & Red Flags</h5>
                  <p><span className="text-text-muted">Protocol:</span> {formData.generalInstructions}</p>
                  <p className="text-danger font-medium"><span className="text-text-muted">Red Flags:</span> {formData.warningSigns}</p>
                </div>

                <div className="p-4 bg-surface-muted rounded-lg border border-border space-y-2">
                  <h5 className="font-bold text-text border-b border-border pb-1">3. Medication Regimen ({formData.medications.length} items)</h5>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary">
                    {formData.medications.map((m, i) => (
                      <li key={i}><strong>{m.medicine_name}</strong> — {m.dosage} ({m.frequency} for {m.duration_days}d)</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-surface-muted rounded-lg border border-border space-y-2">
                  <h5 className="font-bold text-text border-b border-border pb-1">4. Wound & Follow-Up</h5>
                  <p><span className="text-text-muted">Wound Care:</span> {formData.woundCare}</p>
                  <p><span className="text-text-muted">Activity:</span> {formData.activityRestrictions}</p>
                  <p><span className="text-text-muted">Follow-Up:</span> <strong>{formData.followUpDate} at {formData.followUpTime}</strong> ({formData.department})</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
            <button
              type="button"
              disabled={step === 0}
              onClick={handlePrev}
              className="h-9 px-4 border border-border-strong text-xs font-semibold rounded text-text hover:bg-surface-muted disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Previous Step
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-9 px-5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover shadow-xs transition-colors flex items-center gap-1.5"
              >
                Next Step <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => setPublishModal(true)}
                className="h-10 px-6 bg-success text-white text-xs font-bold rounded-lg hover:bg-success-hover shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <FileCheck size={16} /> Publish & Authorize Discharge Plan
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={publishModal}
        title="Authorize & Publish Discharge Plan"
        message="Are you sure you want to authorize this post-operative discharge plan? It will be officially signed and immediately made accessible to the patient and care team."
        confirmText={loading ? "Publishing..." : "Yes, Authorize Plan"}
        onConfirm={handlePublishPlan}
        onCancel={() => setPublishModal(false)}
      />
    </div>
  )
}
