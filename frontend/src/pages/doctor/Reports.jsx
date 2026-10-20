import React, { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody } from '../../components/ui/index.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import {
  Activity, ShieldAlert, Pill, Calendar, ArrowRight,
  ChevronRight, Printer, Download, RefreshCw, AlertCircle
} from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'
import { exportReportToPDF } from '../../utils/pdfExport'

export default function DoctorReports() {
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin/reports' : '/doctor/reports'

  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/reports/recovery/')
      setOverview(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load reports overview'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const reportCards = [
    {
      id: 'recovery-index',
      to: `${basePath}/recovery-index`,
      title: '1. Patient Recovery Index',
      desc: 'Chronological recovery progression, vital sign stability trajectories, and patient check-in telemetry.',
      icon: Activity,
      color: 'text-primary bg-primary-tint',
      borderColor: 'hover:border-primary',
      stat: overview?.avg_recovery_score != null
        ? `${overview.avg_recovery_score} / 100`
        : (loading ? 'Loading…' : 'No score data'),
      statLabel: 'Cohort Avg Score'
    },
    {
      id: 'risk-stratification',
      to: `${basePath}/risk-stratification`,
      title: '2. Risk Stratification Report',
      desc: 'Random Forest risk classification distribution, clinical risk tiers, and predictive feature weights.',
      icon: ShieldAlert,
      color: 'text-danger bg-danger-tint',
      borderColor: 'hover:border-danger',
      stat: overview?.risk_distribution
        ? `${overview.risk_distribution.high} Acute`
        : (loading ? 'Loading…' : 'No alerts recorded'),
      statLabel: 'High-Risk Alerts'
    },
    {
      id: 'medication-compliance',
      to: `${basePath}/medication-compliance`,
      title: '3. Medication Compliance',
      desc: 'Prescription adherence tracking, scheduled dosage fulfillments, and missed dose audit log.',
      icon: Pill,
      color: 'text-secondary bg-secondary-tint',
      borderColor: 'hover:border-secondary',
      stat: overview?.medication_adherence_rate || (loading ? 'Loading…' : 'No adherence data'),
      statLabel: 'Adherence Rate'
    },
    {
      id: 'follow-up-completion',
      to: `${basePath}/follow-up-completion`,
      title: '4. Follow-Up Completion',
      desc: 'Appointment fulfillment rates, scheduled reviews, completed consultations, and rescheduling trends.',
      icon: Calendar,
      color: 'text-warning bg-warning-tint',
      borderColor: 'hover:border-warning',
      stat: overview?.followup_completion_rate || (loading ? 'Loading…' : 'No appointment data'),
      statLabel: 'Fulfillment Rate'
    },
  ]

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    exportReportToPDF({
      title: 'Clinical Analytics & Post-Operative Reports Overview',
      subtitle: 'PostCare AI Surgical Recovery Analytics Hub',
      metrics: [
        {
          label: 'Cohort Avg Recovery Score',
          value: overview?.avg_recovery_score != null ? `${overview.avg_recovery_score} / 100` : 'N/A',
          note: 'Calculated across active check-ins'
        },
        {
          label: 'High-Risk Acute Alerts',
          value: `${overview?.risk_distribution?.high ?? 0} Cases`,
          note: 'Random Forest classification'
        },
        {
          label: 'Medication Adherence Rate',
          value: overview?.medication_adherence_rate || 'N/A',
          note: 'Prescribed dose fulfillment'
        },
        {
          label: 'Follow-Up Completion Rate',
          value: overview?.followup_completion_rate || 'N/A',
          note: 'Attended consultations'
        },
      ],
      tableHeaders: ['Report Module', 'Cohort Metric', 'Clinical Scope & Analysis'],
      tableRows: [
        ['1. Patient Recovery Index', overview?.avg_recovery_score != null ? `${overview.avg_recovery_score} / 100` : 'No score data', 'Chronological recovery progression, vital sign stability, and daily check-ins'],
        ['2. Risk Stratification Report', `${overview?.risk_distribution?.high ?? 0} High-Risk Alert(s)`, 'Random Forest risk classification, clinical risk tiers, and feature importance'],
        ['3. Medication Compliance', overview?.medication_adherence_rate || 'No log data', 'Prescription adherence tracking, scheduled dosages, and missed dose audit log'],
        ['4. Follow-Up Completion', overview?.followup_completion_rate || 'No appointment data', 'Appointment fulfillment rates, completed consultations, and rescheduling trends'],
      ],
      filename: 'PostCare_AI_Clinical_Overview'
    })
  }

  const riskDistribution = overview?.risk_distribution || { low: 0, medium: 0, high: 0, total: 0 }
  const riskDonutData = [
    { name: 'Low Risk', value: riskDistribution.low || 0, color: '#22A05A' },
    { name: 'Medium Risk', value: riskDistribution.medium || 0, color: '#F2A311' },
    { name: 'High Risk', value: riskDistribution.high || 0, color: '#DC3B3B' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Analytics & Post-Operative Reports"
        description="Aggregate surgical cohort outcomes, risk distributions, and specialized clinical analytics modules"
        action={
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print Overview Report"
              className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded-lg text-text bg-white hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={14} /> Print Overview
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              aria-label="Export Overview Report as PDF"
              className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} /> Export PDF
            </button>
          </div>
        }
      />

      {/* Error Banner */}
      {error && !loading && (
        <div className="p-4 bg-danger-tint border border-danger/30 rounded-xl text-danger flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchOverview}
            className="px-3 py-1 bg-white border border-danger/40 rounded text-xs font-semibold hover:bg-danger-tint transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* 4 Report Navigation Cards - Entire card is clickable */}
      <div>
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
          Select Clinical Report Module
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards.map((rc) => (
            <Link
              key={rc.id}
              to={rc.to}
              aria-label={`Open ${rc.title}`}
              className={`p-4 bg-white border border-border rounded-xl shadow-xs ${rc.borderColor} hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all flex flex-col justify-between group cursor-pointer`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${rc.color}`}>
                    <rc.icon size={18} />
                  </div>
                  <ChevronRight size={16} className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <h4 className="text-sm font-bold text-text mb-1 group-hover:text-primary transition-colors">
                  {rc.title}
                </h4>
                <p className="text-2xs text-text-secondary line-clamp-2 mb-4 leading-relaxed">
                  {rc.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-text-muted font-medium">{rc.statLabel}:</span>
                <span className="font-bold text-text tabular-nums">{rc.stat}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Overview Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader
              title="Cohort 14-Day Recovery Trajectory"
              description="Mean recovery score across active surgical discharges"
              action={
                <Link
                  to={`${basePath}/recovery-index`}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary rounded p-0.5"
                >
                  Full Recovery Report <ArrowRight size={13} />
                </Link>
              }
            />
            <CardBody>
              <LineTrend
                data={overview?.daily_trajectory || []}
                dataKey="score"
                xAxisKey="date"
                name="Cohort Mean Score"
                loading={loading}
                error={error}
                onRetry={fetchOverview}
                emptyMessage="No recovery score check-ins recorded yet in the database. As patients submit daily check-ins, the 14-day cohort trajectory curve will populate here."
              />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader
              title="Risk Classification Spread"
              description="Real-time model classification across cohort"
              action={
                <Link
                  to={`${basePath}/risk-stratification`}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary rounded p-0.5"
                >
                  Full Risk Report <ArrowRight size={13} />
                </Link>
              }
            />
            <CardBody>
              {loading ? (
                <div className="w-full min-h-[210px] flex items-center justify-center text-xs text-text-muted">
                  Loading risk distribution...
                </div>
              ) : riskDistribution.total === 0 ? (
                <div className="w-full min-h-[210px] flex flex-col items-center justify-center p-6 text-center text-xs text-text-secondary">
                  <ShieldAlert size={24} className="text-text-muted mb-2" />
                  <span>No risk evaluations logged yet. Completed patient check-ins will be classified automatically.</span>
                </div>
              ) : (
                <RiskDonut
                  data={riskDonutData}
                  total={riskDistribution.total}
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
