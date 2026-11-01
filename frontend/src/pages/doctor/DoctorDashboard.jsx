import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import WoundReviewModal from '../../components/domain/WoundReviewModal.jsx'
import {
  Users, AlertTriangle, Calendar, Activity, ArrowRight, ShieldAlert,
  Bell, CheckCheck, Pill, Info, ChevronRight, Camera, Stethoscope, Eye, Check
} from 'lucide-react'
import { formatDate } from '../../utils/dateUtils'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const cn = (...a) => twMerge(clsx(...a))

export default function DoctorDashboard() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [patients, setPatients] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [reportStats, setReportStats] = useState(null)
  const [woundQueue, setWoundQueue] = useState([])
  const [woundQueueStats, setWoundQueueStats] = useState({ total_in_queue: 0, urgent_count: 0, pending_count: 0 })
  const [selectedWound, setSelectedWound] = useState(null)
  const [woundFilter, setWoundFilter] = useState('all') // 'all' | 'pending' | 'urgent'
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    try {
      const [notifRes, patRes, repRes, fuRes, woundRes] = await Promise.allSettled([
        api.get('/notifications/'),
        api.get('/patients/'),
        api.get('/reports/recovery/'),
        api.get('/follow-ups/'),
        api.get('/recovery/wounds/doctor/review-queue/'),
      ])
      if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value.data)) {
        setNotifications(notifRes.value.data)
      }
      if (patRes.status === 'fulfilled' && Array.isArray(patRes.value.data)) {
        setPatients(patRes.value.data)
      }
      if (repRes.status === 'fulfilled' && repRes.value.data) {
        setReportStats(repRes.value.data)
      }
      if (fuRes.status === 'fulfilled' && Array.isArray(fuRes.value.data)) {
        setFollowUps(fuRes.value.data)
      }
      if (woundRes.status === 'fulfilled' && woundRes.value.data) {
        const data = woundRes.value.data
        setWoundQueue(data.results || [])
        setWoundQueueStats({
          total_in_queue: data.total_in_queue || 0,
          urgent_count: data.urgent_count || 0,
          pending_count: data.pending_count || 0
        })
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 10000)
    return () => clearInterval(interval)
  }, [])

  const markNotifRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read/`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (e) {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all/')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (e) {}
  }

  const unreadNotifs = notifications.filter((n) => !n.is_read)
  const highRiskAlerts = notifications.filter((n) => n.type === 'high_risk_alert')
  const unreadHighRisk = highRiskAlerts.filter((n) => !n.is_read)

  const highRiskPatients = patients
    .filter((p) => p.latest_risk_level === 'high' || p.latest_recovery_score < 60)
    .slice(0, 6)
    .map((p) => ({
      id: p.patient_id,
      name: p.user ? `${p.user.first_name} ${p.user.last_name}` : p.patient_id,
      surgery: p.surgery_type || 'Post-Op Recovery',
      risk: p.latest_risk_level || 'high',
      score: p.latest_recovery_score ?? 45,
      checkin: p.latest_vitals?.date ? `Date: ${p.latest_vitals.date}` : 'Recent',
      temp: p.latest_vitals?.temperature || '38.2°C',
      pain: p.latest_vitals?.pain_level || '7/10',
    }))

  const todayFollowUps = followUps.slice(0, 5).map((fu) => ({
    time: fu.appointment_time ? fu.appointment_time.slice(0, 5) : '10:00 AM',
    name: fu.patient_name || 'Patient',
    type: fu.purpose || 'Post-Op Clinical Review',
    status: fu.status || 'upcoming',
  }))

  const filteredWounds = woundQueue.filter(w => {
    if (woundFilter === 'pending') return w.doctor_review_status === 'pending'
    if (woundFilter === 'urgent') return w.is_urgent
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, Dr. ${user?.last_name || 'Rajesh Varma'}`}
        action={
          <div className="flex items-center gap-2.5">
            <Link
              to="/doctor/notifications"
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-surface border border-border text-text text-xs font-medium rounded hover:bg-surface-muted transition-colors shadow-xs"
            >
              <Bell size={14} className={unreadNotifs.length > 0 ? "text-danger" : "text-text-muted"} />
              Notifications
              {unreadNotifs.length > 0 && (
                <span className="px-1.5 py-0.2 bg-danger text-white text-[10px] font-bold rounded-full">
                  {unreadNotifs.length}
                </span>
              )}
            </Link>
            <Link
              to="/doctor/discharge-plans/new"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-secondary text-text text-xs font-semibold rounded hover:bg-secondary-hover shadow-xs transition-colors"
            >
              + Create Discharge Plan
            </Link>
          </div>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Assigned Patients"
          value={patients.length}
          trend={`${patients.filter(p => p.is_active).length} active under care`}
          trendUp={true}
          icon={Users}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Wound Review Queue"
          value={`${woundQueueStats.pending_count} pending`}
          trend={woundQueueStats.urgent_count > 0 ? `${woundQueueStats.urgent_count} urgent attention` : "Queue updated"}
          trendUp={woundQueueStats.urgent_count === 0}
          icon={Camera}
          iconBg={woundQueueStats.urgent_count > 0 ? "bg-danger-tint" : "bg-primary-tint"}
          iconColor={woundQueueStats.urgent_count > 0 ? "text-danger" : "text-primary"}
        />
        <StatCard
          label="High-Risk Alerts"
          value={unreadHighRisk.length > 0 ? `${unreadHighRisk.length} active` : "0 active"}
          trend={unreadHighRisk.length > 0 ? "Action required" : "All cleared"}
          trendUp={unreadHighRisk.length === 0}
          icon={AlertTriangle}
          iconBg={unreadHighRisk.length > 0 ? "bg-danger-tint" : "bg-success-tint"}
          iconColor={unreadHighRisk.length > 0 ? "text-danger" : "text-success"}
        />
        <StatCard
          label="Clinical Follow-Ups"
          value={`${followUps.length} scheduled`}
          trend="Upcoming appointments"
          trendUp={true}
          icon={Calendar}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
      </div>

      {/* Urgent Clinical Alert Strip */}
      {unreadHighRisk.length > 0 && (
        <div className="p-4 bg-danger-tint border-l-4 border-l-danger border border-danger/20 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-danger flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-xs font-bold text-danger uppercase tracking-wide">
                {unreadHighRisk.length} High-Risk Alert{unreadHighRisk.length > 1 ? 's' : ''} Require Immediate Attention
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {unreadHighRisk[0]?.message || 'Elevated temperature and acute pain thresholds detected.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => markNotifRead(unreadHighRisk[0]?.id)}
              className="h-8 px-3 text-xs font-semibold bg-surface border border-danger/30 text-danger rounded hover:bg-danger-tint transition-colors"
            >
              Acknowledge
            </button>
            <Link
              to="/doctor/notifications"
              className="h-8 px-3.5 bg-danger text-white text-xs font-semibold rounded hover:bg-danger-hover transition-colors whitespace-nowrap shadow-xs flex items-center gap-1"
            >
              Review Alerts <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Wound Image Review Section */}
      <Card>
        <CardHeader
          title="Wound Image Review Queue"
          description="Assess uploaded recovery images, review AI findings, approve post-op guidance, or request photo re-takes."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWoundFilter('all')}
                className={cn(
                  "px-2.5 py-1 text-xs rounded font-semibold transition-colors cursor-pointer",
                  woundFilter === 'all' ? "bg-primary text-white" : "bg-surface border border-border text-text hover:bg-surface-muted"
                )}
              >
                All ({woundQueue.length})
              </button>
              <button
                type="button"
                onClick={() => setWoundFilter('pending')}
                className={cn(
                  "px-2.5 py-1 text-xs rounded font-semibold transition-colors cursor-pointer",
                  woundFilter === 'pending' ? "bg-primary text-white" : "bg-surface border border-border text-text hover:bg-surface-muted"
                )}
              >
                Pending ({woundQueueStats.pending_count})
              </button>
              <button
                type="button"
                onClick={() => setWoundFilter('urgent')}
                className={cn(
                  "px-2.5 py-1 text-xs rounded font-semibold transition-colors cursor-pointer",
                  woundFilter === 'urgent' ? "bg-danger text-white" : "bg-surface border border-border text-danger hover:bg-danger-tint"
                )}
              >
                Urgent ({woundQueueStats.urgent_count})
              </button>
            </div>
          }
        />
        <CardBody>
          {filteredWounds.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted bg-surface-muted/30 rounded border border-dashed border-border">
              No wound images in this queue category.
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#DDD0F7] text-primary border-b border-border font-bold">
                  <tr>
                    <th className="p-3">Wound Photo</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Upload Date / Day</th>
                    <th className="p-3">AI Analysis Status</th>
                    <th className="p-3">Observations Summary</th>
                    <th className="p-3">Review Status</th>
                    <th className="p-3 text-right">Clinical Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {filteredWounds.map((w) => {
                    const obs = w.ai_observations || {}
                    return (
                      <tr 
                        key={w.id} 
                        className={cn(
                          "hover:bg-bg bg-surface transition-colors",
                          w.is_urgent ? "bg-danger-tint/15" : ""
                        )}
                      >
                        <td className="p-3">
                          <div 
                            onClick={() => setSelectedWound(w)}
                            className="w-16 h-12 bg-surface-muted rounded overflow-hidden border border-border flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity relative group"
                          >
                            <img src={w.image} alt="Wound" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={14} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-text block">{w.patient_name || 'Patient'}</strong>
                            {w.is_urgent && (
                              <span className="px-1.5 py-0.2 bg-danger text-white text-[9px] font-bold rounded">
                                URGENT
                              </span>
                            )}
                          </div>
                          <span className="text-2xs text-text-muted block">{w.patient_uhid || w.patient_id}</span>
                          <span className="text-2xs text-text-secondary">{w.surgery_details}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-text block">
                            Day {w.recovery_day || 1} Post-Op
                          </span>
                          <span className="text-2xs text-text-muted">
                            {new Date(w.upload_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-bold uppercase rounded border inline-block",
                            w.assessment_result === 'good' ? 'bg-primary-tint text-primary border-primary/30' :
                            w.assessment_result === 'moderate' ? 'bg-warning-tint text-warning border-warning/30' :
                            w.assessment_result === 'poor' ? 'bg-danger-tint text-danger border-danger/30' :
                            w.assessment_result === 'uncertain' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
                            'bg-surface-muted text-text-muted border-border'
                          )}>
                            {w.assessment_result === 'uncertain' ? 'Uncertain (Review Req.)' :
                             w.assessment_result === 'unavailable' ? 'AI Unavailable' :
                             `ML: ${w.assessment_result}`}
                          </span>
                          {w.confidence != null && (
                            <span className="text-2xs text-text-muted block mt-0.5">
                              Conf: {Math.round(w.confidence * 100)}%
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-xs">
                          {obs.redness ? (
                            <div className="text-2xs text-text-secondary line-clamp-2">
                              <span>Redness: {obs.redness.level}</span> · 
                              <span> Edges: {obs.wound_edges?.alignment || 'normal'}</span> · 
                              <span> Exudate: {obs.discharge?.level || 'clear'}</span>
                            </div>
                          ) : (
                            <span className="text-2xs text-text-muted italic">
                              {w.assessment_result === 'unavailable' 
                                ? 'AI analysis is currently unavailable. Awaiting clinician review.' 
                                : 'Pending visual extraction'}
                            </span>
                          )}
                          {w.remarks && (
                            <p className="text-2xs text-text-muted mt-0.5 line-clamp-1 italic">
                              Note: {w.remarks}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-bold uppercase rounded border inline-block",
                            w.doctor_review ? 'bg-success-tint border-success/30 text-success' : 'bg-warning-tint border border-amber-300 text-warning'
                          )}>
                            {w.doctor_review_status === 'reviewed' ? 'Approved' :
                             w.doctor_review_status === 'modified' ? 'Modified' :
                             w.doctor_review_status === 'image_requested' ? 'Photo Requested' :
                             w.doctor_review_status === 'escalated' ? 'Escalated' :
                             'Pending Review'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedWound(w)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-primary bg-primary-tint rounded hover:bg-primary hover:text-white transition-colors cursor-pointer"
                          >
                            <Stethoscope size={13} />
                            Review
                          </button>
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

      {/* High-Risk Patient Watchlist (7 cols) + Cohort Risk Stratification (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader
              title="High-Risk Watchlist"
              action={
                <Link to="/doctor/patients" className="text-xs font-semibold text-primary hover:underline">
                  All Patients →
                </Link>
              }
            />
            <CardBody>
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#DDD0F7] text-primary border-b border-border font-bold">
                    <tr>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Procedure</th>
                      <th className="p-3">Risk Level</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Vitals / Pain</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {highRiskPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-bg bg-surface transition-colors">
                        <td className="p-3">
                          <strong className="block text-text">{p.name}</strong>
                          <span className="text-2xs text-text-muted">{p.id}</span>
                        </td>
                        <td className="p-3 text-text-secondary">{p.surgery}</td>
                        <td className="p-3"><RiskBadge level={p.risk} /></td>
                        <td className="p-3 font-semibold text-danger tabular-nums">{p.score} / 100</td>
                        <td className="p-3 text-text-secondary">
                          <span>{p.temp}</span> · <span>Pain {p.pain}</span>
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            to={`/doctor/patients/${p.id}`}
                            className="inline-block px-2.5 py-1 text-xs font-semibold text-primary bg-primary-tint rounded hover:bg-primary hover:text-white transition-colors"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>


        {/* Risk Distribution Donut (5 cols) */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader title="Risk Distribution" />
            <CardBody>
              <RiskDonut
                data={[
                  { name: 'Low Risk', value: reportStats?.risk_distribution?.low ?? 0, color: '#15803D' },
                  { name: 'Medium Risk', value: reportStats?.risk_distribution?.medium ?? 0, color: '#92400E' },
                  { name: 'High Risk', value: reportStats?.risk_distribution?.high ?? 0, color: '#B91C1C' },
                ]}
                total={reportStats?.risk_distribution?.total ?? patients.length}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recovery Curve (7 cols) + Today's Schedule (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader title="14-Day Recovery Trend" />
            <CardBody>
              <LineTrend
                data={reportStats?.daily_trajectory || []}
                loading={loading}
                emptyMessage="No recovery check-in trajectory available."
              />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader
              title="Today's Schedule"
              action={
                <Link to="/doctor/follow-ups" className="text-xs font-semibold text-primary hover:underline">
                  All Appointments →
                </Link>
              }
            />
            <CardBody>
              <div className="space-y-3">
                {todayFollowUps.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-surface-muted rounded text-xs border border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{item.time}</span>
                        <strong className="text-text">{item.name}</strong>
                      </div>
                      <p className="text-2xs text-text-muted mt-0.5">{item.type}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader
          title="Recent Notifications"
          action={
            <div className="flex items-center gap-2">
              {unreadNotifs.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <Link
                to="/doctor/notifications"
                className="text-xs font-semibold text-text-secondary hover:text-text ml-2 flex items-center gap-1"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>
          }
        />
        <CardBody>
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-xs text-text-muted">
              No notifications to display.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.slice(0, 4).map((n) => {
                const isHighRisk = n.type === 'high_risk_alert'
                const isMed = n.type === 'medication_reminder'
                const isFollowup = n.type === 'followup_reminder'
                const isCheckin = n.type === 'checkin_reminder'

                return (
                  <div
                    key={n.id}
                    className={`py-3 px-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      !n.is_read ? 'bg-primary-tint/20 rounded' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isHighRisk
                            ? 'bg-danger-tint text-danger'
                            : isMed
                            ? 'bg-primary-tint text-primary'
                            : isFollowup
                            ? 'bg-secondary-tint text-secondary'
                            : isCheckin
                            ? 'bg-success-tint text-success'
                            : 'bg-surface-muted text-text-muted'
                        }`}
                      >
                        {isHighRisk ? <AlertTriangle size={15} /> :
                         isMed ? <Pill size={15} /> :
                         isFollowup ? <Calendar size={15} /> :
                         isCheckin ? <Activity size={15} /> :
                         <Info size={15} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs ${!n.is_read ? 'font-semibold text-text' : 'font-medium text-text-secondary'}`}>
                            {n.title}
                          </h4>
                          {isHighRisk && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-danger text-white rounded">
                              CRITICAL
                            </span>
                          )}
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                          {n.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
                      <span className="text-[11px] text-text-muted whitespace-nowrap">
                        {formatDate(n.created_at || new Date(), 'DD MMM YYYY, hh:mm A')}
                      </span>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => markNotifRead(n.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-primary bg-surface border border-border rounded hover:bg-surface-muted transition-colors cursor-pointer"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Clinical Wound Review Modal */}
      {selectedWound && (
        <WoundReviewModal
          isOpen={Boolean(selectedWound)}
          onClose={() => setSelectedWound(null)}
          wound={selectedWound}
          onActionComplete={() => {
            fetchDashboardData()
            setSelectedWound(null)
          }}
        />
      )}
    </div>
  )
}

