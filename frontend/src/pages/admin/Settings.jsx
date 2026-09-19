import React, { useState } from 'react'
import { PageHeader, Card, CardHeader, CardBody } from '../../components/ui/index.jsx'
import { Save, Shield, Sliders, Bell } from 'lucide-react'

export default function AdminSettings() {
  const [highRiskThreshold, setHighRiskThreshold] = useState(50)
  const [medAdherenceTarget, setMedAdherenceTarget] = useState(90)
  const [emailAlerts, setEmailAlerts] = useState(true)

  return (
    <div className="max-w-form mx-auto space-y-6">
      <PageHeader
        title="System Configuration & Clinical Thresholds"
        description="Global hospital governance rules, ML alert triggers, and compliance targets"
      />

      <Card>
        <CardHeader title="AI Risk Engine & Alert Thresholds" />
        <CardBody className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-text mb-1">High Risk Escalation Score Cut-Off (0–100)</label>
            <input
              type="number"
              value={highRiskThreshold}
              onChange={e => setHighRiskThreshold(Number(e.target.value))}
              className="w-full sm:w-48 p-2 text-xs border rounded focus:ring-2 focus:ring-primary"
            />
            <p className="text-2xs text-text-muted mt-1">Scores below this threshold immediately flag surgical team alerts.</p>
          </div>

          <div>
            <label className="block font-medium text-text mb-1">Target Medication Adherence Goal (%)</label>
            <input
              type="number"
              value={medAdherenceTarget}
              onChange={e => setMedAdherenceTarget(Number(e.target.value))}
              className="w-full sm:w-48 p-2 text-xs border rounded focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div>
              <strong className="text-text block">Automated Clinical Notifications</strong>
              <span className="text-2xs text-text-muted">Dispatch urgent SMS/Email on critical biomarker spikes</span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={e => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
          </div>

          <div className="pt-4">
            <button className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5">
              <Save size={14} /> Save Configuration
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
