import React, { useState } from 'react'
import { Calendar, CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const cn = (...a) => twMerge(clsx(...a))

export default function RecoveryTimeline({
  data = [
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
}) {
  const [hovered, setHovered] = useState(null)

  const riskColor = (risk) => {
    if (risk === 'low') return 'bg-success text-white border-success'
    if (risk === 'medium') return 'bg-warning text-white border-warning'
    if (risk === 'high') return 'bg-danger text-white border-danger'
    return 'bg-surface-muted text-text-muted border-border'
  }

  return (
    <div className="bg-white border border-border rounded-[10px] p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-md font-semibold text-text">Recovery Timeline</h3>
          <p className="text-xs text-text-muted">Post-discharge recovery check-in progression</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success"></span> Low</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning"></span> Med</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger"></span> High</span>
        </div>
      </div>

      {/* Horizontal timeline */}
      <div className="relative pt-6 pb-4 overflow-x-auto">
        <div className="min-w-[500px]">
          <div className="h-0.5 bg-border w-full absolute top-10 left-0 right-0 z-0"></div>
          <div className="flex justify-between items-center relative z-10">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center group relative cursor-pointer"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Marker */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-transform transform group-hover:scale-110 shadow-xs',
                    item.isToday ? 'ring-2 ring-primary ring-offset-2' : '',
                    riskColor(item.risk)
                  )}
                >
                  {item.day}
                </div>

                {/* Date & Today indicator */}
                <span className="text-2xs font-medium text-text-muted mt-2">{item.date}</span>
                {item.isToday && (
                  <span className="text-2xs px-1.5 py-0.5 bg-primary-tint text-primary font-bold rounded-full mt-0.5">Today</span>
                )}
                {item.followUp && (
                  <Calendar size={12} className="text-primary mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active hover info drawer/strip */}
      {hovered && (
        <div className="mt-4 p-3 bg-surface-muted rounded-[8px] flex items-center justify-between text-xs animate-fadeIn border border-border">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text">Day {hovered.day} ({hovered.date})</span>
            <span className={cn('px-2 py-0.5 rounded-full font-medium', 
              hovered.risk === 'low' ? 'bg-success-tint text-success' :
              hovered.risk === 'medium' ? 'bg-warning-tint text-warning' : 'bg-danger-tint text-danger')}>
              {hovered.risk.toUpperCase()} RISK
            </span>
          </div>
          <div className="flex items-center gap-4 text-text-secondary">
            <span>Score: <strong className="text-text tabular-nums">{hovered.score}/100</strong></span>
            <span>Pain: <strong className="text-text tabular-nums">{hovered.pain}/10</strong></span>
            <span>Temp: <strong className="text-text tabular-nums">{hovered.temp}°C</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}
