import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../../components/ui/index.jsx'
import BarCompare from '../../../charts/BarCompare.jsx'
import {
  Pill, ArrowLeft, Printer, Download, CheckCircle,
  XCircle, Clock, RefreshCw, AlertCircle, Search, Filter
} from 'lucide-react'
import api from '../../../services/api'
import { toast } from 'sonner'
import { exportReportToPDF } from '../../../utils/pdfExport'

export default function MedicationComplianceReport() {
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin/reports' : '/doctor/reports'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/reports/medication-compliance/')
      setData(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load Medication Compliance report'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const filteredPrescriptions = useMemo(() => {
    if (!data?.active_prescriptions) return []
    return data.active_prescriptions.filter((m) => {
      const matchesSearch =
        m.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.medicine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.uhid?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [data?.active_prescriptions, searchQuery, statusFilter])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    if (!data) return
    exportReportToPDF({
      title: 'Medication Compliance & Adherence Report',
      subtitle: 'PostCare AI Post-Operative Prescription Adherence Audit',
      metrics: [
        { label: 'Cohort Adherence Rate', value: data.adherence_rate || 'N/A', note: 'Taken vs missed doses' },
        { label: 'Administered Doses', value: `${data.taken_doses || 0} Doses`, note: 'Fulfillment confirmed' },
        { label: 'Missed Doses Audit', value: `${data.missed_doses || 0} Doses`, note: 'Requires care follow-up' },
        { label: 'Active Prescriptions', value: `${data.total_prescriptions || 0} Rx`, note: 'Discharge prescriptions' },
      ],
      tableHeaders: ['Patient Name', 'Prescription', 'Dosage', 'Frequency', 'Start Date', 'Status'],
      tableRows: (data.active_prescriptions || []).map((m) => [
        m.patient_name,
        m.medicine_name,
        m.dosage || '—',
        m.frequency || '—',
        m.start_date || '—',
        String(m.status || 'Active').toUpperCase()
      ]),
      filename: 'Medication_Compliance_Report'
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted no-print">
        <Link
          to={basePath}
          className="hover:text-primary flex items-center gap-1 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded p-0.5"
        >
          <ArrowLeft size={14} /> Clinical Reports Overview
        </Link>
        <span>/</span>
        <span className="text-text font-semibold">Medication Compliance</span>
      </div>

      <PageHeader
        title="Medication Compliance"
        action={
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print Medication Compliance Report"
              className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded-lg text-text bg-white hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              aria-label="Export Medication Compliance Report as PDF"
              className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} /> Export PDF
            </button>
          </div>
        }
      />

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 bg-danger-tint border border-danger/30 rounded-xl text-danger flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchReport}
            className="px-3 py-1 bg-white border border-danger/40 rounded text-xs font-semibold hover:bg-danger-tint transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-text-muted flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading medication compliance telemetry from database...</span>
        </div>
      ) : !data ? (
        <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center gap-2">
          <AlertCircle size={24} className="text-danger" />
          <span>Unable to retrieve medication compliance data.</span>
          <button
            type="button"
            onClick={fetchReport}
            className="mt-2 px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-hover transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* Key Metric StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Cohort Adherence Rate"
              value={data.adherence_rate || 'No log data'}
              trend={data.adherence_rate ? 'Target threshold >90%' : 'Awaiting dose telemetry'}
              trendUp={data.adherence_value == null || data.adherence_value >= 85}
              icon={Pill}
              iconBg="bg-primary-tint"
              iconColor="text-primary"
            />
            <StatCard
              label="Total Doses Taken"
              value={`${data.taken_doses || 0} doses`}
              trend="Confirmed administration"
              trendUp={true}
              icon={CheckCircle}
              iconBg="bg-success-tint"
              iconColor="text-success"
            />
            <StatCard
              label="Missed Doses Audit"
              value={`${data.missed_doses || 0} doses`}
              trend={data.missed_doses > 0 ? 'Requires care team outreach' : 'Zero missed doses'}
              trendUp={data.missed_doses === 0}
              icon={XCircle}
              iconBg="bg-danger-tint"
              iconColor="text-danger"
            />
            <StatCard
              label="Active Prescriptions"
              value={`${data.total_prescriptions || 0} Rx`}
              trend={`${data.pending_doses || 0} scheduled today`}
              trendUp={true}
              icon={Clock}
              iconBg="bg-warning-tint"
              iconColor="text-warning"
            />
          </div>

          {/* 7-Day Adherence Comparator Chart */}
          <Card>
            <CardHeader
              title="7-Day Medication Adherence Comparator"
              description="Daily proportion of prescribed doses administered vs missed across cohort check-ins"
            />
            <CardBody>
              <BarCompare
                data={data.daily_adherence || []}
                dataKey="value"
                unit="%"
                emptyMessage="No medication adherence logs recorded in the last 7 days. As patients submit daily check-ins with medication logs, adherence rates will appear here."
              />
            </CardBody>
          </Card>

          {/* Active Prescriptions Table */}
          <Card>
            <CardHeader
              title="Active Post-Operative Prescriptions Directory"
              description="Current surgical discharge medications tracked by the care management team"
              action={
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search patient or medicine..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search prescriptions"
                      className="h-8 pl-7 pr-3 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter prescriptions by status"
                    className="h-8 px-2.5 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="stopped">Stopped</option>
                  </select>
                </div>
              }
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                    <tr>
                      <th className="p-3">Patient Name & ID</th>
                      <th className="p-3">Medicine Name</th>
                      <th className="p-3">Dosage</th>
                      <th className="p-3">Frequency</th>
                      <th className="p-3">Start Date</th>
                      <th className="p-3">Prescribing Clinician</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {filteredPrescriptions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-text-muted">
                          {data.active_prescriptions?.length === 0
                            ? 'No prescriptions currently recorded in the database.'
                            : 'No prescriptions matched your search or status filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredPrescriptions.map((m) => (
                        <tr key={m.id} className="hover:bg-surface-muted/50 transition-colors">
                          <td className="p-3 font-semibold text-text">
                            <div>{m.patient_name}</div>
                            {m.uhid && (
                              <div className="text-2xs text-text-muted font-normal">{m.uhid}</div>
                            )}
                          </td>
                          <td className="p-3 font-medium text-primary">
                            <div>{m.medicine_name}</div>
                            {m.instructions && (
                              <div className="text-2xs text-text-secondary font-normal truncate max-w-xs">{m.instructions}</div>
                            )}
                          </td>
                          <td className="p-3 tabular-nums font-medium">{m.dosage || '—'}</td>
                          <td className="p-3 text-text-secondary">{m.frequency || '—'}</td>
                          <td className="p-3 text-text-muted tabular-nums whitespace-nowrap">{m.start_date}</td>
                          <td className="p-3 text-text-secondary">{m.prescribed_by || 'Hospital Staff'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold capitalize ${
                              m.status === 'active'
                                ? 'bg-success-tint text-success'
                                : m.status === 'completed'
                                ? 'bg-primary-tint text-primary'
                                : 'bg-surface-muted text-text-muted'
                            }`}>
                              {m.status || 'Active'}
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
