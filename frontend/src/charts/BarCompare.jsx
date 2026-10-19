import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import { Activity, AlertCircle, Loader2 } from 'lucide-react'

export default function BarCompare({
  data = [],
  dataKey = 'value',
  color = '#1D5FD1',
  unit = '%',
  height = 200,
  loading = false,
  error = null,
  onRetry = null,
  emptyMessage = 'No medication adherence records logged yet. Complete a check-in to track adherence.'
}) {
  if (loading) {
    return (
      <div className="w-full min-h-[180px] flex flex-col items-center justify-center text-text-muted text-xs gap-2.5">
        <Loader2 size={22} className="animate-spin text-primary" />
        <span>Loading medication adherence data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full min-h-[180px] flex flex-col items-center justify-center p-4 text-center">
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
      <div className="w-full min-h-[180px] flex flex-col items-center justify-center p-6 text-center">
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
    <div className="w-full min-h-[180px]">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF4" />
          <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white border border-border shadow-lg rounded-[8px] p-2 text-xs">
                    <p className="font-semibold text-text">{label}</p>
                    <p className="text-primary font-bold tabular-nums">
                      {payload[0].value} {unit}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

