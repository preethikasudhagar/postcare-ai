import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

export default function RiskDonut({
  data = [
    { name: 'Low Risk', value: 94, color: '#22A05A' },
    { name: 'Medium Risk', value: 27, color: '#F2A311' },
    { name: 'High Risk', value: 7, color: '#DC3B3B' },
  ],
  total = 128,
  height = 200
}) {
  const calculatedTotal = total || data.reduce((acc, curr) => acc + (curr.value || 0), 0) || 1

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full overflow-hidden">
      {/* Chart container */}
      <div className="relative w-full sm:w-1/2 flex items-center justify-center" style={{ height, minHeight: height, minWidth: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload
                  const pct = Math.round(((d.value || 0) / calculatedTotal) * 100)
                  return (
                    <div className="bg-white border border-border shadow-md rounded-lg p-2 text-xs z-50">
                      <p className="font-bold text-text">{d.name}</p>
                      <p className="text-text-secondary mt-0.5">
                        Patients: <strong className="text-text tabular-nums">{d.value}</strong> ({pct}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-text tabular-nums leading-none">{calculatedTotal}</span>
          <span className="text-[10px] text-text-muted mt-0.5">Active Cases</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full sm:w-1/2 pr-2">
        {data.map((item) => {
          const pct = Math.round(((item.value || 0) / calculatedTotal) * 100)
          return (
            <div key={item.name} className="flex items-center justify-between text-xs p-1.5 rounded bg-surface-muted/60 border border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-text font-medium truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-right pl-2">
                <span className="font-bold text-text tabular-nums">{item.value}</span>
                <span className="text-[10px] text-text-muted tabular-nums">({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
