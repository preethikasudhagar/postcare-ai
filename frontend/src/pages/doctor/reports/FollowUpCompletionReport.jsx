import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../../components/ui/index.jsx'
import { StatusBadge } from '../../../components/ui/Badge.jsx'
import {
  Calendar, ArrowLeft, Printer, Download, CheckCircle,
  Clock, RotateCcw, XCircle, RefreshCw, AlertCircle, Search, Filter
} from 'lucide-react'
import api from '../../../services/api'
import { toast } from 'sonner'
import { exportReportToPDF } from '../../../utils/pdfExport'

export default function FollowUpCompletionReport() {
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
      const res = await api.get('/reports/follow-up-completion/')
      setData(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load Follow-Up Completion report'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const filteredAppointments = useMemo(() => {
    if (!data?.appointments) return []
    return data.appointments.filter((a) => {
      const matchesSearch =
        a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.uhid?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [data?.appointments, searchQuery, statusFilter])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    if (!data) return
    exportReportToPDF({
      title: 'Follow-Up Completion & Attendance Report',
      subtitle: 'PostCare AI Clinical Consultation Fulfillment Tracking',
      metrics: [
        { label: 'Overall Completion Rate', value: data.completion_rate || 'N/A', note: 'Attended consultations' },
        { label: 'Completed Reviews', value: `${data.completed_count || 0} Visits`, note: 'Fulfillment confirmed' },
        { label: 'Upcoming Consultations', value: `${data.upcoming_count || data.scheduled_count || 0} Visits`, note: 'Scheduled reviews' },
        { label: 'Rescheduled Reviews', value: `${data.rescheduled_count || 0} Visits`, note: 'Timeline adjusted' },
      ],
      tableHeaders: ['Patient Name', 'Doctor / Dept', 'Appointment Date', 'Time', 'Status', 'Clinical Purpose'],
      tableRows: (data.appointments || []).map((a) => [
        a.patient_name,
        a.doctor_name || 'Hospital Staff',
        a.appointment_date || '—',
        a.appointment_time || '—',
        String(a.status || 'Upcoming').toUpperCase(),
        a.purpose || a.notes || 'Routine Follow-up'
      ]),
      filename: 'FollowUp_Completion_Report'
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
        <span className="text-text font-semibold">Follow-Up Completion</span>
      </div>

      <PageHeader
        title="Follow-Up Completion & Attendance Report"
        description="Appointment fulfillment rates, scheduled surgical reviews, completed consultations, and rescheduling trends"
        action={
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print Follow-Up Report"
              className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded-lg text-text bg-white hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              aria-label="Export Follow-Up Report as PDF"
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
          <span>Loading appointment fulfillment metrics from database...</span>
        </div>
      ) : !data ? (
        <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center gap-2">
          <AlertCircle size={24} className="text-danger" />
          <span>Unable to retrieve follow-up appointment data.</span>
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
              label="Overall Completion Rate"
              value={data.completion_rate || 'No appointment data'}
              trend={data.completion_rate ? 'Target threshold >90%' : 'No consultations logged'}
              trendUp={data.completion_value == null || data.completion_value >= 85}
              icon={Calendar}
              iconBg="bg-primary-tint"
              iconColor="text-primary"
            />
            <StatCard
              label="Completed Reviews"
              value={`${data.completed_count || 0} visits`}
              trend="Attended consultations"
              trendUp={true}
              icon={CheckCircle}
              iconBg="bg-success-tint"
              iconColor="text-success"
            />
            <StatCard
              label="Upcoming Scheduled"
              value={`${data.upcoming_count || data.scheduled_count || 0} visits`}
              trend="Scheduled clinical reviews"
              trendUp={true}
              icon={Clock}
              iconBg="bg-secondary-tint"
              iconColor="text-secondary"
            />
            <StatCard
              label="Rescheduled Consultations"
              value={`${data.rescheduled_count || 0} visits`}
              trend={data.rescheduled_count > 0 ? 'Adjusted recovery timelines' : 'Zero reschedules'}
              trendUp={data.rescheduled_count === 0}
              icon={RotateCcw}
              iconBg="bg-warning-tint"
              iconColor="text-warning"
            />
          </div>

          {/* Status Breakdown Progress Overview */}
          <Card>
            <CardHeader
              title="Cohort Follow-Up Fulfillment Breakdown"
              description="Proportion of scheduled post-operative consultations by status"
            />
            <CardBody>
              {data.total_appointments === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted">
                  No appointments currently recorded in the database.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-4 w-full bg-surface-muted rounded-full overflow-hidden flex border border-border">
                    {(data.status_breakdown || []).map((b) => {
                      const pct = data.total_appointments > 0 ? (b.count / data.total_appointments) * 100 : 0
                      if (pct === 0) return null
                      return (
                        <div
                          key={b.name}
                          style={{ width: `${pct}%`, backgroundColor: b.color }}
                          title={`${b.name}: ${b.count} (${Math.round(pct)}%)`}
                          className="h-full transition-all duration-300"
                        />
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {(data.status_breakdown || []).map((b) => (
                      <div key={b.name} className="p-3 bg-surface-muted/60 border border-border rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                          <span className="font-medium text-text">{b.name}</span>
                        </div>
                        <span className="font-bold tabular-nums text-text">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Detailed Appointments Table */}
          <Card>
            <CardHeader
              title="Recent Clinical Follow-Up Appointments"
              description="Chronological log of surgical follow-up consultations and their fulfillment status"
              action={
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search patient or doctor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search appointments"
                      className="h-8 pl-7 pr-3 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter appointments by status"
                    className="h-8 px-2.5 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="cancelled">Cancelled</option>
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
                      <th className="p-3">Attending Clinician</th>
                      <th className="p-3">Appointment Date</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Clinical Purpose / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-text-muted">
                          {data.appointments?.length === 0
                            ? 'No follow-up appointment records currently recorded in the database.'
                            : 'No appointments matched your search or status filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((a) => (
                        <tr key={a.id} className="hover:bg-surface-muted/50 transition-colors">
                          <td className="p-3 font-semibold text-text">
                            <div>{a.patient_name}</div>
                            {a.uhid && (
                              <div className="text-2xs text-text-muted font-normal">{a.uhid}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-text">{a.doctor_name || 'Hospital Staff'}</div>
                            {a.department && (
                              <div className="text-2xs text-text-muted">{a.department}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-2xs tabular-nums text-text">
                            {a.appointment_date}
                          </td>
                          <td className="p-3 text-text-secondary tabular-nums">
                            {a.appointment_time}
                          </td>
                          <td className="p-3">
                            <StatusBadge status={a.status} />
                          </td>
                          <td className="p-3 text-text-secondary max-w-sm truncate">
                            {a.purpose || a.notes || 'Routine consultation'}
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
