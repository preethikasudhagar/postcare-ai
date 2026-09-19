import React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import RiskDonut from '../../charts/RiskDonut.jsx'
import { Users, UserCheck, Shield, Brain, Network, Activity, Server, FileText } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Administration & AI System Command"
        description="System health telemetry, user role provisioning, and ML infrastructure governance"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Users"
          value="340"
          trend="20 patients, 10 clinical"
          trendUp={true}
          icon={Users}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Active Discharge Plans"
          value="128"
          trend="Across 5 departments"
          trendUp={true}
          icon={FileText}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
        <StatCard
          label="ML Inferences (30d)"
          value="4,890"
          trend="94.2% accuracy"
          trendUp={true}
          icon={Brain}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="System Health"
          value="99.98%"
          trend="PostgreSQL & API online"
          trendUp={true}
          icon={Server}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader title="30-Day Platform Recovery Check-In Volume" description="Daily throughput of patient recovery submissions" />
            <CardBody><LineTrend /></CardBody>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card>
            <CardHeader title="Cohort Risk Spread" description="Synthetic model risk categories" />
            <CardBody><RiskDonut /></CardBody>
          </Card>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/ml-evaluation" className="p-4 bg-white border border-border rounded-lg shadow-xs hover:shadow-sm transition-all flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-primary-tint flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <Brain size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text">ML Model Evaluation</h4>
            <p className="text-2xs text-text-muted">Confusion matrix & feature weights</p>
          </div>
        </Link>

        <Link to="/admin/architecture" className="p-4 bg-white border border-border rounded-lg shadow-xs hover:shadow-sm transition-all flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-secondary-tint flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
            <Network size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text">System Architecture</h4>
            <p className="text-2xs text-text-muted">Full-stack dataflow & component diagram</p>
          </div>
        </Link>

        <Link to="/admin/users" className="p-4 bg-white border border-border rounded-lg shadow-xs hover:shadow-sm transition-all flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-success-tint flex items-center justify-center text-success group-hover:bg-success group-hover:text-white transition-colors">
            <UserCheck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text">User Role Management</h4>
            <p className="text-2xs text-text-muted">Role-based access & credentials</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
