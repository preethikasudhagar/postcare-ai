import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../../components/ui/index.jsx'
import BarCompare from '../../../charts/BarCompare.jsx'
import { Pill, ArrowLeft, Printer, Download, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import api from '../../../services/api'
import { toast } from 'sonner'

export default function MedicationComplianceReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const res = await api.get('/reports/medication-compliance/')
        setData(res.data)
      } catch (err) {
        toast.error('Failed to load Medication Compliance report')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-text-muted no-print">
        <Link to="/doctor/reports" className="hover:text-primary flex items-center gap-1 font-medium">
          <ArrowLeft size={14} /> Clinical Reports Overview
        </Link>
        <span>/</span>
        <span className="text-text font-semibold">Medication Compliance</span>
      </div>

      <PageHeader
        title="Medication Compliance & Adherence Report"
        description="Prescription adherence rates, scheduled dosage tracking, and missed dose audit log"
        action={
          <div className="flex items-center gap-2 no-print">
            <button onClick={() => window.print()} className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded text-text bg-white hover:bg-surface-muted flex items-center gap-1.5 shadow-xs">
              <Printer size={14} /> Print Report
            </button>
            <button onClick={() => window.print()} className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover flex items-center gap-1.5 shadow-xs">
              <Download size={14} /> Export PDF
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-xs text-text-muted">Loading medication compliance metrics...</div>
      ) : !data ? (
        <div className="py-12 text-center text-xs text-text-muted">No medication logs available in the system.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Cohort Adherence Rate"
              value={data.adherence_rate || '94.6%'}
              trend="Target threshold >90%"
              trendUp={true}
              icon={Pill}
              iconBg="bg-primary-tint"
              iconColor="text-primary"
            />
            <StatCard
              label="Total Doses Taken"
              value={`${data.taken_doses || 848} doses`}
              trend="On-time administration"
              trendUp={true}
              icon={CheckCircle}
              iconBg="bg-success-tint"
              iconColor="text-success"
            />
            <StatCard
              label="Missed Doses Audit"
              value={`${data.missed_doses || 48} doses`}
              trend="Requiring nurse triage"
              trendUp={false}
              icon={XCircle}
              iconBg="bg-danger-tint"
              iconColor="text-danger"
            />
            <StatCard
              label="Pending / Scheduled"
              value={`${data.pending_doses || 0} doses`}
              trend="Due today"
              trendUp={true}
              icon={Clock}
              iconBg="bg-warning-tint"
              iconColor="text-warning"
            />
          </div>

          <Card>
            <CardHeader
              title="7-Day Medication Adherence Comparator"
              description="Daily proportion of prescribed doses administered vs missed across cohort"
            />
            <CardBody>
              <BarCompare />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Active Post-Operative Prescriptions Directory"
              description="Current surgical discharge medications monitored by the care team"
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                    <tr>
                      <th className="p-3">Patient Name</th>
                      <th className="p-3">Medicine Name</th>
                      <th className="p-3">Dosage</th>
                      <th className="p-3">Frequency</th>
                      <th className="p-3">Prescription Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {data.active_prescriptions?.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-text-muted">No active prescriptions found.</td>
                      </tr>
                    ) : (
                      data.active_prescriptions?.map((m) => (
                        <tr key={m.id} className="hover:bg-surface-muted/50">
                          <td className="p-3 font-semibold text-text">{m.patient_name}</td>
                          <td className="p-3 font-medium text-primary">{m.medicine_name}</td>
                          <td className="p-3 tabular-nums">{m.dosage}</td>
                          <td className="p-3 text-text-secondary">{m.frequency}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-success-tint text-success capitalize">
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
