import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard, DisclaimerNote } from '../../components/ui/index.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import { Brain, ShieldAlert, CheckCircle, AlertTriangle, Search, Filter } from 'lucide-react'

export default function RiskPredictions() {
  const [filter, setFilter] = useState('all')

  const predictions = [
    { id: 'RP-901', patient: 'Vikram Mehta', uhid: 'P-101', procedure: 'Cardiac Bypass', risk: 'high', confidence: '94%', factors: 'Pain 8/10, Temp 38.6°C', date: 'Today 08:20 AM' },
    { id: 'RP-902', patient: 'Anil Sengupta', uhid: 'P-104', procedure: 'Spinal Fusion', risk: 'high', confidence: '91%', factors: 'Pain 7/10, Moderate Swelling', date: 'Today 07:45 AM' },
    { id: 'RP-903', patient: 'Deepa Krishnan', uhid: 'P-105', procedure: 'Hip Replacement', risk: 'medium', confidence: '87%', factors: 'Pain 5/10, Missed 1 Med Dose', date: 'Today 08:00 AM' },
    { id: 'RP-904', patient: 'Rahul Kumar', uhid: 'P-102', procedure: 'Knee Replacement', risk: 'low', confidence: '95%', factors: 'Pain 1/10, Normal Incision', date: 'Today 08:30 AM' },
    { id: 'RP-905', patient: 'Priya Sharma', uhid: 'P-103', procedure: 'Cholecystectomy', risk: 'low', confidence: '97%', factors: 'Pain 0/10, Normal Temp', date: 'Today 09:00 AM' },
  ]

  const filtered = predictions.filter(p => filter === 'all' || p.risk === filter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="ML Recovery Risk Classifications & Predictions"
        description="Random Forest algorithm predictions across active surgical recovery check-ins"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Predictions Logged"
          value="1,420"
          trend="92.4% avg confidence"
          trendUp={true}
          icon={Brain}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="High Risk Flagged"
          value="7 active"
          trend="Immediate review"
          trendUp={false}
          icon={ShieldAlert}
          iconBg="bg-danger-tint"
          iconColor="text-danger"
        />
        <StatCard
          label="Model Classification Accuracy"
          value="94.2%"
          trend="Academic synthetic model"
          trendUp={true}
          icon={CheckCircle}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold text-text">Latest AI Prediction Logs</h3>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-xs p-1.5 border border-border rounded bg-white text-text"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Prediction ID</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Procedure</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">Model Confidence</th>
                  <th className="p-3">Top Contributing Features</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted/60 transition-colors">
                    <td className="p-3 font-mono text-2xs text-text-muted">{p.id}</td>
                    <td className="p-3">
                      <strong className="block text-text">{p.patient}</strong>
                      <span className="text-2xs text-text-muted">{p.uhid}</span>
                    </td>
                    <td className="p-3 text-text-secondary">{p.procedure}</td>
                    <td className="p-3"><RiskBadge level={p.risk} /></td>
                    <td className="p-3 font-semibold text-text tabular-nums">{p.confidence}</td>
                    <td className="p-3 text-text-muted">{p.factors}</td>
                    <td className="p-3 text-right">
                      <Link
                        to={`/doctor/patients/${p.uhid}`}
                        className="px-2.5 py-1 text-xs font-medium text-primary bg-primary-tint rounded hover:bg-primary hover:text-white transition-colors"
                      >
                        Inspect
                      </Link>
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
