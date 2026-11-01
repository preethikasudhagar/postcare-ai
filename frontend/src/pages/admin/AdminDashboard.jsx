import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import api from '../../services/api'
import { Users, Brain, Building2, FileText } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    usersCount: 0,
    patientsCount: 0,
    doctorsCount: 0,
    caregiversCount: 0,
    plansCount: 0,
    departmentsCount: 0,
    reportStats: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchStats() {
      try {
        const [usersRes, plansRes, deptsRes, repRes] = await Promise.allSettled([
          api.get('/admin/users/'),
          api.get('/discharge-plans/'),
          api.get('/admin/departments/'),
          api.get('/reports/recovery/'),
        ])
        if (!mounted) return

        let uCount = 0
        let pCount = 0
        let dCount = 0
        let cCount = 0
        if (usersRes.status === 'fulfilled') {
          const list = Array.isArray(usersRes.value.data) ? usersRes.value.data : usersRes.value.data?.results || []
          uCount = list.length
          pCount = list.filter(u => u.role === 'patient').length
          dCount = list.filter(u => u.role === 'doctor').length
          cCount = list.filter(u => u.role === 'caregiver').length
        }

        let plCount = 0
        if (plansRes.status === 'fulfilled') {
          const list = Array.isArray(plansRes.value.data) ? plansRes.value.data : plansRes.value.data?.results || []
          plCount = list.length
        }

        let deptCount = 0
        if (deptsRes.status === 'fulfilled') {
          const list = Array.isArray(deptsRes.value.data) ? deptsRes.value.data : deptsRes.value.data?.results || []
          deptCount = list.length
        }

        let reportData = null
        if (repRes.status === 'fulfilled' && repRes.value.data) {
          reportData = repRes.value.data
        }

        setStats({
          usersCount: uCount,
          patientsCount: pCount,
          doctorsCount: dCount,
          caregiversCount: cCount,
          plansCount: plCount,
          departmentsCount: deptCount,
          reportStats: reportData,
        })
      } catch (err) {
        // Fallback
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStats()
    return () => { mounted = false }
  }, [])

  const riskData = [
    { name: 'Low Risk', value: stats.reportStats?.risk_distribution?.low ?? 0, color: '#15803D' },
    { name: 'Medium Risk', value: stats.reportStats?.risk_distribution?.medium ?? 0, color: '#92400E' },
    { name: 'High Risk', value: stats.reportStats?.risk_distribution?.high ?? 0, color: '#B91C1C' },
  ]
  const totalRisks = stats.reportStats?.risk_distribution?.total ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Users"
          value={stats.usersCount}
          trend={`${stats.patientsCount} Patients · ${stats.doctorsCount} Doctors · ${stats.caregiversCount} Caregivers`}
          trendUp={true}
          icon={Users}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Active Discharge Plans"
          value={stats.plansCount}
          trend="Across clinical departments"
          trendUp={true}
          icon={FileText}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
        <StatCard
          label="Recovery Assessments & ML Inferences"
          value={stats.reportStats?.total_checkins_logged ? `${stats.reportStats.total_checkins_logged}` : "0"}
          trend="Active risk classification pipeline"
          trendUp={true}
          icon={Brain}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="Clinical Departments"
          value={stats.departmentsCount}
          trend="Active specialized units"
          trendUp={true}
          icon={Building2}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader title="Cohort 14-Day Recovery Trend" />
            <CardBody>
              <LineTrend
                data={stats.reportStats?.daily_trajectory || []}
                loading={loading}
                emptyMessage="No recovery check-ins logged yet."
              />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card>
            <CardHeader title="Clinical Risk Distribution" />
            <CardBody>
              <RiskDonut
                data={riskData}
                total={totalRisks}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
