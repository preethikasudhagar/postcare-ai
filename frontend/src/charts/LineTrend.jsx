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

export default function LineTrend({
  data = [],
  dataKey = 'score',
  name = 'Recovery score',
  color = '#1D5FD1',
  unit = '',
  height = 240,
  bands = true
}) {
  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF4" />
          <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
          
          {bands && (
            <>
              <ReferenceArea y1={80} y2={100} fill="#15803D" fillOpacity={0.05} />
              <ReferenceArea y1={50} y2={80} fill="#B45309" fillOpacity={0.05} />
              <ReferenceArea y1={0} y2={50} fill="#C62828" fillOpacity={0.05} />
            </>
          )}

          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white border border-border shadow-lg rounded-[10px] p-2.5 text-xs">
                    <p className="font-semibold text-text mb-1">{label}</p>
                    <p className="text-primary font-medium">
                      {name}: <span className="tabular-nums font-bold">{payload[0].value} {unit}</span>
                    </p>
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
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
