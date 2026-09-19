import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardBody, DisclaimerNote } from '../../components/ui/index.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import { AlertTriangle, ShieldAlert, CheckCircle2, Clock, ArrowRight } from 'lucide-react'

export default function DoctorAlerts() {
  const [alerts, setAlerts] = useState([
    {
      id: 'ALT-101',
      patient: 'Vikram Mehta',
      uhid: 'P-101',
      procedure: 'Cardiac Bypass (CABG)',
      risk: 'high',
      time: 'Today 08:20 AM',
      reason: 'Biometric Spike: Fever 38.6°C combined with severe chest incision pain (8/10).',
      resolved: false
    },
    {
      id: 'ALT-102',
      patient: 'Anil Sengupta',
      uhid: 'P-104',
      procedure: 'Spinal Lumbar Fusion',
      risk: 'high',
      time: 'Today 07:45 AM',
      reason: 'Incision Swelling & Severe Pain: Patient reported breakthrough pain (7/10) with local fluid retention.',
      resolved: false
    },
    {
      id: 'ALT-103',
      patient: 'Sunita Rao',
      uhid: 'P-108',
      procedure: 'Appendectomy',
      risk: 'high',
      time: 'Yesterday 09:10 PM',
      reason: 'Reported persistent nausea, dizziness, and body temperature of 38.2°C.',
      resolved: false
    }
  ])

  const resolveAlert = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, resolved: true } : a))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="High-Risk Clinical Alerts Queue"
        description="Immediate clinical escalation inbox triggered by acute post-operative AI risk classifications"
      />

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-5 bg-white border rounded-[10px] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
              alert.resolved ? 'opacity-60 border-border bg-surface-muted/40' : 'border-l-4 border-l-danger border-danger/30'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-danger-tint flex items-center justify-center text-danger flex-shrink-0 mt-0.5">
                <ShieldAlert size={22} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-text">{alert.patient}</h3>
                  <span className="text-2xs font-mono text-text-muted">({alert.uhid})</span>
                  <RiskBadge level={alert.risk} />
                  <span className="text-2xs text-text-muted flex items-center gap-1">
                    <Clock size={11} /> {alert.time}
                  </span>
                </div>
                <p className="text-xs font-medium text-text mt-0.5">{alert.procedure}</p>
                <p className="text-xs text-danger font-medium mt-1">{alert.reason}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              <Link
                to={`/doctor/patients/${alert.uhid}`}
                className="h-8 px-3.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1 shadow-xs"
              >
                Review Record <ArrowRight size={13} />
              </Link>
              {!alert.resolved ? (
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="h-8 px-3 border border-border-strong text-xs font-medium text-text hover:bg-surface-muted rounded transition-colors"
                >
                  Mark Reviewed
                </button>
              ) : (
                <span className="text-xs text-success font-semibold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Reviewed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <DisclaimerNote />
    </div>
  )
}
