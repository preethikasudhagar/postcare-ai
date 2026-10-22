import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../../components/ui/index.jsx'
import LineTrend from '../../../charts/LineTrend.jsx'
import {
  Activity, ArrowLeft, Printer, Download, Thermometer,
  Zap, Clock, Users, RefreshCw, AlertCircle, Search, Filter
} from 'lucide-react'
import api from '../../../services/api'
import { toast } from 'sonner'
import { exportReportToPDF } from '../../../utils/pdfExport'

export default function RecoveryIndexReport() {
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin/reports' : '/doctor/reports'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [woundFilter, setWoundFilter] = useState('all')

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/reports/recovery-index/')
      setData(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load Recovery Index report data'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const filteredCheckins = useMemo(() => {
    if (!data?.recent_checkins) return []
    return data.recent_checkins.filter((c) => {
      const matchesSearch =
        c.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.uhid?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesWound = woundFilter === 'all' || c.wound_condition === woundFilter
      return matchesSearch && matchesWound
    })
  }, [data?.recent_checkins, searchQuery, woundFilter])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    if (!data) return
    exportReportToPDF({
      title: 'Patient Recovery Index Report',
      subtitle: 'PostCare AI Clinical Analytics & Check-In Telemetry',
      metrics: [
        {
          label: 'Cohort Recovery Score',
          value: data.recovery_trajectory_index != null ? `${data.recovery_trajectory_index} / 100` : 'N/A',
          note: 'Mean recovery trajectory'
        },
        {
          label: 'Mean Cohort Pain Level',
          value: data.avg_pain_score != null ? `${data.avg_pain_score} / 10` : 'N/A',
          note: 'Patient-reported pain'
        },
        {
          label: 'Mean Body Temperature',
          value: data.avg_temperature != null ? `${data.avg_temperature}°C` : 'N/A',
          note: 'Afebrile stability'
        },
        {
          label: 'Check-Ins Processed',
          value: String(data.total_checkins || 0),
          note: 'Total clinical submissions'
        },
      ],
      tableHeaders: ['Patient Name', 'UHID / ID', 'Recovery Score', 'Pain Level', 'Temp (°C)', 'Wound Status', 'Med Adherence', 'Logged Date'],
      tableRows: (data.recent_checkins || []).map((c) => [
        c.patient_name,
        c.uhid || '—',
        c.recovery_score != null ? `${c.recovery_score}/100` : '—',
        c.pain_level != null ? `${c.pain_level}/10` : '—',
        c.temperature != null ? `${c.temperature}°C` : '—',
        c.wound_condition || '—',
        c.medication_adherence || '—',
        c.created_at || '—'
      ]),
      filename: 'Patient_Recovery_Index_Report'
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-text-muted no-print">
        <Link
          to={basePath}
          className="hover:text-primary flex items-center gap-1 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded p-0.5"
        >
          <ArrowLeft size={14} /> Clinical Reports Overview
        </Link>
        <span>/</span>
        <span className="text-text font-semibold">Patient Recovery Index</span>
      </div>

      <PageHeader
        title="Patient Recovery Index"
        action={
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print Recovery Index Report"
              className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded-lg text-text bg-white hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              aria-label="Export Recovery Index Report as PDF"
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
          <span>Loading recovery index telemetry from database...</span>
        </div>
      ) : !data ? (
        <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center gap-2">
          <AlertCircle size={24} className="text-danger" />
          <span>Unable to retrieve recovery report data from backend.</span>
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
              label="Cohort Recovery Index"
              value={data.recovery_trajectory_index != null ? `${data.recovery_trajectory_index} / 100` : 'No data'}
              trend={data.recovery_trajectory_index != null ? (data.recovery_trajectory_index >= 75 ? 'Optimal healing band' : 'Requires monitoring') : 'Telemetry pending'}
              trendUp={data.recovery_trajectory_index == null || data.recovery_trajectory_index >= 70}
              icon={Activity}
              iconBg="bg-primary-tint"
              iconColor="text-primary"
            />
            <StatCard
              label="Mean Cohort Pain Level"
              value={data.avg_pain_score != null ? `${data.avg_pain_score} / 10` : 'No data'}
              trend={data.avg_pain_score != null ? (data.avg_pain_score <= 4.0 ? 'Controlled pain score' : 'Elevated pain cohort') : 'No check-in inputs'}
              trendUp={data.avg_pain_score != null && data.avg_pain_score <= 4.0}
              icon={Zap}
              iconBg="bg-success-tint"
              iconColor="text-success"
            />
            <StatCard
              label="Mean Body Temperature"
              value={data.avg_temperature != null ? `${data.avg_temperature}°C` : 'No data'}
              trend={data.avg_temperature != null ? (data.avg_temperature <= 37.5 ? 'Afebrile stability' : 'Febrile trend alert') : 'No vitals logged'}
              trendUp={data.avg_temperature != null && data.avg_temperature <= 37.5}
              icon={Thermometer}
              iconBg="bg-secondary-tint"
              iconColor="text-secondary"
            />
            <StatCard
              label="Total Check-Ins Processed"
              value={String(data.total_checkins || 0)}
              trend={`${data.total_patients || 0} monitored patients`}
              trendUp={true}
              icon={Clock}
              iconBg="bg-warning-tint"
              iconColor="text-warning"
            />
          </div>

          {/* 14-Day Trajectory Curve */}
          <Card>
            <CardHeader
              title="14-Day Cohort Recovery Progression Curve"
              description="Mean recovery progression score calculated chronologically across active patient check-ins"
            />
            <CardBody>
              <LineTrend
                data={data.trajectory || []}
                dataKey="score"
                xAxisKey="date"
                name="Cohort Mean Score"
                emptyMessage="No recovery score check-ins recorded yet in the database. As patients submit daily check-ins, the 14-day cohort trajectory curve will populate here."
              />
            </CardBody>
          </Card>

          {/* Detailed Check-In Audit Log Table */}
          <Card>
            <CardHeader
              title="Recent Patient Recovery Check-In Log"
              description="Chronological clinical telemetry records submitted by discharged surgical patients"
              action={
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search patient name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search check-ins by patient name"
                      className="h-8 pl-7 pr-3 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <select
                    value={woundFilter}
                    onChange={(e) => setWoundFilter(e.target.value)}
                    aria-label="Filter check-ins by wound condition"
                    className="h-8 px-2.5 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Wound Conditions</option>
                    <option value="normal">Normal & Healing</option>
                    <option value="mild_redness">Mild Redness</option>
                    <option value="swelling">Moderate Swelling</option>
                    <option value="discharge">Fluid Discharge</option>
                    <option value="severe">Severe Concern</option>
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
                      <th className="p-3">Recovery Score</th>
                      <th className="p-3">Pain Level</th>
                      <th className="p-3">Temperature</th>
                      <th className="p-3">Wound Condition</th>
                      <th className="p-3">Med Adherence</th>
                      <th className="p-3">Submission Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {filteredCheckins.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-text-muted">
                          {data.recent_checkins?.length === 0
                            ? 'No check-in telemetry records currently recorded in the database.'
                            : 'No check-in records matched your search or filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredCheckins.map((c) => (
                        <tr key={c.id} className="hover:bg-surface-muted/50 transition-colors">
                          <td className="p-3 font-semibold text-text">
                            <div>{c.patient_name}</div>
                            {c.uhid && (
                              <div className="text-2xs text-text-muted font-normal">{c.uhid}</div>
                            )}
                          </td>
                          <td className="p-3 font-bold tabular-nums">
                            {c.recovery_score != null ? (
                              <span className={c.recovery_score >= 80 ? 'text-success' : c.recovery_score >= 60 ? 'text-warning' : 'text-danger'}>
                                {c.recovery_score} / 100
                              </span>
                            ) : (
                              <span className="text-text-muted font-normal">Pending</span>
                            )}
                          </td>
                          <td className="p-3 font-medium tabular-nums">
                            {c.pain_level != null ? `${c.pain_level} / 10` : '—'}
                          </td>
                          <td className="p-3 tabular-nums">
                            {c.temperature != null ? `${c.temperature}°C` : '—'}
                          </td>
                          <td className="p-3 capitalize">
                            <span className="inline-block px-2 py-0.5 rounded text-2xs font-medium bg-surface-muted border border-border">
                              {c.wound_condition ? c.wound_condition.replace('_', ' ') : 'Not reported'}
                            </span>
                          </td>
                          <td className="p-3 capitalize">
                            <span className={`inline-block px-2 py-0.5 rounded text-2xs font-medium ${
                              c.medication_adherence === 'all'
                                ? 'bg-success-tint text-success'
                                : c.medication_adherence === 'some'
                                ? 'bg-warning-tint text-warning'
                                : 'bg-danger-tint text-danger'
                            }`}>
                              {c.medication_adherence || 'Not reported'}
                            </span>
                          </td>
                          <td className="p-3 text-text-muted tabular-nums whitespace-nowrap">
                            {c.created_at}
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
