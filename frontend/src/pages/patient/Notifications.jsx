import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { PageHeader, Card, CardBody } from '../../components/ui/index.jsx'
import { Bell, CheckCheck, AlertTriangle, Pill, Calendar, Activity, Info } from 'lucide-react'

export default function Notifications() {
  const [filter, setFilter] = useState('all')
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifs = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications/')
      if (Array.isArray(res.data) && res.data.length > 0) {
        setNotifs(res.data)
      } else {
        // Fallback demo notifications
        setNotifs([
          {
            id: 1,
            type: 'medication_reminder',
            title: 'Evening Medication Reminder',
            message: 'It is time to administer Enoxaparin Sodium 40mg (SubQ) as prescribed for DVT prophylaxis.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            is_read: false,
          },
          {
            id: 2,
            type: 'checkin_reminder',
            title: 'Daily Recovery Assessment Due',
            message: 'Please complete your Day 14 post-op recovery check-in before 08:00 PM.',
            created_at: new Date(Date.now() - 14400000).toISOString(),
            is_read: false,
          },
          {
            id: 3,
            type: 'followup_reminder',
            title: 'Upcoming Appointment Confirmed',
            message: 'Your Staple Removal consultation with Dr. Rajesh Varma is confirmed for 24 Sep @ 10:30 AM.',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            is_read: true,
          }
        ])
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
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (e) {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all/')
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {}
  }

  const filtered = notifs.filter((n) => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'alerts') return n.type === 'high_risk_alert' || n.type === 'medication_reminder'
    return true
  })

  return (
    <div className="max-w-form mx-auto space-y-6">
      <PageHeader
        title="Notification Center"
        description="Medication reminders, follow-up alerts, and care team announcements"
        action={
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-border-strong text-xs font-medium rounded-lg text-text bg-white hover:bg-surface-muted transition-colors shadow-xs"
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 text-xs font-medium">
        {[
          { id: 'all', label: 'All Notifications' },
          { id: 'unread', label: 'Unread Only' },
          { id: 'alerts', label: 'Reminders & Alerts' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === t.id ? 'bg-primary text-white font-semibold' : 'text-text-secondary hover:bg-surface-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isHighRisk = item.type === 'high_risk_alert'
          const isMed = item.type === 'medication_reminder'
          const isFollowup = item.type === 'followup_reminder'
          const isCheckin = item.type === 'checkin_reminder'

          return (
            <div
              key={item.id}
              onClick={() => !item.is_read && markRead(item.id)}
              className={`p-4 bg-white border rounded-xl flex items-start gap-3.5 transition-shadow hover:shadow-xs cursor-pointer ${
                !item.is_read ? 'border-primary/40 bg-primary-tint/10' : 'border-border'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                  <AlertTriangle size={16} />
                ) : isMed ? (
                  <Pill size={16} />
                ) : isFollowup ? (
                  <Calendar size={16} />
                ) : isCheckin ? (
                  <Activity size={16} />
                ) : (
                  <Info size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-xs ${!item.is_read ? 'font-bold text-text' : 'font-medium text-text-secondary'}`}>
                    {item.title}
                  </h4>
                  <span className="text-2xs text-text-muted flex-shrink-0">
                    {new Date(item.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{item.message}</p>
              </div>
              {!item.is_read && (
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
