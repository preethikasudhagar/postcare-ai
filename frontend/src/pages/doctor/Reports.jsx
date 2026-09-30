import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import {
  FileText, Download, Printer, Activity, ShieldAlert,
  Pill, Calendar, ArrowRight, ChevronRight, BarChart2
} from 'lucide-react'
import api from '../../services/api'

export default function DoctorReports() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true)
        const res = await api.get('/reports/recovery/')
        setOverview(res.data)
      } catch (err) {
        // Fallback default
      } finally {
        setLoading(false)
      }
    }
    fetchOverview()
  }, [])

  const reportCards = [
    {
      id: 'recovery-index',
      to: '/doctor/reports/recovery-index',
      title: '1. Patient Recovery Index',
      desc: 'Chronological recovery progression, vital sign stability trajectories, and patient check-in telemetry.',
      icon: Activity,
      color: 'text-primary bg-primary-tint',
      borderColor: 'hover:border-primary',
      stat: `${overview?.avg_recovery_score || 82.4} / 100`,
      statLabel: 'Cohort Avg Score'
    },
    {
      id: 'risk-stratification',
      to: '/doctor/reports/risk-stratification',
      title: '2. Risk Stratification Report',
      desc: 'Random Forest risk classification distribution, clinical risk tiers, and predictive feature weights.',
      icon: ShieldAlert,
      color: 'text-danger bg-danger-tint',
      borderColor: 'hover:border-danger',
      stat: `${overview?.risk_distribution?.high || 7} Acute`,
      statLabel: 'High-Risk Alerts'
    },
    {
      id: 'medication-compliance',
      to: '/doctor/reports/medication-compliance',
      title: '3. Medication Compliance',
      desc: 'Prescription adherence tracking, scheduled dosage fulfillments, and missed dose audit log.',
      icon: Pill,
      color: 'text-secondary bg-secondary-tint',
      borderColor: 'hover:border-secondary',
      stat: '94.6%',
      statLabel: 'Adherence Rate'
    },
    {
      id: 'follow-up-completion',
      to: '/doctor/reports/follow-up-completion',
      title: '4. Follow-Up Completion',
      desc: 'Appointment fulfillment rates, scheduled reviews, completed consultations, and rescheduling trends.',
      icon: Calendar,
      color: 'text-warning bg-warning-tint',
      borderColor: 'hover:border-warning',
      stat: overview?.followup_completion_rate || '95.8%',
      statLabel: 'Fulfillment Rate'
    },
  ]

  const handlePrint = () => window.print()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Analytics & Post-Operative Reports"
        description="Aggregate surgical cohort outcomes, risk distributions, and specialized clinical analytics modules"
        action={
          <div className="flex items-center gap-2 no-print">
            <button onClick={handlePrint} className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded text-text bg-white hover:bg-surface-muted flex items-center gap-1.5 shadow-xs">
              <Printer size={14} /> Print Overview
            </button>
            <button onClick={handlePrint} className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover flex items-center gap-1.5 shadow-xs">
              <Download size={14} /> Export PDF
            </button>
          </div>
        }
      />

      {/* 4 Report Navigation Cards */}
      <div>
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
          Select Clinical Report Module
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards.map((rc) => (
            <Link
              key={rc.id}
              to={rc.to}
              className={`p-4 bg-white border border-border rounded-xl shadow-xs ${rc.borderColor} hover:shadow-md transition-all flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${rc.color}`}>
                    <rc.icon size={18} />
                  </div>
                  <ChevronRight size={16} className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <h4 className="text-sm font-bold text-text mb-1 group-hover:text-primary transition-colors">
                  {rc.title}
                </h4>
                <p className="text-2xs text-text-secondary line-clamp-2 mb-4 leading-relaxed">
                  {rc.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-text-muted font-medium">{rc.statLabel}:</span>
                <span className="font-bold text-text tabular-nums">{rc.stat}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Overview Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader
              title="Cohort 14-Day Recovery Trajectory"
              description="Mean recovery score across active surgical discharges"
              action={
                <Link to="/doctor/reports/recovery-index" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  Full Recovery Report <ArrowRight size={13} />
                </Link>
              }
            />
            <CardBody>
              <LineTrend />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader
              title="Risk Classification Spread"
              description="Synthetic model classification across cohort"
              action={
                <Link to="/doctor/reports/risk-stratification" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  Full Risk Report <ArrowRight size={13} />
                </Link>
              }
            />
            <CardBody>
              <RiskDonut />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
