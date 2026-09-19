import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, Stepper, ConfirmDialog } from '../../components/ui/index.jsx'
import { ArrowLeft, ArrowRight, Save, Check, Plus, Trash2 } from 'lucide-react'

export default function DischargePlanEdit() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [publishModal, setPublishModal] = useState(false)

  const stepsList = [
    { id: 1, label: 'Patient & Surgery' },
    { id: 2, label: 'Clinical Instructions' },
    { id: 3, label: 'Medication Plan' },
    { id: 4, label: 'Follow-Up Schedule' },
    { id: 5, label: 'Review & Publish' },
  ]

  // Form State
  const [patientName, setPatientName] = useState('Rahul Kumar (P-102)')
  const [surgeryType, setSurgeryType] = useState('Total Knee Arthroplasty (L)')
  const [surgeryDate, setSurgeryDate] = useState('2026-09-04')
  const [dischargeDate, setDischargeDate] = useState('2026-09-06')
  const [diagnosis, setDiagnosis] = useState('Severe Grade IV Tricompartmental Osteoarthritis of left knee.')

  const [woundCare, setWoundCare] = useState('Keep dressing clean & dry. Sponge bath only. Report weeping.')
  const [activity, setActivity] = useState('Walker assisted ambulation. Perform home quad sets 3x daily.')
  const [diet, setDiet] = useState('High protein recovery diet. Adequate hydration (2.5L/day).')

  const [meds, setMeds] = useState([
    { name: 'Cefuroxime Axetil', dosage: '500 mg', freq: 'Twice daily', duration: '5 days', instructions: 'After food' },
    { name: 'Paracetamol / Tramadol', dosage: '325mg / 37.5mg', freq: 'As needed', duration: '7 days', instructions: 'For pain' },
  ])

  const [newMed, setNewMed] = useState({ name: '', dosage: '', freq: 'Once daily', duration: '7 days', instructions: '' })

  const addMed = () => {
    if (!newMed.name) return
    setMeds([...meds, newMed])
    setNewMed({ name: '', dosage: '', freq: 'Once daily', duration: '7 days', instructions: '' })
  }

  const removeMed = (index) => {
    setMeds(meds.filter((_, i) => i !== index))
  }

  const handlePublish = () => {
    setPublishModal(false)
    navigate('/doctor/discharge-plans')
  }

  return (
    <div className="max-w-form mx-auto space-y-6">
      <PageHeader
        title="Author Post-Operative Discharge Plan"
        description="Multi-step clinical authoring wizard for post-surgical care trajectories"
      />

      <Card>
        <CardHeader title={`Wizard Step ${step + 1} of 5`} />
        <CardBody>
          <div className="mb-8">
            <Stepper steps={stepsList} currentStep={step} />
          </div>

          {/* STEP 1 */}
          {step === 0 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-text">Patient Demographics & Surgical Particulars</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-medium text-text mb-1">Select Patient</label>
                  <input value={patientName} onChange={e => setPatientName(e.target.value)} className="w-full p-2.5 border rounded focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block font-medium text-text mb-1">Surgical Procedure</label>
                  <input value={surgeryType} onChange={e => setSurgeryType(e.target.value)} className="w-full p-2.5 border rounded focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block font-medium text-text mb-1">Date of Surgery</label>
                  <input type="date" value={surgeryDate} onChange={e => setSurgeryDate(e.target.value)} className="w-full p-2.5 border rounded focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block font-medium text-text mb-1">Date of Discharge</label>
                  <input type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} className="w-full p-2.5 border rounded focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block font-medium text-text mb-1">Primary Clinical Diagnosis</label>
                <textarea rows={3} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full p-2.5 border rounded focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-text">Clinical Instructions & Restrictions</h3>
              <div>
                <label className="block font-medium text-text mb-1">Wound Care & Dressing Instructions</label>
                <textarea rows={3} value={woundCare} onChange={e => setWoundCare(e.target.value)} className="w-full p-2.5 border rounded focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block font-medium text-text mb-1">Physical Activity & Ambulation Restrictions</label>
                <textarea rows={3} value={activity} onChange={e => setActivity(e.target.value)} className="w-full p-2.5 border rounded focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block font-medium text-text mb-1">Dietary & Hydration Guidelines</label>
                <textarea rows={2} value={diet} onChange={e => setDiet(e.target.value)} className="w-full p-2.5 border rounded focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-text">Discharge Medication Prescriptions</h3>
              <div className="space-y-2">
                {meds.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-surface-muted rounded border border-border">
                    <div>
                      <strong className="text-text">{m.name}</strong> ({m.dosage}) — <span className="text-primary">{m.freq}</span> for {m.duration}
                      <p className="text-2xs text-text-muted mt-0.5">{m.instructions}</p>
                    </div>
                    <button onClick={() => removeMed(idx)} className="text-danger hover:text-danger-hover">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Med Row */}
              <div className="p-3 border border-border-strong rounded-md space-y-3 bg-bg/50 mt-4">
                <p className="font-semibold text-text">Add Prescription Row</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input placeholder="Drug name" value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} className="p-2 border rounded" />
                  <input placeholder="Dosage (e.g. 500mg)" value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })} className="p-2 border rounded" />
                  <input placeholder="Frequency" value={newMed.freq} onChange={e => setNewMed({ ...newMed, freq: e.target.value })} className="p-2 border rounded" />
                  <input placeholder="Duration (e.g. 5 days)" value={newMed.duration} onChange={e => setNewMed({ ...newMed, duration: e.target.value })} className="p-2 border rounded" />
                </div>
                <button onClick={addMed} type="button" className="px-3 py-1.5 bg-primary text-white font-medium rounded flex items-center gap-1">
                  <Plus size={13} /> Add Prescription
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-text">Follow-Up Consultations</h3>
              <div className="p-4 bg-surface-muted rounded border border-border space-y-2">
                <div className="flex justify-between font-semibold text-text">
                  <span>In-Person Staple Removal Consultation</span>
                  <span className="text-primary">24 Sep 2026 @ 10:30 AM</span>
                </div>
                <p className="text-text-muted">Room 304, OPD Block B · Orthopedics</p>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 4 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-text">Review Plan Summary Before Publishing</h3>
              <div className="p-4 bg-surface-muted rounded border border-border space-y-2">
                <p><strong>Patient:</strong> {patientName}</p>
                <p><strong>Procedure:</strong> {surgeryType}</p>
                <p><strong>Prescriptions:</strong> {meds.length} drugs configured</p>
                <p><strong>Wound Protocol:</strong> {woundCare}</p>
              </div>
              <p className="text-2xs text-text-muted">
                Publishing will make this plan immediately accessible to the patient and nursing staff.
              </p>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-medium text-text-secondary border border-border rounded hover:bg-surface-muted"
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="inline-flex items-center gap-1.5 h-9 px-5 text-xs font-semibold text-white bg-primary rounded hover:bg-primary-hover shadow-xs"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPublishModal(true)}
                className="inline-flex items-center gap-1.5 h-9 px-6 text-xs font-bold text-white bg-success hover:bg-success-hover rounded shadow-xs"
              >
                <Check size={14} /> Publish Discharge Plan
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={publishModal}
        onClose={() => setPublishModal(false)}
        onConfirm={handlePublish}
        title="Publish Post-Operative Discharge Plan"
        description="Are you sure you want to publish and digitally sign this plan? It will be immediately activated for patient recovery tracking."
        confirmLabel="Publish Plan"
        variant="warning"
      />
    </div>
  )
}
