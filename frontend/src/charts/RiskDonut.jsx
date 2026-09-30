import React, { useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

export default function RiskDonut({
  data = [
    { name: 'Low Risk', value: 94, color: '#22A05A' },
    { name: 'Medium Risk', value: 27, color: '#F2A311' },
    { name: 'High Risk', value: 7, color: '#DC3B3B' },
  ],
  total,
  height = 220
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const calculatedTotal = total !== undefined 
    ? total 
    : data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)

  const activeTotal = calculatedTotal || 1

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 py-1">
      {/* LEFT COLUMN: Donut Chart */}
      <div className="relative w-full md:w-1/2 flex items-center justify-center flex-shrink-0" style={{ height: 210, minHeight: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={74}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="transition-all duration-150 cursor-pointer"
                  style={{
                    opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.6,
                    transform: hoveredIndex === index ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: 'center center'
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload
                  const pct = Math.round(((Number(d.value) || 0) / activeTotal) * 100)
                  return (
                    <div className="bg-slate-900 text-white shadow-xl rounded-lg px-3 py-2 text-xs z-50 pointer-events-none border border-slate-700 animate-fadeIn">
                      <div className="flex items-center gap-2 font-bold mb-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span>{d.name}</span>
                      </div>
                      <p className="text-slate-300 text-2xs">
                        <strong className="text-white tabular-nums">{d.value}</strong> patients ({pct}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center of Donut: Clean Structured Summary */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider leading-tight">Total</span>
          <span className="text-2xl font-extrabold text-text tabular-nums leading-tight my-0.5">{calculatedTotal}</span>
          <span className="text-[10px] font-medium text-text-secondary leading-tight">Patients</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Dedicated Risk Summary Area */}
      <div className="w-full md:w-1/2 flex flex-col gap-2.5">
        {data.map((item, idx) => {
          const val = Number(item.value) || 0
          const pct = Math.round((val / activeTotal) * 100)
          const isHovered = hoveredIndex === idx

          return (
            <div
              key={item.name}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                isHovered
                  ? 'bg-surface border-primary shadow-xs'
                  : 'bg-surface-muted/60 border-border/80 hover:bg-surface-muted'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text truncate whitespace-nowrap">
                    {item.name}
                  </p>
                  <p className="text-2xs text-text-muted mt-0.5">
                    <span className="tabular-nums font-semibold text-text-secondary">{val}</span> patients
                  </p>
                </div>
              </div>

              <div className="text-right pl-3 flex-shrink-0">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-bold tabular-nums"
                  style={{
                    backgroundColor: `${item.color}15`,
                    color: item.color
                  }}
                >
                  {pct}%
                </span>
              </div>
            </div>
          )
        })}

        <div className="pt-2 border-t border-border flex items-center justify-between text-2xs text-text-muted px-1">
          <span>Cohort Risk Distribution</span>
          <span className="font-semibold text-text">Total Active: {calculatedTotal}</span>
        </div>
      </div>
    </div>
  )
}
