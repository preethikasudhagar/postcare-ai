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

export default function BarCompare({
  data = [
    { name: 'Mon', value: 92 },
    { name: 'Tue', value: 88 },
    { name: 'Wed', value: 95 },
    { name: 'Thu', value: 91 },
    { name: 'Fri', value: 85 },
    { name: 'Sat', value: 96 },
    { name: 'Sun', value: 98 },
  ],
  dataKey = 'value',
  color = '#1D5FD1',
  unit = '%',
  height = 200
}) {
  return (
    <div className="w-full h-full min-h-[180px]">
      <ResponsiveContainer width="100%" height={height}>
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
