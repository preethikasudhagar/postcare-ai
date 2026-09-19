import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard, DisclaimerNote } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import { Users, AlertTriangle, CheckSquare, Clock, Send, ShieldAlert } from 'lucide-react'

export default function NurseDashboard() {
  const [patients, setPatients] = useState([
    { id: 'P-101', name: 'Vikram Mehta', procedure: 'Cardiac Bypass', checkin: 'Submitted', risk: 'high', score: 38, temp: '38.6°C', escalated: false },
    { id: 'P-104', name: 'Anil Sengupta', procedure: 'Spinal Fusion', checkin: 'Submitted', risk: 'high', score: 42, temp: '38.4°C', escalated: true },
    { id: 'P-107', name: 'Ramesh Patel', procedure: 'Knee Replacement', checkin: 'Pending', risk: 'medium', score: 72, temp: '37.1°C', escalated: false },
    { id: 'P-102', name: 'Rahul Kumar', procedure: 'Knee Replacement', checkin: 'Submitted', risk: 'low', score: 88, temp: '36.5°C', escalated: false },
    { id: 'P-103', name: 'Priya Sharma', procedure: 'Cholecystectomy', checkin: 'Submitted', risk: 'low', score: 92, temp: '36.4°C', escalated: false },
  ])

  const sendReminder = (id) => {
    alert(`Automated SMS & notification reminder dispatched to patient ${id}.`)
  }

  const escalateDoctor = (id) => {
    setPatients(patients.map(p => p.id === id ? { ...p, escalated: true } : p))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nursing Care & Recovery Monitoring Command"
        description="Daily check-in triage, high-risk observation, and clinical escalation coordination"
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Assigned Patients"
          value="24"
          trend="Wards 3 & 4"
          trendUp={true}
          icon={Users}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Pending Check-Ins"
          value="3"
          trend="Due before 12:00 PM"
          trendUp={false}
          icon={Clock}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
        />
        <StatCard
          label="High-Risk Flags"
          value="2 alerts"
          trend="Immediate review"
          trendUp={false}
          icon={AlertTriangle}
          iconBg="bg-danger-tint"
          iconColor="text-danger"
        />
        <StatCard
          label="Completed Today"
          value="21"
          trend="87.5% compliance"
          trendUp={true}
          icon={CheckSquare}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
      </div>

      <Card>
        <CardHeader
          title="Patient Recovery Triage & Daily Check-In Roster"
          description="Live status of assigned post-surgical patients for today"
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Procedure</th>
                  <th className="p-3">Today's Check-In</th>
                  <th className="p-3">AI Risk</th>
                  <th className="p-3">Score & Temp</th>
                  <th className="p-3 text-right">Nursing Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted/60 transition-colors">
                    <td className="p-3">
                      <strong className="block text-text">{p.name}</strong>
                      <span className="text-2xs text-text-muted">{p.id}</span>
                    </td>
                    <td className="p-3 text-text-secondary">{p.procedure}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${p.checkin === 'Submitted' ? 'bg-success-tint text-success' : 'bg-warning-tint text-warning'}`}>
                        {p.checkin}
                      </span>
                    </td>
                    <td className="p-3"><RiskBadge level={p.risk} /></td>
                    <td className="p-3 text-text-secondary">
                      <strong className="text-text tabular-nums">{p.score}/100</strong> · <span>{p.temp}</span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {p.checkin === 'Pending' && (
                        <button
                          onClick={() => sendReminder(p.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary-tint rounded hover:bg-primary hover:text-white transition-colors"
                        >
                          Send Reminder
                        </button>
                      )}
                      {p.risk === 'high' && (
                        <button
                          onClick={() => escalateDoctor(p.id)}
                          disabled={p.escalated}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                            p.escalated
                              ? 'bg-surface-muted text-text-muted cursor-not-allowed'
                              : 'bg-danger text-white hover:bg-danger-hover shadow-xs'
                          }`}
                        >
                          {p.escalated ? 'Escalated ✓' : 'Escalate to Doctor'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <DisclaimerNote />
    </div>
  )
}
