import React from 'react'
import { PageHeader, Card, CardHeader, CardBody, DisclaimerNote } from '../../components/ui/index.jsx'
import { Download, Printer, FileText, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'

export default function DischargePlan() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-document mx-auto space-y-6">
      <PageHeader
        title="Post-Operative Discharge Plan"
        description="Comprehensive clinical care summary, medication schedule, and recovery guidelines"
        action={
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-border-strong text-xs font-medium rounded-sm text-text bg-white hover:bg-surface-muted transition-colors"
            >
              <Printer size={14} /> Print Plan
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-xs font-medium rounded-sm hover:bg-primary-hover transition-colors shadow-xs"
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        }
      />

      {/* Paper-styled Document Sheet */}
      <div className="bg-white border border-border shadow-sm rounded-lg p-8 sm:p-12 space-y-8 print:p-0 print:border-none print:shadow-none">
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
            <p className="text-xs text-text-muted mt-1">Plan Version: 1.2</p>
            <p className="text-xs text-text-muted">Issued: 06 Sep 2026</p>
          </div>
        </div>

        {/* Patient Identity Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-surface-muted rounded-md text-xs border border-border">
          <div>
            <span className="text-text-muted block">Patient Name</span>
            <strong className="text-text text-sm">Rahul Kumar</strong>
          </div>
          <div>
            <span className="text-text-muted block">Patient ID / UHID</span>
            <strong className="text-text">P-2026-8941</strong>
          </div>
          <div>
            <span className="text-text-muted block">Procedure</span>
            <strong className="text-text">Total Knee Arthroplasty (L)</strong>
          </div>
          <div>
            <span className="text-text-muted block">Primary Surgeon</span>
            <strong className="text-text">Dr. Rajesh Varma, MS (Ortho)</strong>
          </div>
        </div>

        {/* Clinical Summary & Diagnosis */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider text-primary border-b border-border pb-1">
            1. Clinical Diagnosis & Procedure Summary
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Patient underwent an uneventful left Total Knee Arthroplasty under spinal anesthesia on 04 September 2026 for severe Grade IV Tricompartmental Osteoarthritis. Post-operative wound site inspected clean, closed in layers with staples, with minimal subcutaneous edema. Full weight-bearing assisted ambulation achieved prior to discharge.
          </p>
        </div>

        {/* Discharge Medications Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider text-primary border-b border-border pb-1">
            2. Prescribed Discharge Medications
          </h3>
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-medium">
                <tr>
                  <th className="p-2.5">Medication Name</th>
                  <th className="p-2.5">Dosage</th>
                  <th className="p-2.5">Frequency</th>
                  <th className="p-2.5">Duration</th>
                  <th className="p-2.5">Specific Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                <tr>
                  <td className="p-2.5 font-semibold">Cefuroxime Axetil</td>
                  <td className="p-2.5">500 mg</td>
                  <td className="p-2.5">Twice daily</td>
                  <td className="p-2.5">5 days</td>
                  <td className="p-2.5 text-text-muted">Take after food morning and evening</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold">Paracetamol / Tramadol</td>
                  <td className="p-2.5">325 mg / 37.5 mg</td>
                  <td className="p-2.5">As needed (max 3x)</td>
                  <td className="p-2.5">7 days</td>
                  <td className="p-2.5 text-text-muted">For breakthrough surgical pain</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold">Enoxaparin Sodium</td>
                  <td className="p-2.5">40 mg / 0.4 mL</td>
                  <td className="p-2.5">Once daily (SubQ)</td>
                  <td className="p-2.5">14 days</td>
                  <td className="p-2.5 text-text-muted">DVT prophylaxis at 8:00 PM</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold">Pantoprazole</td>
                  <td className="p-2.5">40 mg</td>
                  <td className="p-2.5">Once daily</td>
                  <td className="p-2.5">14 days</td>
                  <td className="p-2.5 text-text-muted">Take 30 min before breakfast</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Wound Care & Activity Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider text-primary border-b border-border pb-1">
              3. Wound Care Instructions
            </h3>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>Keep the surgical dressing dry and undisturbed until staple removal.</li>
              <li>Do not immerse incision in bathwater; use sponge baths.</li>
              <li>Report any active weeping, foul odor, or spreading redness immediately.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider text-primary border-b border-border pb-1">
              4. Activity & Physiotherapy Restrictions
            </h3>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>Use walker or crutches during all ambulation for the first 3 weeks.</li>
              <li>Perform prescribed home quad sets and ankle pumps 3 times daily.</li>
              <li>Avoid high-impact movements, pivoting, or heavy lifting over 5 kg.</li>
            </ul>
          </div>
        </div>

        {/* Follow-Up Schedule */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider text-primary border-b border-border pb-1">
            5. Scheduled Clinical Follow-Up Appointments
          </h3>
          <div className="p-3 bg-surface-muted rounded-md text-xs space-y-2 border border-border">
            <div className="flex justify-between items-center">
              <div>
                <strong className="text-text">Staple Removal & Wound Inspection</strong>
                <p className="text-text-muted">Orthopedic Outpatient Clinic · Room 304</p>
              </div>
              <span className="text-right font-medium text-text">
                24 Sep 2026 @ 10:30 AM
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Sign-off & Disclaimer */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center text-xs text-text-muted gap-4">
          <div>
            <p>Digitally signed by: <strong>Dr. Rajesh Varma, MS Ortho</strong></p>
            <p>Medical License Registration: <strong>MCI-748291-K</strong></p>
          </div>
          <div className="text-center sm:text-right">
            <p>PostCare AI Clinical Discharge Subsystem</p>
            <p className="text-2xs">Academic Healthcare Demonstration Platform</p>
          </div>
        </div>
      </div>

      <DisclaimerNote />
    </div>
  )
}
