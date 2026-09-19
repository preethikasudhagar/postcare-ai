import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageHeader, Card, CardHeader, CardBody, StatCard, DisclaimerNote } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import { Users, AlertTriangle, Calendar, Activity, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react'

export default function DoctorDashboard() {
  const { user } = useAuth()

  const highRiskPatients = [
    { id: 'P-101', name: 'Vikram Mehta', surgery: 'Cardiac Bypass (CABG)', risk: 'high', score: 38, checkin: 'Today 08:20 AM', temp: '38.6°C', pain: '8/10' },
    { id: 'P-104', name: 'Anil Sengupta', surgery: 'Spinal Lumbar Fusion', risk: 'high', score: 42, checkin: 'Today 07:45 AM', temp: '38.4°C', pain: '7/10' },
    { id: 'P-108', name: 'Sunita Rao', surgery: 'Appendectomy', risk: 'high', score: 45, checkin: 'Yesterday 09:10 PM', temp: '38.2°C', pain: '8/10' },
  ]

  const todayFollowUps = [
    { time: '10:00 AM', name: 'Ramesh Patel', type: 'Post-Op Day 14 Staple Removal', status: 'completed' },
    { time: '11:30 AM', name: 'Deepa Krishnan', type: 'Wound Dressing & Range Assessment', status: 'upcoming' },
    { time: '02:00 PM', name: 'Sanjay Deshmukh', type: 'Virtual Pain Management Review', status: 'upcoming' },
    { time: '04:15 PM', name: 'Kavita Menon', type: 'Physical Therapy Load Clearance', status: 'upcoming' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, Dr. ${user?.last_name || 'Rajesh Varma'}`}
        description="Clinical Post-Operative Monitoring Command Center & AI Risk Overview"
        action={
          <Link
            to="/doctor/discharge-plans/new"
            className="inline-flex items-center gap-1.5 h-10 px-4 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-hover shadow-xs transition-colors"
          >
            + Create Discharge Plan
          </Link>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Monitored Patients"
          value="128"
          trend="+12 this week"
          trendUp={true}
          icon={Users}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="High-Risk Alerts"
          value="7 cases"
          trend="Immediate review"
          trendUp={false}
          icon={AlertTriangle}
          iconBg="bg-danger-tint"
          iconColor="text-danger"
        />
        <StatCard
          label="Today's Follow-Ups"
          value="12"
          trend="4 completed"
          trendUp={true}
          icon={Calendar}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
        <StatCard
          label="Avg Recovery Score"
          value="82 / 100"
          trend="Steady cohort trend"
          trendUp={true}
          icon={Activity}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
      </div>

      {/* Alert Strip: Unresolved High-Risk Cases */}
      <div className="p-4 bg-danger-tint border-l-4 border-l-danger border border-danger/20 rounded-[8px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <ShieldAlert className="text-danger flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-bold text-danger">3 HIGH-RISK POST-OPERATIVE PATIENTS REQUIRE IMMEDIATE REVIEW</h4>
            <p className="text-2xs text-text-secondary mt-0.5">
              Automated Random Forest classification detected fever elevation (&gt;38.4°C) and severe breakthrough pain ratings.
            </p>
          </div>
        </div>
        <Link
          to="/doctor/alerts"
          className="h-8 px-3.5 bg-danger text-white text-xs font-semibold rounded-sm hover:bg-danger-hover transition-colors whitespace-nowrap shadow-xs"
        >
          Review Alert Queue
        </Link>
      </div>

      {/* Main Section: High-Risk Patients Table (8 cols) + Recovery Donut (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader
              title="High-Risk Patient Watchlist"
              description="Prioritized list of patients triggering acute AI risk indicators"
              action={
                <Link to="/doctor/patients" className="text-xs font-semibold text-primary hover:underline">
                  View All Patients →
                </Link>
              }
            />
            <CardBody>
              <div className="border border-border rounded-md overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-text-secondary border-b border-border font-medium">
                    <tr>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Surgical Procedure</th>
                      <th className="p-3">AI Risk</th>
                      <th className="p-3">Recovery Score</th>
                      <th className="p-3">Vitals / Pain</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {highRiskPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-danger-tint/20 transition-colors">
                        <td className="p-3">
                          <strong className="block text-text">{p.name}</strong>
                          <span className="text-2xs text-text-muted">{p.id}</span>
                        </td>
                        <td className="p-3 text-text-secondary">{p.surgery}</td>
                        <td className="p-3"><RiskBadge level={p.risk} /></td>
                        <td className="p-3 font-bold text-danger tabular-nums">{p.score} / 100</td>
                        <td className="p-3 text-text-secondary">
                          <span>{p.temp}</span> · <span>Pain {p.pain}</span>
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            to={`/doctor/patients/${p.id}`}
                            className="inline-block px-2.5 py-1 text-xs font-semibold text-primary bg-primary-tint rounded hover:bg-primary hover:text-white transition-colors"
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
        </div>

        {/* Risk Distribution Donut (4 cols) */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader
              title="Cohort Risk Stratification"
              description="Real-time ML classification distribution"
            />
            <CardBody>
              <RiskDonut />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Charts Grid: Cohort Recovery Trend & Today's Follow-Ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader
              title="Cohort 14-Day Average Recovery Curve"
              description="Mean recovery score across active surgical discharges"
            />
            <CardBody>
              <LineTrend />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader
              title="Today's Consultation Schedule"
              description="12 appointments scheduled today"
            />
            <CardBody>
              <div className="space-y-3">
                {todayFollowUps.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-surface-muted rounded text-xs border border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{item.time}</span>
                        <strong className="text-text">{item.name}</strong>
                      </div>
                      <p className="text-2xs text-text-muted mt-0.5">{item.type}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <DisclaimerNote />
    </div>
  )
}
