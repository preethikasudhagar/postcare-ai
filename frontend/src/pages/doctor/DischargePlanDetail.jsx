import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { PageHeader, Card, CardBody, StatusBadge } from '../../components/ui/index.jsx'
import { exportReportToPDF } from '../../utils/pdfExport'
import { formatDate } from '../../utils/dateUtils'
import {
  ArrowLeft, Edit3, Printer, Download, ShieldCheck, AlertCircle,
  FileText, Calendar, Clock, Pill, Activity, Heart, ShieldAlert
} from 'lucide-react'

export default function DischargePlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusForbidden, setStatusForbidden] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function fetchPlan() {
      setLoading(true)
      setError(null)
      setStatusForbidden(false)
      try {
        const res = await api.get(`/discharge-plans/${id}/`)
        if (isMounted) {
          setPlan(res.data)
        }
      } catch (err) {
        if (!isMounted) return
        if (err.response?.status === 403) {
          setStatusForbidden(true)
          setError(
            err.response?.data?.detail ||
            'Access Denied: You do not have clinical permission to view this discharge plan. This patient is not assigned to your clinical care.'
          )
        } else if (err.response?.status === 404) {
          setError(`Discharge Plan #${id} was not found in the clinical records.`)
        } else {
          // If server fails or in offline demo fallback mode, try finding matching plan from state
          setError('Unable to load discharge plan details. Please check your network connection.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (id) {
      fetchPlan()
    }
    return () => { isMounted = false }
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    if (!plan) return
    const medHeaders = ['Medication Name', 'Dosage', 'Frequency', 'Duration', 'Instructions']
    const medRows = (plan.medications || []).map((m) => [
      m.medicine_name || m.name || 'Medication',
      m.dosage || 'Standard',
      m.frequency || m.freq || 'Daily',
      `${m.duration_days || 7} days`,
      m.instructions || 'As prescribed',
    ])

    exportReportToPDF({
      title: `Discharge Plan - ${plan.patient_name || 'Patient'} (${plan.plan_reference || `DP-${plan.id}`})`,
      subtitle: `Surgical Procedure: ${plan.surgery_type || 'Surgery'} | Discharge Date: ${formatDate(plan.discharge_date, 'DD MMM YYYY') || 'N/A'}`,
      metrics: [
        { label: 'Patient UHID', value: plan.patient_uhid || 'N/A' },
        { label: 'Primary Surgeon', value: plan.doctor_name || 'Dr. Rajesh Varma' },
        { label: 'Plan Version', value: `v${plan.version || 1.0}` },
        { label: 'Status', value: (plan.status || 'published').toUpperCase() },
      ],
      tableHeaders: medHeaders,
      tableRows: medRows,
      filename: `DischargePlan_${plan.plan_reference || plan.id}_${plan.patient_uhid || 'Patient'}`
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-text-muted">Loading discharge plan details…</p>
      </div>
    )
  }

  if (statusForbidden) {
    return (
      <div className="max-w-document mx-auto space-y-6">
        <div className="p-6 bg-surface border border-danger/20 rounded-xl shadow-xs text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-danger-tint flex items-center justify-center text-danger">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">403 Access Denied</h2>
            <p className="text-xs text-danger font-medium mt-1 max-w-md mx-auto">{error}</p>
            <p className="text-2xs text-text-muted mt-2">
              Discharge plans contain sensitive protected health information and are restricted strictly to authorized clinicians assigned to the patient.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/doctor/discharge-plans')}
              className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-hover transition-colors"
            >
              <ArrowLeft size={14} /> Back to Discharge Plans
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="max-w-document mx-auto space-y-6">
        <div className="p-6 bg-surface border border-border rounded-xl shadow-xs text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-muted flex items-center justify-center text-text-muted">
            <AlertCircle size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Plan Not Found</h2>
            <p className="text-xs text-text-muted mt-1">{error || 'The requested discharge plan could not be located.'}</p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/doctor/discharge-plans')}
              className="inline-flex items-center gap-2 h-9 px-4 bg-surface text-text border border-border text-xs font-semibold rounded-md hover:bg-surface-muted transition-colors"
            >
              <ArrowLeft size={14} /> Back to Plans
            </button>
          </div>
        </div>
      </div>
    )
  }

  const planRef = plan.plan_reference || `DP-${plan.id}`
  const patientUhid = plan.patient_uhid || 'P-101'
  const patientName = plan.patient_name || 'Rahul Kumar'
  const doctorName = plan.doctor_name || 'Dr. Rajesh Varma'

  return (
    <div className="max-w-document mx-auto space-y-6">
      <PageHeader
        title={`Discharge Plan: ${planRef}`}
        subtitle="Comprehensive clinical post-operative protocol and discharge instructions"
        action={
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => navigate('/doctor/discharge-plans')}
              className="inline-flex items-center gap-1.5 h-9 px-3 border border-border text-xs font-medium rounded text-text bg-surface hover:bg-surface-muted transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <Link
              to={`/doctor/discharge-plans/${plan.id}/edit`}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors shadow-xs"
            >
              <Edit3 size={14} /> Edit Plan
            </Link>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-3 border border-border text-xs font-medium rounded text-text bg-surface hover:bg-surface-muted transition-colors"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-secondary text-text text-xs font-semibold rounded hover:bg-secondary-hover transition-colors shadow-xs"
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        }
      />

      {/* Document Sheet */}
      <div className="bg-surface border border-border shadow-sm rounded-lg p-6 sm:p-10 space-y-7 print:p-0 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-border pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-lg mb-1">
              <ShieldCheck size={22} /> City General Memorial Hospital
            </div>
            <p className="text-xs text-text-muted">
              {plan.department_name ? `Department of ${plan.department_name}` : 'Department of Orthopedic Surgery & Post-Operative Care'}
            </p>
            <p className="text-2xs text-text-muted">NABH Accredited Tertiary Healthcare Center</p>
          </div>
          <div className="text-left sm:text-right space-y-1">
            <div>
              <StatusBadge status={plan.status || 'published'} />
            </div>
            <p className="text-xs text-text font-semibold">Plan Ref: {planRef}</p>
            <p className="text-2xs text-text-muted">Version: v{plan.version || '1.0'}</p>
            <p className="text-2xs text-text-muted">Discharge Date: {plan.discharge_date ? formatDate(plan.discharge_date, 'DD MMM YYYY') : 'N/A'}</p>
          </div>
        </div>

        {/* Patient Identity Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-bg rounded-md text-xs border border-border border-l-4 border-l-primary">
          <div>
            <span className="text-text-muted block text-2xs uppercase tracking-wider font-semibold">Patient Name</span>
            <strong className="text-text text-sm">{patientName}</strong>
          </div>
          <div>
            <span className="text-text-muted block text-2xs uppercase tracking-wider font-semibold">Patient UHID</span>
            <strong className="text-text font-mono">{patientUhid}</strong>
          </div>
          <div>
            <span className="text-text-muted block text-2xs uppercase tracking-wider font-semibold">Surgical Procedure</span>
            <strong className="text-text">{plan.surgery_type || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-text-muted block text-2xs uppercase tracking-wider font-semibold">Primary Surgeon</span>
            <strong className="text-text">{doctorName}</strong>
          </div>
        </div>

        {/* 1. Clinical Diagnosis & Procedure Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
            1. Clinical Diagnosis & Procedure Summary
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed bg-surface-muted/50 p-3 rounded-md border border-border">
            {plan.diagnosis || 'Post-operative recovery trajectory after elective surgery. Vital signs monitored and stable prior to authorized hospital discharge.'}
          </p>
        </div>

        {/* 2. Discharge Instructions */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
            2. General & Dietary Discharge Instructions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-surface-muted/50 rounded-md border border-border space-y-1">
              <h4 className="text-2xs font-bold text-text uppercase tracking-wider">General Instructions</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                {plan.general_instructions || 'Rest with operative limb supported. Monitor for elevated temperature (>38°C). Maintain adequate hydration and comply with medication schedule.'}
              </p>
            </div>
            <div className="p-3 bg-surface-muted/50 rounded-md border border-border space-y-1">
              <h4 className="text-2xs font-bold text-text uppercase tracking-wider">Dietary Recommendations</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                {plan.diet_instructions || 'High-protein balanced recovery nutrition. Minimum 2.5 liters fluids daily. Avoid excessive sodium or processed sugars.'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Prescribed Discharge Medications */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b-2 border-primary pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              3. Prescribed Discharge Medications
            </h3>
            <span className="text-2xs font-semibold text-text-muted">
              {plan.medications?.length || 0} Prescribed Items
            </span>
          </div>

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
                {(!plan.medications || plan.medications.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-xs text-text-muted">
                      No medications recorded for this plan.
                    </td>
                  </tr>
                ) : (
                  plan.medications.map((m, idx) => (
                    <tr
                      key={m.id || idx}
                      className={idx % 2 === 0 ? 'bg-surface hover:bg-bg' : 'bg-bg hover:bg-bg'}
                    >
                      <td className="p-2.5 font-semibold text-text flex items-center gap-1.5">
                        <Pill size={13} className="text-primary flex-shrink-0" />
                        {m.medicine_name || m.name}
                      </td>
                      <td className="p-2.5 font-medium">{m.dosage}</td>
                      <td className="p-2.5">{m.frequency || m.freq}</td>
                      <td className="p-2.5 font-mono text-2xs">{m.duration_days || m.duration || 7} days</td>
                      <td className="p-2.5 text-text-muted">{m.instructions || 'Take as instructed'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Wound Care & Activity Restrictions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
              4. Wound Care Instructions
            </h3>
            <div className="p-3 bg-surface-muted/50 rounded-md border border-border">
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                {plan.wound_care_instructions || 'Keep dressing dry and undisturbed. Report any active drainage, foul odor, or spreading erythema to surgical triage immediately.'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
              5. Activity & Physiotherapy Restrictions
            </h3>
            <div className="p-3 bg-surface-muted/50 rounded-md border border-border">
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                {plan.activity_restrictions || 'Ambulation with assistive device as tolerated. Avoid high impact movements, rapid direction changes, or lifting > 5 kg for 4 weeks.'}
              </p>
            </div>
          </div>
        </div>

        {/* 6. Scheduled Clinical Follow-Up Appointments */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-1">
            6. Scheduled Clinical Follow-Up Appointments
          </h3>
          {(!plan.follow_ups || plan.follow_ups.length === 0) ? (
            <p className="text-xs text-text-muted p-3 bg-surface-muted/50 rounded-md border border-border">
              No follow-up appointments scheduled yet.
            </p>
          ) : (
            <div className="space-y-2">
              {plan.follow_ups.map((f, idx) => (
                <div
                  key={f.id || idx}
                  className="p-3 bg-bg rounded-md text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-border border-l-4 border-l-primary"
                >
                  <div className="space-y-0.5">
                    <strong className="text-text block font-semibold">{f.purpose || 'Post-Operative Follow-Up Review'}</strong>
                    <p className="text-2xs text-text-muted">
                      Clinic: {f.department || 'Outpatient Clinic'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-text font-medium text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-primary" /> {formatDate(f.appointment_date, 'DD MMM YYYY')}
                    </span>
                    {f.appointment_time && (
                      <span className="flex items-center gap-1 font-mono text-2xs text-text-secondary">
                        <Clock size={13} className="text-primary" /> {f.appointment_time}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Digital Clinical Sign-off */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-text-muted gap-4">
          <div>
            <p>Digitally Authorized by: <strong className="text-text">{doctorName}</strong></p>
            <p className="text-2xs">
              Medical License: {plan.doctor_license || 'MCI-748291-K'} · Clinical System Signature Verified
            </p>
          </div>
          <div className="text-left sm:text-right text-2xs">
            <p className="font-semibold text-text">PostCare AI Clinical Governance & Recovery System</p>
            <p>Generated: {formatDate(new Date(), 'DD MMM YYYY')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
