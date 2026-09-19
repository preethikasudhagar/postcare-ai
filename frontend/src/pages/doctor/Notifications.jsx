import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { PageHeader, Card, CardBody, CardHeader } from '../../components/ui/index.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import { Bell, CheckCheck, AlertTriangle, Pill, Calendar, Activity, Info, ShieldAlert, ArrowRight, Check } from 'lucide-react'

export default function DoctorNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchNotifs = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications/')
      if (Array.isArray(res.data)) {
        setNotifications(res.data)
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifs()
  }, [])

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read/`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (e) {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all/')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {}
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'high_risk') return n.type === 'high_risk_alert'
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length
  const highRiskCount = notifications.filter(n => n.type === 'high_risk_alert').length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Clinical Notifications & Escalations"
        description="Real-time clinical stream of high-risk patient alerts, recovery check-in logs, and surgical care updates"
        action={
          unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 h-10 px-4 bg-white border border-border-strong text-xs font-semibold rounded-lg text-text hover:bg-surface-muted transition-colors shadow-xs"
            >
              <CheckCheck size={15} /> Mark All as Read
            </button>
          )
        }
      />

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-border rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Total Notifications</p>
            <p className="text-2xl font-bold text-text mt-0.5">{notifications.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
            <Bell size={20} />
          </div>
        </div>

        <div className="p-4 bg-white border border-border rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Unread Active</p>
            <p className="text-2xl font-bold text-danger mt-0.5">{unreadCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-danger-tint text-danger flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="p-4 bg-white border border-border rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">High-Risk Escalations</p>
            <p className="text-2xl font-bold text-danger mt-0.5">{highRiskCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-warning-tint text-warning flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {[
          { id: 'all', label: `All Notifications (${notifications.length})` },
          { id: 'unread', label: `Unread Only (${unreadCount})` },
          { id: 'high_risk', label: `Critical Alerts (${highRiskCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === tab.id
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:bg-surface-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Stream */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-text-muted bg-white border border-border rounded-xl">
            Loading notification feed...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white border border-border rounded-xl">
            <div className="w-12 h-12 rounded-full bg-success-tint text-success flex items-center justify-center mx-auto mb-3">
              <Check size={24} />
            </div>
            <h4 className="text-sm font-semibold text-text">No notifications found</h4>
            <p className="text-xs text-text-muted mt-1">All clinical escalations in this filter have been acknowledged.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isHighRisk = item.type === 'high_risk_alert'
            const isMed = item.type === 'medication_reminder'
            const isFollowup = item.type === 'followup_reminder'
            const isCheckin = item.type === 'checkin_reminder'

            return (
              <div
                key={item.id}
                className={`p-5 bg-white border rounded-xl shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  !item.is_read
                    ? isHighRisk
                      ? 'border-l-4 border-l-danger border-danger/30 bg-danger-tint/10'
                      : 'border-l-4 border-l-primary border-primary/30 bg-primary-tint/10'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
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
                    {isHighRisk ? (
                      <AlertTriangle size={18} />
                    ) : isMed ? (
                      <Pill size={18} />
                    ) : isFollowup ? (
                      <Calendar size={18} />
                    ) : isCheckin ? (
                      <Activity size={18} />
                    ) : (
                      <Info size={18} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className={`text-sm ${!item.is_read ? 'font-bold text-text' : 'font-medium text-text-secondary'}`}>
                        {item.title}
                      </h4>
                      {isHighRisk && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-danger text-white rounded-full">
                          URGENT
                        </span>
                      )}
                      {!item.is_read && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary-tint text-primary rounded-full">
                          Unread
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-text-muted">
                      <span>{new Date(item.created_at || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      {item.related_patient && (
                        <Link
                          to={`/doctor/patients/${item.related_patient}`}
                          className="font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          View Patient Dossier <ArrowRight size={11} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  {!item.is_read && (
                    <button
                      onClick={() => markRead(item.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-text-secondary bg-surface-muted hover:bg-border rounded-lg transition-colors"
                    >
                      Mark Read
                    </button>
                  )}
                  {item.related_patient && (
                    <Link
                      to={`/doctor/patients/${item.related_patient}`}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      Open Case
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
