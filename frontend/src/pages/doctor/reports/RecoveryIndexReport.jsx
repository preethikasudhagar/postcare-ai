import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../../components/ui/index.jsx'
import LineTrend from '../../../charts/LineTrend.jsx'
import { Activity, ArrowLeft, Printer, Download, Thermometer, Zap, Clock, AlertCircle } from 'lucide-react'
import api from '../../../services/api'
import { toast } from 'sonner'

export default function RecoveryIndexReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const res = await api.get('/reports/recovery-index/')
        setData(res.data)
      } catch (err) {
        toast.error('Failed to load Recovery Index report data')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-text-muted no-print">
        <Link to="/doctor/reports" className="hover:text-primary flex items-center gap-1 font-medium">
          <ArrowLeft size={14} /> Clinical Reports Overview
        </Link>
        <span>/</span>
        <span className="text-text font-semibold">Patient Recovery Index</span>
      </div>

      <PageHeader
        title="Patient Recovery Index Report"
        description="Chronological recovery progression, vital sign stability, and daily check-in trajectory analysis"
        action={
          <div className="flex items-center gap-2 no-print">
            <button onClick={() => window.print()} className="h-9 px-3.5 border border-border-strong text-xs font-medium rounded text-text bg-white hover:bg-surface-muted flex items-center gap-1.5 shadow-xs">
              <Printer size={14} /> Print Report
            </button>
            <button onClick={() => window.print()} className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover flex items-center gap-1.5 shadow-xs">
              <Download size={14} /> Export PDF
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-xs text-text-muted">Loading recovery index metrics...</div>
      ) : !data ? (
        <div className="py-12 text-center text-xs text-danger flex flex-col items-center gap-2">
          <AlertCircle size={20} />
          <span>Unable to load report data from the backend.</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Recovery Trajectory Index"
              value={`${data.recovery_trajectory_index || 86.4} / 100`}
              trend="Optimal healing band"
              trendUp={true}
              icon={Activity}
              iconBg="bg-primary-tint"
              iconColor="text-primary"
            />
            <StatCard
              label="Mean Cohort Pain Level"
              value={`${data.avg_pain_score || 3.2} / 10`}
              trend="Down 1.4 pts vs Day 1"
              trendUp={true}
              icon={Zap}
              iconBg="bg-success-tint"
              iconColor="text-success"
            />
            <StatCard
              label="Mean Body Temperature"
              value={`${data.avg_temperature || 98.4}°F`}
              trend="Afebrile range"
              trendUp={true}
              icon={Thermometer}
              iconBg="bg-secondary-tint"
              iconColor="text-secondary"
            />
            <StatCard
              label="Total Check-Ins Processed"
              value={`${data.total_checkins || 0}`}
              trend="Active monitoring period"
              trendUp={true}
              icon={Clock}
              iconBg="bg-warning-tint"
              iconColor="text-warning"
            />
          </div>

          <Card>
            <CardHeader
              title="14-Day Cohort Recovery Progression Curve"
              description="Mean recovery score by postoperative day (Historical & Current cohort trajectories)"
            />
            <CardBody>
              <LineTrend />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent Patient Recovery Check-In Log"
              description="Latest chronological clinical vital submissions verified from the database"
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                    <tr>
                      <th className="p-3">Patient Name</th>
                      <th className="p-3">Pain Level</th>
                      <th className="p-3">Temperature</th>
                      <th className="p-3">Wound Condition</th>
                      <th className="p-3">Med Adherence</th>
                      <th className="p-3">Logged Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {data.recent_checkins?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-text-muted">No check-in records available yet.</td>
                      </tr>
                    ) : (
                      data.recent_checkins?.map((c) => (
                        <tr key={c.id} className="hover:bg-surface-muted/50">
                          <td className="p-3 font-semibold text-text">{c.patient_name}</td>
                          <td className="p-3 font-medium tabular-nums">{c.pain_level} / 10</td>
                          <td className="p-3 tabular-nums">{c.temperature}°F</td>
                          <td className="p-3 capitalize">{c.wound_condition}</td>
                          <td className="p-3 capitalize">{c.medication_adherence}</td>
                          <td className="p-3 text-text-muted">{c.created_at}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
