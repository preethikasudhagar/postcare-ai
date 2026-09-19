import React, { useState } from 'react'
import { PageHeader, Card, CardBody } from '../../components/ui/index.jsx'
import { Bell, CheckCheck, AlertTriangle, Pill, Calendar, Activity, Info } from 'lucide-react'

export default function Notifications() {
  const [filter, setFilter] = useState('all')
  const [notifs, setNotifs] = useState([
    {
      id: 1,
      type: 'medication',
      title: 'Evening Medication Reminder',
      message: 'It is time to administer Enoxaparin Sodium 40mg (SubQ) as prescribed for DVT prophylaxis.',
      time: '1 hour ago',
      read: false,
      icon: Pill,
      iconBg: 'bg-primary-tint text-primary'
    },
    {
      id: 2,
      type: 'checkin',
      title: 'Daily Recovery Assessment Due',
      message: 'Please complete your Day 14 post-op recovery check-in before 08:00 PM.',
      time: '4 hours ago',
      read: false,
      icon: Activity,
      iconBg: 'bg-secondary-tint text-secondary'
    },
    {
      id: 3,
      type: 'followup',
      title: 'Upcoming Appointment Confirmed',
      message: 'Your Staple Removal consultation with Dr. Rajesh Varma is confirmed for 24 Sep @ 10:30 AM.',
      time: 'Yesterday',
      read: true,
      icon: Calendar,
      iconBg: 'bg-success-tint text-success'
    },
    {
      id: 4,
      type: 'alert',
      title: 'System Health Notification',
      message: 'Your weekly recovery progress report is now available for download.',
      time: '2 days ago',
      read: true,
      icon: Info,
      iconBg: 'bg-warning-tint text-warning'
    }
  ])

  const markAllRead = () => {
    setNotifs(notifs.map(n => ({ ...n, read: true })))
  }

  const filtered = notifs.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'alerts') return n.type === 'alert' || n.type === 'medication'
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
            className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-border-strong text-xs font-medium rounded-sm text-text bg-white hover:bg-surface-muted transition-colors shadow-xs"
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
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-sm transition-colors ${
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
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className={`p-4 bg-white border rounded-[10px] flex items-start gap-3.5 transition-shadow hover:shadow-xs ${
                !item.read ? 'border-primary/40 bg-primary-tint/10' : 'border-border'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-text">{item.title}</h4>
                  <span className="text-2xs text-text-muted flex-shrink-0">{item.time}</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{item.message}</p>
              </div>
              {!item.read && (
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
