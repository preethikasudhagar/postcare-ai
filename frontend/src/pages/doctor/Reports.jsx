import React, { useState } from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import { FileText, Download, Printer, Filter, Calendar, BarChart2 } from 'lucide-react'

export default function DoctorReports() {
  const [reportType, setReportType] = useState('recovery')

  const handlePrint = () => window.print()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Analytics & Post-Operative Reports"
        description="Aggregate surgical cohort outcomes, risk distributions, and medication compliance metrics"
        action={
          <div className="flex items-center gap-2 no-print">
            <button onClick={handlePrint} className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded text-text bg-white hover:bg-surface-muted flex items-center gap-1.5 shadow-xs">
              <Printer size={14} /> Print Report
            </button>
            <button onClick={handlePrint} className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover flex items-center gap-1.5 shadow-xs">
              <Download size={14} /> Export CSV / PDF
            </button>
          </div>
        }
      />

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3 no-print">
        {[
          { id: 'recovery', label: '1. Patient Recovery Index' },
          { id: 'risk', label: '2. Risk Stratification Report' },
          { id: 'meds', label: '3. Medication Compliance' },
          { id: 'followup', label: '4. Follow-Up Completion' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors ${
              reportType === t.id ? 'bg-primary text-white' : 'bg-surface-muted text-text-secondary hover:bg-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Monitored Cohort"
          value="128 patients"
          trend="Last 30 days"
          trendUp={true}
          icon={BarChart2}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Cohort Avg Recovery Score"
          value="82.4 / 100"
          trend="+4.2% vs previous cohort"
          trendUp={true}
          icon={FileText}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="Overall Follow-Up Compliance"
          value="95.8%"
          trend="Target >90%"
          trendUp={true}
          icon={Calendar}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
      </div>

      {/* Visualization Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="30-Day Cohort Recovery Trajectory" description="Mean recovery progression by postoperative day" />
          <CardBody><LineTrend /></CardBody>
        </Card>

        <Card>
          <CardHeader title="Post-Op Risk Classification Spread" description="Synthetic model classification across cohort" />
          <CardBody><RiskDonut /></CardBody>
        </Card>
      </div>
    </div>
  )
}
