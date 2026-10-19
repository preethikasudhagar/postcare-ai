import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea
} from 'recharts'
import { Activity, AlertCircle, Loader2 } from 'lucide-react'

export default function LineTrend({
  data = [],
  dataKey = 'score',
  xAxisKey = 'day',
  name = 'Recovery score',
  color = '#1D5FD1',
  unit = '',
  height = 240,
  domain,
  ticks = null,
  bands = true,
  loading = false,
  error = null,
  onRetry = null,
  emptyMessage = 'No recovery score history available yet. Complete a recovery check-in to begin tracking progress.'
}) {
  if (loading) {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center text-text-muted text-xs gap-2.5">
        <Loader2 size={22} className="animate-spin text-primary" />
        <span>Loading recovery score data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle size={22} className="text-danger mb-2" />
        <p className="text-xs text-danger mb-3 max-w-xs">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-8 px-3 text-xs bg-primary text-white rounded font-medium hover:bg-primary-hover transition-colors shadow-xs"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-primary-tint flex items-center justify-center mb-2.5 text-primary">
          <Activity size={20} />
        </div>
        <p className="text-xs text-text-secondary max-w-xs font-medium leading-relaxed">
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-[220px]">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <LineChart data={data} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF4" />
          <XAxis
            dataKey={xAxisKey}
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            dy={4}
            minTickGap={16}
            padding={{ left: 16, right: 16 }}
          />
          <YAxis
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={domain || [0, 100]}
            ticks={ticks || undefined}
            tickFormatter={unit ? (val) => `${val}${unit}` : undefined}
            dx={-2}
          />

          {bands && (
            <>
              {/* Green zone: Good recovery progress (80–100) */}
              <ReferenceArea y1={80} y2={100} fill="#15803D" fillOpacity={0.06} />
              {/* Amber zone: Moderate concern / monitoring (50–80) */}
              <ReferenceArea y1={50} y2={80} fill="#B45309" fillOpacity={0.05} />
              {/* Red zone: High risk / clinical attention needed (0–50) */}
              <ReferenceArea y1={0} y2={50} fill="#C62828" fillOpacity={0.05} />
            </>
          )}

          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0]
                const extra = item.payload || {}
                return (
                  <div className="bg-white border border-border shadow-lg rounded-lg p-2.5 text-xs z-50">
                    <p className="font-semibold text-text mb-1">
                      {extra.fullDate || label}
                    </p>
                    <p className="text-primary font-semibold flex items-center justify-between gap-3">
                      <span>{name}:</span>
                      <span className="tabular-nums font-bold">
                        {item.value}{unit ? ` ${unit}` : ''}
                      </span>
                    </p>
                    {extra.risk && (
                      <p className="text-2xs text-text-muted mt-1 capitalize flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            extra.risk === 'low'
                              ? 'bg-success'
                              : extra.risk === 'medium'
                              ? 'bg-warning'
                              : 'bg-danger'
                          }`}
                        />
                        <span>Risk Category: {extra.risk}</span>
                      </p>
                    )}
                  </div>
                )
              }
              return null
            }}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4.5, fill: color, stroke: '#FFFFFF', strokeWidth: 1.5 }}
            activeDot={{ r: 6.5, fill: color, stroke: '#FFFFFF', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {bands && (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2 pt-2 border-t border-border/50 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-success/30 border border-success/60" />
            <span className="text-text-secondary font-medium">Good (80–100)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-warning/30 border border-warning/60" />
            <span className="text-text-secondary font-medium">Moderate (50–79)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-danger/30 border border-danger/60" />
            <span className="text-text-secondary font-medium">Clinical Attention (0–49)</span>
          </span>
        </div>
      )}
    </div>
  )
}
