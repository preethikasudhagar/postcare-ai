import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

export default function RiskDonut({
  data = [
    { name: 'Low Risk', value: 94, color: '#22A05A' },
    { name: 'Medium Risk', value: 27, color: '#F2A311' },
    { name: 'High Risk', value: 7, color: '#DC3B3B' },
  ],
  total = 128,
  height = 220
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative flex-1" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
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
                  return (
                    <div className="bg-white border border-border shadow-lg rounded-[8px] p-2 text-xs">
                      <p className="font-semibold text-text">{d.name}</p>
                      <p className="text-text-secondary">
                        Patients: <strong className="text-text tabular-nums">{d.value}</strong> ({Math.round((d.value / total) * 100)}%)
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
          <span className="text-2xl font-bold text-text tabular-nums leading-none">{total}</span>
          <span className="text-2xs text-text-muted mt-0.5">Total active</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-[120px]">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-text-secondary">{item.name}</span>
            </div>
            <span className="font-semibold text-text tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
