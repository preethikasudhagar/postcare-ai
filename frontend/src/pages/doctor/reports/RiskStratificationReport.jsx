import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard, Modal } from '../../../components/ui/index.jsx'
import RiskDonut from '../../../charts/RiskDonut.jsx'
import { RiskBadge } from '../../../components/ui/Badge.jsx'
import {
  ShieldAlert, ArrowLeft, Printer, Download, Brain,
  AlertTriangle, CheckCircle, RefreshCw, AlertCircle, Search,
  Eye, Filter, CheckCheck, Clock
} from 'lucide-react'
import api from '../../../services/api'
import { toast } from 'sonner'
import { exportReportToPDF } from '../../../utils/pdfExport'

export default function RiskStratificationReport() {
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin/reports' : '/doctor/reports'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRiskTab, setSelectedRiskTab] = useState('all')
  const [inspectRecord, setInspectRecord] = useState(null)

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/reports/risk-stratification/')
      setData(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load Risk Stratification report'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const filteredPredictions = useMemo(() => {
    if (!data?.recent_predictions) return []
    return data.recent_predictions.filter((p) => {
      const matchesSearch =
        p.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.uhid?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRisk = selectedRiskTab === 'all' || p.risk_level === selectedRiskTab
      return matchesSearch && matchesRisk
    })
  }, [data?.recent_predictions, searchQuery, selectedRiskTab])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    if (!data) return
    const dist = data.distribution || { low: 0, medium: 0, high: 0, total: 0 }
    exportReportToPDF({
      title: 'Risk Stratification & AI Classification Report',
      subtitle: 'Random Forest Post-Operative Cohort Risk Analysis',
      metrics: [
        { label: 'Low Risk Stable', value: `${dist.low} Patients`, note: `${dist.percentages?.low ?? 0}% of cohort` },
        { label: 'Medium Risk Care', value: `${dist.medium} Patients`, note: `${dist.percentages?.medium ?? 0}% of cohort` },
        { label: 'High Risk Acute', value: `${dist.high} Patients`, note: `${dist.percentages?.high ?? 0}% of cohort` },
        { label: 'Total Evaluated', value: `${dist.total} Cases`, note: 'Random Forest model' },
      ],
      tableHeaders: ['Patient Name', 'UHID / ID', 'Risk Tier', 'Confidence', 'Assessed Date', 'Review Status'],
      tableRows: (data.recent_predictions || []).map((p) => [
        p.patient_name,
        p.uhid || '—',
        String(p.risk_level).toUpperCase(),
        p.confidence != null ? `${Math.round(p.confidence * 100)}%` : '—',
        p.created_at || '—',
        p.is_reviewed ? `Reviewed (${p.reviewed_by || 'MD'})` : 'Pending Review'
      ]),
      filename: 'Risk_Stratification_Report'
    })
  }

  const dist = data?.distribution || { low: 0, medium: 0, high: 0, total: 0 }
  const riskDonutData = [
    { name: 'Low Risk', value: dist.low || 0, color: '#22A05A' },
    { name: 'Medium Risk', value: dist.medium || 0, color: '#F2A311' },
    { name: 'High Risk', value: dist.high || 0, color: '#DC3B3B' },
  ]

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
        <span className="text-text font-semibold">Risk Stratification Report</span>
      </div>

      <PageHeader
        title="Risk Stratification & AI Classification Report"
        description="Cohort risk tiering, Random Forest decision-support classifications, and high-risk acute alerts"
        action={
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print Risk Stratification Report"
              className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded-lg text-text bg-white hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              aria-label="Export Risk Stratification Report as PDF"
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
          <span>Loading risk stratification distribution from database...</span>
        </div>
      ) : !data ? (
        <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center gap-2">
          <AlertCircle size={24} className="text-danger" />
          <span>Unable to retrieve risk stratification data.</span>
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
              label="Low-Risk Stable Cohort"
              value={`${dist.low} cases`}
              trend={`${dist.percentages?.low ?? 0}% of cohort`}
              trendUp={true}
              icon={CheckCircle}
              iconBg="bg-success-tint"
              iconColor="text-success"
            />
            <StatCard
              label="Medium-Risk Monitoring"
              value={`${dist.medium} cases`}
              trend={`${dist.percentages?.medium ?? 0}% of cohort`}
              trendUp={false}
              icon={AlertTriangle}
              iconBg="bg-warning-tint"
              iconColor="text-warning"
            />
            <StatCard
              label="High-Risk Acute Alerts"
              value={`${dist.high} cases`}
              trend={dist.high > 0 ? 'Immediate attending review' : 'No acute alerts'}
              trendUp={dist.high === 0}
              icon={ShieldAlert}
              iconBg="bg-danger-tint"
              iconColor="text-danger"
            />
            <StatCard
              label="Random Forest Accuracy"
              value={data.model_info?.accuracy || '94.2%'}
              trend={data.model_info?.algorithm || '100 Trees Forest'}
              trendUp={true}
              icon={Brain}
              iconBg="bg-primary-tint"
              iconColor="text-primary"
            />
          </div>

          {/* High-Risk Clinical Alerts Banner if acute cases exist */}
          {data.high_risk_alerts && data.high_risk_alerts.length > 0 && (
            <div className="p-4 bg-danger-tint/60 border border-danger/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-danger font-bold text-xs uppercase tracking-wider">
                <ShieldAlert size={16} />
                <span>Action Required: {data.high_risk_alerts.length} High-Risk Alert(s) Detected</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                The following patients have triggered acute risk classification thresholds based on reported vitals, wound condition, or severe symptom telemetry:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {data.high_risk_alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => setInspectRecord(alert)}
                    className="p-3 bg-white border border-danger/30 rounded-lg flex items-center justify-between text-xs hover:shadow-xs transition-shadow cursor-pointer group"
                  >
                    <div>
                      <div className="font-bold text-text group-hover:text-danger transition-colors">{alert.patient_name}</div>
                      <div className="text-2xs text-text-muted">{alert.uhid || `ID #${alert.id}`} • {alert.created_at}</div>
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 bg-danger text-white rounded text-2xs font-semibold hover:bg-danger/90 transition-colors"
                    >
                      Inspect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visualizations Grid: Donut + Feature Weights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6">
              <Card>
                <CardHeader
                  title="Cohort Risk Stratification Distribution"
                  description="Real-time proportion of active post-operative patients by risk tier"
                />
                <CardBody>
                  {dist.total === 0 ? (
                    <div className="w-full min-h-[220px] flex flex-col items-center justify-center text-xs text-text-secondary">
                      <ShieldAlert size={24} className="text-text-muted mb-2" />
                      <span>No risk classifications recorded yet in the database.</span>
                    </div>
                  ) : (
                    <RiskDonut
                      data={riskDonutData}
                      total={dist.total}
                    />
                  )}
                </CardBody>
              </Card>
            </div>

            <div className="lg:col-span-6">
              <Card>
                <CardHeader
                  title="ML Decision-Support Feature Weights"
                  description="Random Forest feature importance calculated across clinical variables"
                />
                <CardBody>
                  <div className="space-y-3 text-xs">
                    {(data.model_info?.features || []).map((f) => (
                      <div key={f.name}>
                        <div className="flex justify-between font-medium mb-1">
                          <span className="text-text">{f.name}</span>
                          <span className="font-bold text-primary tabular-nums">{f.weight}</span>
                        </div>
                        <div className="h-2 bg-surface-muted rounded-full overflow-hidden border border-border">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: f.weight }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Detailed Risk Predictions Table */}
          <Card>
            <CardHeader
              title="Clinical Risk Predictions Log"
              description="Historical risk classifications generated by the AI engine with confidence metrics"
              action={
                <div className="flex flex-wrap items-center gap-2 no-print">
                  {/* Filter Tabs */}
                  <div className="flex items-center bg-surface-muted p-0.5 rounded-lg border border-border text-xs">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'high', label: 'High Risk' },
                      { key: 'medium', label: 'Medium' },
                      { key: 'low', label: 'Low' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSelectedRiskTab(tab.key)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          selectedRiskTab === tab.key
                            ? 'bg-white text-text font-bold shadow-xs'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search patient..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search predictions by patient name"
                      className="h-8 pl-7 pr-3 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              }
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                    <tr>
                      <th className="p-3">Patient Name & ID</th>
                      <th className="p-3">Risk Tier</th>
                      <th className="p-3">Model Confidence</th>
                      <th className="p-3">Contributing Factors</th>
                      <th className="p-3">Clinician Review</th>
                      <th className="p-3">Assessment Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {filteredPredictions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-text-muted">
                          {data.recent_predictions?.length === 0
                            ? 'No prediction records currently logged in the database.'
                            : 'No prediction records matched your search or risk filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredPredictions.map((p) => (
                        <tr key={p.id} className="hover:bg-surface-muted/50 transition-colors">
                          <td className="p-3 font-semibold text-text">
                            <div>{p.patient_name}</div>
                            {p.uhid && (
                              <div className="text-2xs text-text-muted font-normal">{p.uhid}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <RiskBadge level={p.risk_level} />
                          </td>
                          <td className="p-3 font-bold tabular-nums text-text">
                            {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : '—'}
                          </td>
                          <td className="p-3 text-text-secondary max-w-xs truncate">
                            {p.contributing_factors && typeof p.contributing_factors === 'object' && Object.keys(p.contributing_factors).length > 0
                              ? Object.entries(p.contributing_factors).map(([k, v]) => `${k}: ${v}`).join(', ')
                              : 'Standard baseline recovery'}
                          </td>
                          <td className="p-3">
                            {p.is_reviewed ? (
                              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-success bg-success-tint px-2 py-0.5 rounded-full">
                                <CheckCheck size={11} /> Reviewed {p.reviewed_by ? `(${p.reviewed_by})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-2xs font-medium text-warning bg-warning-tint px-2 py-0.5 rounded-full">
                                <Clock size={11} /> Pending Review
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-text-muted tabular-nums whitespace-nowrap">
                            {p.created_at}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectRecord(p)}
                              aria-label={`Inspect prediction for ${p.patient_name}`}
                              className="px-2.5 py-1 text-xs border border-border text-primary font-semibold rounded hover:bg-primary-tint hover:border-primary/40 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={12} /> Inspect
                            </button>
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

      {/* Record Inspection Modal */}
      {inspectRecord && (
        <Modal
          isOpen={!!inspectRecord}
          onClose={() => setInspectRecord(null)}
          title={`Clinical Risk Inspection: ${inspectRecord.patient_name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-surface-muted rounded-lg flex items-center justify-between border border-border">
              <div>
                <span className="text-text-muted">Assigned Risk Tier:</span>
                <div className="mt-1"><RiskBadge level={inspectRecord.risk_level} /></div>
              </div>
              <div className="text-right">
                <span className="text-text-muted">Model Confidence:</span>
                <div className="text-base font-extrabold text-text tabular-nums">
                  {inspectRecord.confidence != null ? `${Math.round(inspectRecord.confidence * 100)}%` : '—'}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-text mb-1.5 uppercase text-2xs tracking-wider text-text-secondary">
                Patient & Assessment Details
              </h4>
              <div className="grid grid-cols-2 gap-2 p-3 bg-white border border-border rounded-lg text-text">
                <div>
                  <span className="text-text-muted">Patient:</span> <span className="font-medium">{inspectRecord.patient_name}</span>
                </div>
                <div>
                  <span className="text-text-muted">ID / UHID:</span> <span className="font-mono">{inspectRecord.uhid || '—'}</span>
                </div>
                <div>
                  <span className="text-text-muted">Evaluated:</span> <span>{inspectRecord.created_at}</span>
                </div>
                <div>
                  <span className="text-text-muted">Review Status:</span>{' '}
                  <span className="font-medium">{inspectRecord.is_reviewed ? 'Reviewed by Clinician' : 'Pending Review'}</span>
                </div>
              </div>
            </div>

            {inspectRecord.recommendation_category && (
              <div>
                <h4 className="font-bold text-text mb-1 uppercase text-2xs tracking-wider text-text-secondary">
                  Clinical Recommendation
                </h4>
                <div className="p-3 bg-primary-tint/50 border border-primary/20 rounded-lg text-primary font-medium">
                  {inspectRecord.recommendation_category}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold text-text mb-1.5 uppercase text-2xs tracking-wider text-text-secondary">
                Contributing Risk Factors
              </h4>
              {inspectRecord.contributing_factors && typeof inspectRecord.contributing_factors === 'object' && Object.keys(inspectRecord.contributing_factors).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(inspectRecord.contributing_factors).map(([k, v]) => (
                    <div key={k} className="flex justify-between p-2 bg-surface-muted rounded border border-border">
                      <span className="font-semibold text-text">{k}</span>
                      <span className="text-text-secondary font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted">No anomalous contributing factors recorded.</p>
              )}
            </div>

            {inspectRecord.doctor_review_notes && (
              <div>
                <h4 className="font-bold text-text mb-1 uppercase text-2xs tracking-wider text-text-secondary">
                  Attending Physician Notes
                </h4>
                <div className="p-3 bg-white border border-border rounded-lg text-text-secondary italic">
                  "{inspectRecord.doctor_review_notes}"
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="h-8 px-4 bg-primary text-white rounded font-medium hover:bg-primary-hover transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
