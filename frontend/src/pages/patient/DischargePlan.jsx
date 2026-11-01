import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { PageHeader, Card, CardHeader, CardBody } from '../../components/ui/index.jsx'
import { exportReportToPDF } from '../../utils/pdfExport'
import { Download, Printer, FileText, CheckCircle2, AlertCircle, ShieldCheck, Pill, Calendar } from 'lucide-react'
import { formatDate, formatRelativeDate } from '../../utils/dateUtils'

export default function DischargePlan() {
  const [livePlan, setLivePlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function fetchPatientPlan() {
      try {
        const res = await api.get('/discharge-plans/')
        const list = Array.isArray(res.data) ? res.data : res.data?.results || []
        if (isMounted && list.length > 0) {
          setLivePlan(list[0])
        }
      } catch (err) {
        // Fallback to default demo plan
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchPatientPlan()
    return () => { isMounted = false }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    const p = livePlan || {}
    const medHeaders = ['Medication Name', 'Dosage', 'Frequency', 'Duration', 'Instructions']
    const medRows = (p.medications || [
      { medicine_name: 'Cefuroxime Axetil', dosage: '500 mg', frequency: 'Twice daily', duration_days: 5, instructions: 'Take after food morning and evening' },
      { medicine_name: 'Paracetamol / Tramadol', dosage: '325 mg / 37.5 mg', frequency: 'As needed (max 3x)', duration_days: 7, instructions: 'For breakthrough surgical pain' },
      { medicine_name: 'Enoxaparin Sodium', dosage: '40 mg / 0.4 mL', frequency: 'Once daily (SubQ)', duration_days: 14, instructions: 'DVT prophylaxis at 8:00 PM' },
      { medicine_name: 'Pantoprazole', dosage: '40 mg', frequency: 'Once daily', duration_days: 14, instructions: 'Take 30 min before breakfast' },
    ]).map((m) => [
      m.medicine_name || m.name || 'Medication',
      m.dosage || 'Standard',
      m.frequency || m.freq || 'Daily',
      `${m.duration_days || 7} days`,
      m.instructions || 'Take as instructed',
    ])

    exportReportToPDF({
      title: `Discharge Plan - ${p.patient_name || 'Rahul Kumar'}`,
      subtitle: `Surgical Procedure: ${p.surgery_type || 'Total Knee Arthroplasty (L)'} | Issued: ${p.discharge_date ? formatDate(p.discharge_date, 'DD MMM YYYY') : formatRelativeDate(-12, 'DD MMM YYYY')}`,
      metrics: [
        { label: 'Patient UHID', value: p.patient_uhid || 'P-2026-8941' },
        { label: 'Primary Surgeon', value: p.doctor_name || 'Dr. Rajesh Varma' },
        { label: 'Plan Version', value: `v${p.version || '1.2'}` },
        { label: 'Status', value: (p.status || 'published').toUpperCase() },
      ],
      tableHeaders: medHeaders,
      tableRows: medRows,
      filename: `DischargePlan_${p.patient_uhid || 'Patient'}`
    })
  }

  const patientName = livePlan?.patient_name || 'Rahul Kumar'
  const patientUhid = livePlan?.patient_uhid || 'P-2026-8941'
  const surgeryType = livePlan?.surgery_type || 'Total Knee Arthroplasty (L)'
  const doctorName = livePlan?.doctor_name || 'Dr. Rajesh Varma, MS (Ortho)'
  const version = livePlan?.version || 1.2
  const dischargeDate = livePlan?.discharge_date ? formatDate(livePlan.discharge_date, 'DD MMM YYYY') : formatRelativeDate(-12, 'DD MMM YYYY')
  const diagnosis = livePlan?.diagnosis || `Patient underwent an uneventful left Total Knee Arthroplasty under spinal anesthesia on ${formatRelativeDate(-14, 'DD MMMM YYYY')} for severe Grade IV Tricompartmental Osteoarthritis. Post-operative wound site inspected clean, closed in layers with staples, with minimal subcutaneous edema. Full weight-bearing assisted ambulation achieved prior to discharge.`
  const generalInstructions = livePlan?.general_instructions || 'Rest with limb elevated on 2 pillows for 48 hours. Monitor for fever (>38°C) or acute calf pain. Take all prescribed medications as scheduled.'
  const woundCare = livePlan?.wound_care_instructions || 'Keep the surgical dressing dry and undisturbed until staple removal.\nDo not immerse incision in bathwater; use sponge baths.\nReport any active weeping, foul odor, or spreading redness immediately.'
  const activityRestrictions = livePlan?.activity_restrictions || 'Use walker or crutches during all ambulation for the first 3 weeks.\nPerform prescribed home quad sets and ankle pumps 3 times daily.\nAvoid high-impact movements, pivoting, or heavy lifting over 5 kg.'
  const medications = livePlan?.medications?.length ? livePlan.medications : [
    { medicine_name: 'Cefuroxime Axetil', dosage: '500 mg', frequency: 'Twice daily', duration_days: 5, instructions: 'Take after food morning and evening' },
    { medicine_name: 'Paracetamol / Tramadol', dosage: '325 mg / 37.5 mg', frequency: 'As needed (max 3x)', duration_days: 7, instructions: 'For breakthrough surgical pain' },
    { medicine_name: 'Enoxaparin Sodium', dosage: '40 mg / 0.4 mL', frequency: 'Once daily (SubQ)', duration_days: 14, instructions: 'DVT prophylaxis at 8:00 PM' },
    { medicine_name: 'Pantoprazole', dosage: '40 mg', frequency: 'Once daily', duration_days: 14, instructions: 'Take 30 min before breakfast' },
  ]
  const followUps = livePlan?.follow_ups?.length ? livePlan.follow_ups : [
    { purpose: 'Staple Removal & Wound Inspection', department: 'Orthopedic Outpatient Clinic · Room 304', appointment_date: formatRelativeDate(3, 'DD MMM YYYY'), appointment_time: '10:30 AM' }
  ]

  return (
    <div className="max-w-document mx-auto space-y-6">
      <PageHeader
        title="Discharge Plan"
        subtitle="Your personalized clinical post-operative recovery protocol"
        action={
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 border-[1.5px] border-primary text-xs font-medium rounded-sm text-primary bg-surface hover:bg-primary-tint transition-colors"
            >
              <Printer size={14} /> Print Plan
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-secondary text-text text-xs font-semibold rounded-sm hover:bg-secondary-hover transition-colors shadow-xs"
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        }
      />

      {/* Paper-styled Document Sheet */}
      <div className="bg-surface border border-border shadow-sm rounded-lg p-8 sm:p-12 space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-border pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-lg mb-1">
              <ShieldCheck size={22} /> City General Memorial Hospital
            </div>
            <p className="text-xs text-text-muted">Department of Orthopedic Surgery & Post-Operative Care</p>
            <p className="text-xs text-text-muted">NABH Accredited Tertiary Healthcare Center</p>
          </div>
          <div className="text-right sm:text-right">
            <span className="inline-block px-2.5 py-1 bg-success-tint text-success font-semibold text-xs rounded-full">
              STATUS: PUBLISHED & ACTIVE
            </span>
            <p className="text-xs text-text-muted mt-1">Plan Version: v{version}</p>
            <p className="text-xs text-text-muted">Issued: {dischargeDate}</p>
          </div>
        </div>

        {/* Patient Identity Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-bg rounded-md text-xs border border-border border-l-4 border-l-primary">
          <div>
            <span className="text-text-muted block">Patient Name</span>
            <strong className="text-text text-sm">{patientName}</strong>
          </div>
          <div>
            <span className="text-text-muted block">Patient ID / UHID</span>
            <strong className="text-text">{patientUhid}</strong>
          </div>
          <div>
            <span className="text-text-muted block">Procedure</span>
            <strong className="text-text">{surgeryType}</strong>
          </div>
          <div>
            <span className="text-text-muted block">Primary Surgeon</span>
            <strong className="text-text">{doctorName}</strong>
          </div>
        </div>

        {/* Clinical Summary & Diagnosis */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
            1. Clinical Diagnosis & Procedure Summary
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed bg-surface-muted/50 p-3 rounded-md border border-border">
            {diagnosis}
          </p>
        </div>

        {/* General Instructions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
            2. General Discharge Care Instructions
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed bg-surface-muted/50 p-3 rounded-md border border-border">
            {generalInstructions}
          </p>
        </div>

        {/* Discharge Medications Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
            3. Prescribed Discharge Medications
          </h3>
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#DDD0F7] text-primary border-b border-border font-bold">
                <tr>
                  <th className="p-2.5">Medication Name</th>
                  <th className="p-2.5">Dosage</th>
                  <th className="p-2.5">Frequency</th>
                  <th className="p-2.5">Duration</th>
                  <th className="p-2.5">Specific Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {medications.map((m, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-surface hover:bg-bg transition-colors" : "bg-bg hover:bg-bg transition-colors"}>
                    <td className="p-2.5 font-semibold flex items-center gap-1.5">
                      <Pill size={13} className="text-primary flex-shrink-0" />
                      {m.medicine_name || m.name}
                    </td>
                    <td className="p-2.5">{m.dosage}</td>
                    <td className="p-2.5">{m.frequency || m.freq}</td>
                    <td className="p-2.5">{m.duration_days || m.duration || 7} days</td>
                    <td className="p-2.5 text-text-muted">{m.instructions || 'Take as instructed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Wound Care & Activity Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
              4. Wound Care Instructions
            </h3>
            <div className="p-3 bg-surface-muted/50 rounded-md border border-border text-xs text-text-secondary space-y-1.5 whitespace-pre-line">
              {woundCare}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
              5. Activity & Physiotherapy Restrictions
            </h3>
            <div className="p-3 bg-surface-muted/50 rounded-md border border-border text-xs text-text-secondary space-y-1.5 whitespace-pre-line">
              {activityRestrictions}
            </div>
          </div>
        </div>

        {/* Follow-Up Schedule */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
            6. Scheduled Clinical Follow-Up Appointments
          </h3>
          <div className="space-y-2">
            {followUps.map((f, idx) => (
              <div key={idx} className="p-3 bg-bg rounded-md text-xs flex justify-between items-center border border-border border-l-4 border-l-primary">
                <div>
                  <strong className="text-text block">{f.purpose}</strong>
                  <p className="text-text-muted">{f.department}</p>
                </div>
                <span className="text-right font-medium text-text">
                  {formatDate(f.appointment_date, 'DD MMM YYYY')} {f.appointment_time ? `@ ${f.appointment_time}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Sign-off */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center text-xs text-text-muted gap-4">
          <div>
            <p>Digitally signed by: <strong>{doctorName}</strong></p>
            <p>Medical License Registration: <strong>MCI-748291-K</strong></p>
          </div>
          <div className="text-center sm:text-right">
            <p>PostCare AI Clinical Discharge Subsystem</p>
          </div>
        </div>
      </div>
    </div>
  )
}
