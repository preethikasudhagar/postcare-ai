import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { PageHeader, Card, CardHeader, CardBody, StatCard, DisclaimerNote } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import {
  Users, AlertTriangle, Calendar, Activity, ArrowRight, ShieldAlert,
  CheckCircle, Bell, CheckCheck, Pill, Info, ChevronRight
} from 'lucide-react'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    try {
      const [notifRes, patRes] = await Promise.allSettled([
        api.get('/notifications/'),
        api.get('/patients/'),
      ])
      if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value.data)) {
        setNotifications(notifRes.value.data)
      }
      if (patRes.status === 'fulfilled' && Array.isArray(patRes.value.data)) {
        setPatients(patRes.value.data)
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

  const highRiskPatients = [
    { id: 'P-101', name: 'Vikram Mehta', surgery: 'Cardiac Bypass (CABG)', risk: 'high', score: 38, checkin: 'Today 08:20 AM', temp: '38.6°C', pain: '8/10' },
    { id: 'P-104', name: 'Anil Sengupta', surgery: 'Spinal Lumbar Fusion', risk: 'high', score: 42, checkin: 'Today 07:45 AM', temp: '38.4°C', pain: '7/10' },
    { id: 'P-108', name: 'Sunita Rao', surgery: 'Appendectomy', risk: 'high', score: 45, checkin: 'Yesterday 09:10 PM', temp: '38.2°C', pain: '8/10' },
  ]

  const todayFollowUps = [
    { time: '10:00 AM', name: 'Rahul Sharma', type: 'Post-Op Day 14 Staple Removal', status: 'upcoming' },
    { time: '11:30 AM', name: 'Deepa Krishnan', type: 'Wound Dressing & Range Assessment', status: 'upcoming' },
    { time: '02:00 PM', name: 'Sanjay Deshmukh', type: 'Virtual Pain Management Review', status: 'upcoming' },
    { time: '04:15 PM', name: 'Kavita Menon', type: 'Physical Therapy Load Clearance', status: 'upcoming' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, Dr. ${user?.last_name || 'Rajesh Varma'}`}
        description="Clinical Post-Operative Monitoring Command Center & AI Decision Support"
        action={
          <div className="flex items-center gap-2.5">
            <Link
              to="/doctor/notifications"
              className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-border-strong text-text text-xs font-semibold rounded-lg hover:bg-surface-muted transition-colors shadow-xs"
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
              className="inline-flex items-center gap-1.5 h-10 px-4 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover shadow-xs transition-colors"
            >
              + Create Discharge Plan
            </Link>
          </div>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Monitored Patients"
          value={patients.length > 0 ? `${patients.length + 127}` : "128"}
          trend="+12 this week"
          trendUp={true}
          icon={Users}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="High-Risk Alerts"
          value={unreadHighRisk.length > 0 ? `${unreadHighRisk.length} active` : "0 active"}
          trend={unreadHighRisk.length > 0 ? "Requires attending review" : "All alerts acknowledged"}
          trendUp={unreadHighRisk.length === 0}
          icon={AlertTriangle}
          iconBg={unreadHighRisk.length > 0 ? "bg-danger-tint" : "bg-success-tint"}
          iconColor={unreadHighRisk.length > 0 ? "text-danger" : "text-success"}
        />
        <StatCard
          label="Today's Follow-Ups"
          value="4 scheduled"
          trend="1 staple removal"
          trendUp={true}
          icon={Calendar}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
        <StatCard
          label="Unread Notifications"
          value={`${unreadNotifs.length}`}
          trend={unreadNotifs.length > 0 ? "Live escalation queue" : "Inbox cleared"}
          trendUp={unreadNotifs.length === 0}
          icon={Bell}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
        />
      </div>

      {/* Alert Strip: Unresolved High-Risk Cases */}
      {unreadHighRisk.length > 0 ? (
        <div className="p-4 bg-danger-tint border-l-4 border-l-danger border border-danger/20 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-danger flex-shrink-0 mt-0.5" size={22} />
            <div>
              <h4 className="text-xs font-bold text-danger uppercase tracking-wide">
                {unreadHighRisk.length} HIGH-RISK CLINICAL ALERT{unreadHighRisk.length > 1 ? 'S' : ''} REQUIRE IMMEDIATE ATTENTION
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {unreadHighRisk[0]?.message || 'Automated Random Forest classification detected fever elevation (>38.2°C) and acute pain thresholds.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => markNotifRead(unreadHighRisk[0]?.id)}
              className="h-8 px-3 text-xs font-semibold bg-white border border-danger/30 text-danger rounded-lg hover:bg-danger-tint transition-colors"
            >
              Acknowledge
            </button>
            <Link
              to="/doctor/notifications"
              className="h-8 px-3.5 bg-danger text-white text-xs font-semibold rounded-lg hover:bg-danger-hover transition-colors whitespace-nowrap shadow-xs flex items-center gap-1"
            >
              Review All Alerts <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-success-tint border border-success/20 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-success font-medium">
            <CheckCircle size={17} />
            All acute risk alerts have been reviewed and triaged by the clinical care team.
          </div>
          <Link to="/doctor/alerts" className="text-xs text-success font-semibold hover:underline">
            View Alert Archive →
          </Link>
        </div>
      )}

      {/* LIVE NOTIFICATIONS & ESCALATIONS FEED SECTION */}
      <Card>
        <CardHeader
          title="Clinical Notifications & Escalations Hub"
          description="Live asynchronous alerts, recovery check-in submissions, and care coordination notifications"
          action={
            <div className="flex items-center gap-2">
              {unreadNotifs.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <Link
                to="/doctor/notifications"
                className="text-xs font-semibold text-text-secondary hover:text-text ml-2 flex items-center gap-1"
              >
                Full Center <ChevronRight size={14} />
              </Link>
            </div>
          }
        />
        <CardBody>
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No notifications currently registered for your provider account.
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
                    className={`py-3.5 px-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      !n.is_read ? 'bg-primary-tint/20 rounded-lg' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
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
                        {isHighRisk ? <AlertTriangle size={17} /> :
                         isMed ? <Pill size={17} /> :
                         isFollowup ? <Calendar size={17} /> :
                         isCheckin ? <Activity size={17} /> :
                         <Info size={17} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs ${!n.is_read ? 'font-bold text-text' : 'font-medium text-text-secondary'}`}>
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
                        {new Date(n.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => markNotifRead(n.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-primary bg-white border border-border rounded-md hover:bg-surface-muted transition-colors"
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

      {/* Main Section: High-Risk Patients Table (8 cols) + Recovery Donut (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader
              title="High-Risk Patient Watchlist"
              description="Prioritized list of patients triggering acute AI risk indicators"
              action={
                <Link to="/doctor/patients" className="text-xs font-semibold text-primary hover:underline">
                  View All Patients →
                </Link>
              }
            />
            <CardBody>
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-text-secondary border-b border-border font-medium">
                    <tr>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Surgical Procedure</th>
                      <th className="p-3">AI Risk</th>
                      <th className="p-3">Recovery Score</th>
                      <th className="p-3">Vitals / Pain</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {highRiskPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-danger-tint/20 transition-colors">
                        <td className="p-3">
                          <strong className="block text-text">{p.name}</strong>
                          <span className="text-2xs text-text-muted">{p.id}</span>
                        </td>
                        <td className="p-3 text-text-secondary">{p.surgery}</td>
                        <td className="p-3"><RiskBadge level={p.risk} /></td>
                        <td className="p-3 font-bold text-danger tabular-nums">{p.score} / 100</td>
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

        {/* Risk Distribution Donut (4 cols) */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader
              title="Cohort Risk Stratification"
              description="Real-time ML classification distribution"
            />
            <CardBody>
              <RiskDonut />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Charts Grid: Cohort Recovery Trend & Today's Follow-Ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader
              title="Cohort 14-Day Average Recovery Curve"
              description="Mean recovery score across active surgical discharges"
            />
            <CardBody>
              <LineTrend />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader
              title="Today's Consultation Schedule"
              description="Confirmed appointments scheduled for today"
            />
            <CardBody>
              <div className="space-y-3">
                {todayFollowUps.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-surface-muted rounded-lg text-xs border border-border">
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

      <DisclaimerNote />
    </div>
  )
}
