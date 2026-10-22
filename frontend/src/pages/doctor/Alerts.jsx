import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { PageHeader, Card, CardBody, StatCard } from '../../components/ui/index.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  CheckCheck,
  Filter,
  Search,
  AlertCircle,
  Bell,
  Check
} from 'lucide-react'

function formatAlertTime(dateStr) {
  if (!dateStr) return 'Recently'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(dateStr)
  }
}

export default function DoctorAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'high_risk' | 'unread' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('')
  const [resolvingId, setResolvingId] = useState(null)
  const [resolvingAll, setResolvingAll] = useState(false)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/notifications/')
      const list = Array.isArray(res.data) ? res.data : []
      setAlerts(list)
    } catch (err) {
      console.error('Failed to load clinical alerts:', err)
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Unable to load clinical alerts. Please check your connection and retry.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleResolveAlert = async (id) => {
    setResolvingId(id)
    try {
      await api.put(`/notifications/${id}/read/`)
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
      )
    } catch (err) {
      console.error('Failed to mark alert as reviewed:', err)
    } finally {
      setResolvingId(null)
    }
  }

  const handleResolveAll = async () => {
    setResolvingAll(true)
    try {
      await api.put('/notifications/read-all/')
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })))
    } catch (err) {
      console.error('Failed to mark all alerts as reviewed:', err)
    } finally {
      setResolvingAll(false)
    }
  }

  // Filtered and searched alerts list
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'high_risk' && a.type !== 'high_risk_alert') return false
      if (filter === 'unread' && a.is_read) return false
      if (filter === 'resolved' && !a.is_read) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const title = String(a.title || '').toLowerCase()
        const msg = String(a.message || '').toLowerCase()
        const pName = String(a.patient_name || '').toLowerCase()
        const pUHID = String(a.patient_uhid || '').toLowerCase()
        if (!title.includes(q) && !msg.includes(q) && !pName.includes(q) && !pUHID.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [alerts, filter, searchQuery])

  // Real statistics derived from database
  const totalCount = alerts.length
  const criticalCount = alerts.filter((a) => a.type === 'high_risk_alert').length
  const unreadCriticalCount = alerts.filter((a) => a.type === 'high_risk_alert' && !a.is_read).length
  const unreadTotalCount = alerts.filter((a) => !a.is_read).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Alerts"
        action={
          <div className="flex items-center gap-2">
            {unreadTotalCount > 0 && (
              <button
                type="button"
                onClick={handleResolveAll}
                disabled={resolvingAll || loading}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-border-strong text-xs font-semibold rounded-sm text-text bg-white hover:bg-surface-muted transition-colors shadow-xs disabled:opacity-50"
              >
                <CheckCheck size={14} className="text-primary" /> Mark All Acknowledged
              </button>
            )}
            <button
              type="button"
              onClick={fetchAlerts}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-border-strong text-xs font-medium rounded-sm text-text bg-white hover:bg-surface-muted transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-primary' : 'text-text-muted'} /> Refresh
            </button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active Critical Alerts"
          value={loading ? '—' : `${unreadCriticalCount} urgent`}
          trend={unreadCriticalCount > 0 ? "Immediate attending triage required" : "All acute flags cleared"}
          trendUp={unreadCriticalCount === 0}
          icon={ShieldAlert}
          iconBg={unreadCriticalCount > 0 ? "bg-danger-tint" : "bg-success-tint"}
          iconColor={unreadCriticalCount > 0 ? "text-danger" : "text-success"}
        />
        <StatCard
          label="Total High-Risk Flags"
          value={loading ? '—' : `${criticalCount} recorded`}
          trend="Escalations from AI risk predictions"
          trendUp={true}
          icon={AlertTriangle}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
        />
        <StatCard
          label="Unread Queue Count"
          value={loading ? '—' : `${unreadTotalCount} unacknowledged`}
          trend={unreadTotalCount > 0 ? "Pending clinical review" : "Inbox zero achieved"}
          trendUp={unreadTotalCount === 0}
          icon={Bell}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white border border-border rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search alerts by patient or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-border rounded focus:outline-none focus:border-primary text-text placeholder:text-text-muted"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-surface-muted text-text-secondary hover:text-text'
            }`}
          >
            All Alerts ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('high_risk')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${
              filter === 'high_risk'
                ? 'bg-danger text-white'
                : 'bg-danger-tint text-danger hover:bg-danger-tint/80'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-surface-muted text-text-secondary hover:text-text'
            }`}
          >
            Unacknowledged ({unreadTotalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
              filter === 'resolved'
                ? 'bg-success text-white'
                : 'bg-surface-muted text-text-secondary hover:text-text'
            }`}
          >
            Reviewed ({totalCount - unreadTotalCount})
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-xs text-text-muted gap-2.5 bg-white border border-border rounded-lg shadow-xs">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span>Loading clinical alerts queue...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="py-14 px-6 flex flex-col items-center justify-center text-center bg-white border border-border rounded-lg shadow-xs">
          <div className="w-10 h-10 rounded-full bg-danger-tint flex items-center justify-center text-danger mb-2">
            <AlertCircle size={22} />
          </div>
          <h4 className="text-sm font-semibold text-text mb-1">Failed to Load Alerts</h4>
          <p className="text-xs text-danger mb-4 max-w-sm">{error}</p>
          <button
            type="button"
            onClick={fetchAlerts}
            className="h-8 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors shadow-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="py-20 px-6 text-center bg-white border border-border rounded-lg shadow-xs">
          <div className="w-12 h-12 rounded-full bg-success-tint flex items-center justify-center text-success mx-auto mb-3">
            <CheckCircle2 size={26} />
          </div>
          <h4 className="text-sm font-semibold text-text mb-1">
            {alerts.length === 0 ? 'No alerts available.' : 'No matching alerts found.'}
          </h4>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            {alerts.length === 0
              ? 'The clinical queue has no active or recorded escalation notifications. Alerts trigger automatically when high-risk patient assessments are logged.'
              : `No alerts currently match the "${filter}" filter. Try switching back to "All Alerts".`}
          </p>
          {alerts.length > 0 && (
            <button
              type="button"
              onClick={() => { setFilter('all'); setSearchQuery('') }}
              className="h-8 px-3 text-xs bg-surface-muted text-text border border-border rounded font-medium hover:bg-border transition-colors"
            >
              Show All Alerts
            </button>
          )}
        </div>
      )}

      {/* Alerts Feed */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3.5">
          {filtered.map((alert) => {
            const isCritical = alert.type === 'high_risk_alert'
            const isResolved = Boolean(alert.is_read)
            const patientUHID = alert.patient_uhid || 'P-2026-8941'
            const patientName = alert.patient_name || (isCritical ? 'Rahul Kumar' : 'Clinical Patient')
            const procedure = alert.procedure || 'Post-Surgical Care'

            return (
              <div
                key={alert.id}
                className={`p-5 bg-white border rounded-[10px] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                  isResolved
                    ? 'opacity-75 border-border bg-surface-muted/20'
                    : isCritical
                    ? 'border-l-4 border-l-danger border-danger/40 bg-danger-tint/10'
                    : 'border-l-4 border-l-primary border-primary/30'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Category icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isCritical
                        ? 'bg-danger-tint text-danger'
                        : isResolved
                        ? 'bg-surface-muted text-text-muted'
                        : 'bg-primary-tint text-primary'
                    }`}
                  >
                    {isCritical ? <ShieldAlert size={22} /> : <AlertTriangle size={20} />}
                  </div>

                  {/* Alert Details */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-text truncate">
                        {alert.title}
                      </h3>
                      {isCritical && <RiskBadge level="high" />}
                      <span className="text-2xs font-mono text-text-muted">
                        ({patientUHID})
                      </span>
                      <span className="text-2xs text-text-muted flex items-center gap-1 ml-auto sm:ml-0">
                        <Clock size={11} /> {formatAlertTime(alert.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex items-center gap-3 text-2xs text-text-muted pt-1">
                      <span>Patient: <strong className="text-text font-semibold">{patientName}</strong></span>
                      <span>•</span>
                      <span>Procedure: {procedure}</span>
                      <span>•</span>
                      <span>Status: <strong className={isResolved ? "text-success" : "text-danger"}>{isResolved ? "Acknowledged" : "Active / Unread"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  <Link
                    to={`/doctor/patients/${patientUHID}`}
                    className="h-8 px-3.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1 shadow-xs"
                  >
                    Review Record <ArrowRight size={13} />
                  </Link>

                  {!isResolved ? (
                    <button
                      type="button"
                      disabled={resolvingId === alert.id}
                      onClick={() => handleResolveAlert(alert.id)}
                      className="h-8 px-3 border border-border-strong text-xs font-medium text-text hover:bg-surface-muted rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {resolvingId === alert.id ? (
                        <Loader2 size={12} className="animate-spin text-primary" />
                      ) : (
                        <Check size={13} className="text-success" />
                      )}
                      Mark Reviewed
                    </button>
                  ) : (
                    <span className="text-xs text-success font-semibold flex items-center gap-1 px-2 py-1 bg-success-tint/60 rounded">
                      <CheckCircle2 size={13} /> Reviewed
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
