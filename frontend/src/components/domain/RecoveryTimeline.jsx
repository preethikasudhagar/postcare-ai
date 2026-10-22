import React, { useState } from 'react'
import { Calendar, CheckCircle2, AlertTriangle, AlertCircle, Activity, Thermometer, ShieldAlert } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const cn = (...a) => twMerge(clsx(...a))

/**
 * Normalizes raw API check-in objects or pre-formatted UI objects into a clean, safe shape.
 */
function normalizeCheckinData(rawData) {
  if (!Array.isArray(rawData)) return []

  return rawData
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      // Date formatting
      let displayDate = item.date || ''
      if (typeof displayDate === 'string' && displayDate.includes('-')) {
        try {
          const d = new Date(displayDate)
          if (!isNaN(d.getTime())) {
            displayDate = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
          }
        } catch (e) {}
      }

      // Risk level resolution
      let risk = 'low'
      if (item.risk_prediction && item.risk_prediction.risk_level) {
        risk = String(item.risk_prediction.risk_level).toLowerCase()
      } else if (item.risk) {
        risk = String(item.risk).toLowerCase()
      } else if (item.recovery_score !== undefined && item.recovery_score !== null) {
        const sc = Number(item.recovery_score)
        if (sc < 50) risk = 'high'
        else if (sc < 80) risk = 'medium'
      }

      const score = item.recovery_score ?? item.score ?? null
      const pain = item.pain_level ?? item.pain ?? null
      const temp = item.temperature ?? item.temp ?? null
      const wound = item.wound_condition ?? item.wound ?? 'normal'
      const symptoms = Array.isArray(item.symptoms) ? item.symptoms : []

      return {
        id: item.id || idx,
        day: item.day || idx + 1,
        date: displayDate || `Day ${idx + 1}`,
        score: score !== null ? Math.round(Number(score)) : null,
        risk: ['low', 'medium', 'high'].includes(risk) ? risk : 'low',
        pain: pain !== null ? Number(pain) : null,
        temp: temp !== null ? Number(temp) : null,
        wound: String(wound).replace('_', ' '),
        symptoms,
        isToday: Boolean(item.isToday || idx === rawData.length - 1),
        followUp: Boolean(item.followUp)
      }
    })
}

export default function RecoveryTimeline({
  data = null,
  loading = false,
  error = null,
  onRetry = null
}) {
  // Default mock fallback shown ONLY when data is null/undefined (no fetch attempted yet)
  // An empty array [] means fetch succeeded but no check-ins exist → show empty state, not mock
  const defaultFallbackData = [
    { day: 1, date: '06 Sep', score: 85, risk: 'low', pain: 2, temp: 36.6 },
    { day: 2, date: '07 Sep', score: 82, risk: 'low', pain: 3, temp: 36.8 },
    { day: 3, date: '08 Sep', score: 80, risk: 'low', pain: 3, temp: 36.7 },
    { day: 4, date: '09 Sep', score: 75, risk: 'medium', pain: 5, temp: 37.4 },
    { day: 5, date: '10 Sep', score: 70, risk: 'medium', pain: 6, temp: 37.6 },
    { day: 6, date: '11 Sep', score: 48, risk: 'high', pain: 8, temp: 38.4 },
    { day: 7, date: '12 Sep', score: 65, risk: 'medium', pain: 5, temp: 37.3 },
    { day: 8, date: '13 Sep', score: 72, risk: 'medium', pain: 4, temp: 37.0 },
    { day: 9, date: '14 Sep', score: 78, risk: 'low', pain: 3, temp: 36.8 },
    { day: 10, date: '15 Sep', score: 82, risk: 'low', pain: 2, temp: 36.6 },
    { day: 11, date: '16 Sep', score: 85, risk: 'low', pain: 2, temp: 36.5 },
    { day: 12, date: '17 Sep', score: 86, risk: 'low', pain: 1, temp: 36.6 },
    { day: 13, date: '18 Sep', score: 88, risk: 'low', pain: 1, temp: 36.5 },
    { day: 14, date: '19 Sep', isToday: true, score: 88, risk: 'low', pain: 1, temp: 36.5, followUp: true }
  ]

  const rawList = data === null || data === undefined ? defaultFallbackData : data
  const timelineData = normalizeCheckinData(rawList)
  const [hovered, setHovered] = useState(null)

  const riskBadgeStyle = (risk) => {
    if (risk === 'low') return 'bg-success text-white border-success'
    if (risk === 'medium') return 'bg-warning text-white border-warning'
    if (risk === 'high') return 'bg-danger text-white border-danger'
    return 'bg-surface-muted text-text-muted border-border'
  }

  const latestStatus = timelineData.length > 0 ? timelineData[timelineData.length - 1] : null

  return (
    <div className="w-full max-w-full min-w-0 bg-white border border-border rounded-[10px] p-5 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-border/60 pb-3.5">
        <div>
          <h3 className="text-md font-semibold text-text">Recovery Timeline</h3>
        </div>

        {/* Proper Spaced Legend - Desktop & Mobile safe */}
        <div className="flex flex-wrap items-center text-xs">
          <span className="inline-flex items-center font-medium text-text-secondary whitespace-nowrap mr-4 sm:mr-6 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success flex-shrink-0 mr-1.5" /> Low Risk
          </span>
          <span className="inline-flex items-center font-medium text-text-secondary whitespace-nowrap mr-4 sm:mr-6 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-warning flex-shrink-0 mr-1.5" /> Medium Risk
          </span>
          <span className="inline-flex items-center font-medium text-text-secondary whitespace-nowrap mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-danger flex-shrink-0 mr-1.5" /> High Risk
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-text-muted">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading recovery timeline...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="py-8 px-4 bg-danger-tint/50 border border-danger/20 rounded-lg flex flex-col sm:flex-row items-center gap-3 text-xs text-danger">
          <AlertCircle size={18} className="flex-shrink-0 text-danger" />
          <span className="flex-1">Unable to load recovery timeline. Please check your connection and try again.</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-shrink-0 px-3 py-1.5 bg-danger text-white text-xs font-semibold rounded hover:bg-danger/90 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && timelineData.length === 0 && (
        <div className="py-10 text-center text-xs text-text-muted bg-surface-muted/50 rounded-lg border border-dashed border-border p-4">
          <Activity size={24} className="mx-auto text-text-muted mb-2 opacity-60" />
          <p className="font-medium text-text">No recovery check-ins are available for this patient yet.</p>
          <p className="text-2xs text-text-muted mt-0.5">Check-in data will automatically populate as daily logs are submitted.</p>
        </div>
      )}

      {/* Timeline Graphic Area */}
      {!loading && !error && timelineData.length > 0 && (
        <div className="space-y-4">
          {/* Scrollable Timeline Stepper container safely scoped */}
          <div className="w-full max-w-full min-w-0 overflow-x-auto py-3">
            <div
              className="px-3 relative"
              style={{ minWidth: `${Math.max(540, timelineData.length * 52)}px` }}
            >
              {/* Timeline Horizontal Line */}
              <div className="h-0.5 bg-border w-[calc(100%-2rem)] absolute top-4 left-4 z-0" />

              {/* Check-in Nodes */}
              <div className="flex justify-between items-center relative z-10">
                {timelineData.map((item, idx) => {
                  const isHovered = hovered?.id === item.id

                  return (
                    <div
                      key={item.id || idx}
                      className="flex flex-col items-center group cursor-pointer relative"
                      onMouseEnter={() => setHovered(item)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setHovered(item)
                      }}
                    >
                      {/* Circle Marker */}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all transform group-hover:scale-110 shadow-xs',
                          item.isToday ? 'ring-2 ring-primary ring-offset-2' : '',
                          isHovered ? 'ring-2 ring-primary-hover shadow-md scale-110' : '',
                          riskBadgeStyle(item.risk)
                        )}
                      >
                        {item.day}
                      </div>

                      {/* Date Label */}
                      <span className="text-[11px] font-medium text-text-muted mt-2 whitespace-nowrap">
                        {item.date}
                      </span>

                      {/* Today Badge */}
                      {item.isToday && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-primary-tint text-primary font-bold rounded-full mt-0.5 whitespace-nowrap">
                          Today
                        </span>
                      )}

                      {/* Follow-up Marker */}
                      {item.followUp && (
                        <Calendar size={11} className="text-primary mt-0.5" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Fixed Height Container for details/tooltips to prevent layout shifts */}
          <div className="min-h-[80px] w-full mt-2 flex flex-col justify-center">
            {hovered ? (
              <div className="p-3 bg-surface-muted rounded-lg flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-3 text-xs border border-border animate-fadeIn shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-text">
                      Day {hovered.day}
                    </span>
                    <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        hovered.risk === 'low'
                          ? 'bg-success-tint text-success border border-success/20'
                          : hovered.risk === 'medium'
                          ? 'bg-warning-tint text-warning border border-warning/20'
                          : 'bg-danger-tint text-danger border border-danger/20'
                      )}>
                      Risk: {hovered.risk}
                    </span>
                  </div>
                  <span className="text-2xs text-text-muted">Date: {hovered.date}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-text-secondary text-[11px]">
                  {hovered.score !== null && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted">Recovery Score</span>
                      <strong className="text-text tabular-nums">{hovered.score}</strong>
                    </div>
                  )}
                  {hovered.pain !== null && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted">Pain</span>
                      <strong className="text-text tabular-nums">{hovered.pain}/10</strong>
                    </div>
                  )}
                  {hovered.temp !== null && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted">Temp</span>
                      <strong className="text-text tabular-nums">{hovered.temp}°C</strong>
                    </div>
                  )}
                  {hovered.wound && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted">Wound</span>
                      <strong className="text-text capitalize">{hovered.wound}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : latestStatus ? (
              <div className="p-3 border border-border/40 bg-surface-muted/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted animate-fadeIn">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-text-secondary">Latest Status</span>
                    <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        latestStatus.risk === 'low'
                          ? 'bg-success-tint text-success'
                          : latestStatus.risk === 'medium'
                          ? 'bg-warning-tint text-warning'
                          : 'bg-danger-tint text-danger'
                      )}>
                      Risk: {latestStatus.risk}
                    </span>
                  </div>
                  <span className="text-2xs text-text-muted">Date: {latestStatus.date}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-text-secondary">
                  {latestStatus.score !== null && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted">Score</span>
                      <strong className="text-text tabular-nums">{latestStatus.score}</strong>
                    </div>
                  )}
                  {latestStatus.pain !== null && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted">Pain</span>
                      <strong className="text-text tabular-nums">{latestStatus.pain}/10</strong>
                    </div>
                  )}
                  {latestStatus.temp !== null && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted">Temp</span>
                      <strong className="text-text tabular-nums">{latestStatus.temp}°C</strong>
                    </div>
                  )}
                  {latestStatus.wound && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted">Wound</span>
                      <strong className="text-text capitalize">{latestStatus.wound}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
