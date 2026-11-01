import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import api from '../../services/api'
import { Users, Brain, Building2, FileText, Camera, Clock, UserCheck, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    usersCount: 0,
    patientsCount: 0,
    doctorsCount: 0,
    caregiversCount: 0,
    plansCount: 0,
    departmentsCount: 0,
    reportStats: null,
  })
  const [woundStats, setWoundStats] = useState({
    total_uploaded: 0,
    awaiting_ai_analysis: 0,
    awaiting_physician_review: 0,
    reviewed_cases: 0,
    urgent_attention_cases: 0,
    recent_audits: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchStats() {
      try {
        const [usersRes, plansRes, deptsRes, repRes, woundRes] = await Promise.allSettled([
          api.get('/admin/users/'),
          api.get('/discharge-plans/'),
          api.get('/admin/departments/'),
          api.get('/reports/recovery/'),
          api.get('/recovery/wounds/admin/stats/'),
        ])
        if (!mounted) return

        let uCount = 0
        let pCount = 0
        let dCount = 0
        let cCount = 0
        if (usersRes.status === 'fulfilled') {
          const list = Array.isArray(usersRes.value.data) ? usersRes.value.data : usersRes.value.data?.results || []
          uCount = list.length
          pCount = list.filter(u => u.role === 'patient').length
          dCount = list.filter(u => u.role === 'doctor').length
          cCount = list.filter(u => u.role === 'caregiver').length
        }

        let plCount = 0
        if (plansRes.status === 'fulfilled') {
          const list = Array.isArray(plansRes.value.data) ? plansRes.value.data : plansRes.value.data?.results || []
          plCount = list.length
        }

        let deptCount = 0
        if (deptsRes.status === 'fulfilled') {
          const list = Array.isArray(deptsRes.value.data) ? deptsRes.value.data : deptsRes.value.data?.results || []
          deptCount = list.length
        }

        let reportData = null
        if (repRes.status === 'fulfilled' && repRes.value.data) {
          reportData = repRes.value.data
        }

        if (woundRes.status === 'fulfilled' && woundRes.value.data) {
          setWoundStats(woundRes.value.data)
        }

        setStats({
          usersCount: uCount,
          patientsCount: pCount,
          doctorsCount: dCount,
          caregiversCount: cCount,
          plansCount: plCount,
          departmentsCount: deptCount,
          reportStats: reportData,
        })
      } catch (err) {
        // Fallback
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStats()
    return () => { mounted = false }
  }, [])

  const riskData = [
    { name: 'Low Risk', value: stats.reportStats?.risk_distribution?.low ?? 0, color: '#15803D' },
    { name: 'Medium Risk', value: stats.reportStats?.risk_distribution?.medium ?? 0, color: '#92400E' },
    { name: 'High Risk', value: stats.reportStats?.risk_distribution?.high ?? 0, color: '#B91C1C' },
  ]
  const totalRisks = stats.reportStats?.risk_distribution?.total ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" />

      {/* Hospital Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Users"
          value={stats.usersCount}
          trend={`${stats.patientsCount} Patients · ${stats.doctorsCount} Doctors · ${stats.caregiversCount} Caregivers`}
          trendUp={true}
          icon={Users}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Active Discharge Plans"
          value={stats.plansCount}
          trend="Across clinical departments"
          trendUp={true}
          icon={FileText}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
        <StatCard
          label="Recovery Assessments & ML Inferences"
          value={stats.reportStats?.total_checkins_logged ? `${stats.reportStats.total_checkins_logged}` : "0"}
          trend="Active risk classification pipeline"
          trendUp={true}
          icon={Brain}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="Clinical Departments"
          value={stats.departmentsCount}
          trend="Active specialized units"
          trendUp={true}
          icon={Building2}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
        />
      </div>

      {/* Wound-Monitoring Statistics Section (Requirement 7) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <Camera size={18} className="text-primary" />
              Automatic Wound Monitoring & AI Workflow
            </h2>
            <p className="text-xs text-text-secondary">
              Real-time surveillance of patient image uploads, AI analysis pipeline, and clinician review governance.
            </p>
          </div>
          <span className="text-2xs text-text-muted bg-surface-muted px-2.5 py-1 rounded border border-border">
            Read-only administrative monitoring
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Images Uploaded"
            value={woundStats.total_uploaded}
            trend="Patient post-op submissions"
            trendUp={true}
            icon={Camera}
            iconBg="bg-primary-tint"
            iconColor="text-primary"
          />
          <StatCard
            label="Awaiting AI Analysis"
            value={woundStats.awaiting_ai_analysis}
            trend="In processing queue"
            trendUp={false}
            icon={Brain}
            iconBg="bg-secondary-tint"
            iconColor="text-secondary"
          />
          <StatCard
            label="Awaiting Physician Review"
            value={woundStats.awaiting_physician_review}
            trend="Pending doctor sign-off"
            trendUp={false}
            icon={Clock}
            iconBg="bg-warning-tint"
            iconColor="text-warning"
          />
          <StatCard
            label="Reviewed Cases"
            value={woundStats.reviewed_cases}
            trend="Physician-approved guidance"
            trendUp={true}
            icon={UserCheck}
            iconBg="bg-success-tint"
            iconColor="text-success"
          />
          <StatCard
            label="Urgent Attention Cases"
            value={woundStats.urgent_attention_cases}
            trend="Red flags flagged for escalation"
            trendUp={false}
            icon={AlertTriangle}
            iconBg="bg-danger-tint"
            iconColor="text-danger"
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader title="Cohort 14-Day Recovery Trend" />
            <CardBody>
              <LineTrend
                data={stats.reportStats?.daily_trajectory || []}
                loading={loading}
                emptyMessage="No recovery check-ins logged yet."
              />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card>
            <CardHeader title="Clinical Risk Distribution" />
            <CardBody>
              <RiskDonut
                data={riskData}
                total={totalRisks}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Workflow Status & Governance Audit Table (Requirement 7) */}
      <Card>
        <CardHeader
          title="Recent Wound Monitoring & Clinical Workflow Audit"
          description="Auditing pipeline status, AI observation availability, and clinical sign-off across all registered recovery cohorts without modifying clinical decisions."
        />
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6 text-center text-xs text-text-muted">Loading audit records...</div>
          ) : !woundStats.recent_audits || woundStats.recent_audits.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">
              No wound uploads recorded in system yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50 text-text-secondary font-semibold">
                    <th className="py-2.5 px-4">Patient / UHID</th>
                    <th className="py-2.5 px-4">Surgery Details & Day</th>
                    <th className="py-2.5 px-4">Upload Timestamp</th>
                    <th className="py-2.5 px-4">AI Analysis Status</th>
                    <th className="py-2.5 px-4">Triage Priority</th>
                    <th className="py-2.5 px-4">Physician Review Status</th>
                    <th className="py-2.5 px-4">Assigned / Reviewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {woundStats.recent_audits.map((item) => {
                    const isUrgent = Boolean(item.is_urgent)
                    return (
                      <tr key={item.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-text">{item.patient_name || 'Patient'}</div>
                          <div className="text-2xs text-text-muted">{item.patient_uhid || `ID: #${item.patient}`}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-text font-medium">{item.surgery_details || 'Post-operative recovery'}</div>
                          <div className="text-2xs text-text-muted">Recovery Day: {item.recovery_day ?? '1'}</div>
                        </td>
                        <td className="py-3 px-4 text-text-secondary">
                          {new Date(item.upload_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          {item.ai_analysis_status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-success-tint text-success">
                              <ShieldCheck size={12} /> Model Evaluated
                            </span>
                          ) : item.ai_analysis_status === 'unavailable' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-surface-muted text-text-muted border border-border">
                              Clinician Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-secondary-tint text-secondary">
                              <Brain size={12} className="animate-pulse" /> Processing
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isUrgent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-danger-tint text-danger border border-danger/30">
                              <AlertTriangle size={12} /> Urgent Flagged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-surface-muted text-text-muted">
                              Routine Check
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {item.doctor_review_status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-success-tint text-success">
                              Approved
                            </span>
                          ) : item.doctor_review_status === 'modified' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-primary-tint text-primary">
                              Modified
                            </span>
                          ) : item.doctor_review_status === 'requested_retake' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-warning-tint text-warning">
                              Retake Requested
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-warning-tint text-warning">
                              Awaiting Review
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-text-secondary text-2xs">
                          {item.reviewed_by_name ? (
                            <span className="font-semibold text-text">{item.reviewed_by_name}</span>
                          ) : (
                            <span className="text-text-muted italic">Awaiting physician</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
