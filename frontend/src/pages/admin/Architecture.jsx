import React from 'react'
import { PageHeader, Card, CardHeader, CardBody, DisclaimerNote } from '../../components/ui/index.jsx'
import { Server, Database, Brain, Bell, Shield, Network, ArrowDown, Cpu, Layers } from 'lucide-react'

export default function Architecture() {
  const stack = [
    { layer: 'Frontend Client', tech: 'React 18, Vite, Tailwind CSS, Recharts, Lucide Icons', desc: 'Light-themed clinical SaaS interface with role-based routing and interactive recovery visualizations' },
    { layer: 'API & Business Logic', tech: 'Python 3.12, Django 5.1, Django REST Framework, JWT', desc: 'Secure REST endpoints with granular permissions, serializer validation, and audit trail logging' },
    { layer: 'ML Prediction Engine', tech: 'scikit-learn Random Forest, NumPy, Pandas, Joblib', desc: 'Multi-class risk inference model computing real-time confidence scores and contributing factors' },
    { layer: 'Persistence Layer', tech: 'PostgreSQL 16 (Relational ORM), SQLite (Dev fallback)', desc: 'Normalized relational database tracking patients, discharge plans, check-ins, and alerts' },
    { layer: 'Notification Subsystem', tech: 'Django Signals & Background Task Architecture', desc: 'Automated alert trigger generating high-risk clinical notifications upon check-in submission' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Architecture & Dataflow Pipeline"
        description="End-to-end technical topology, component interactions, and multi-tier technology stack"
      />

      {/* Visual Topology Diagram Card */}
      <Card>
        <CardHeader
          title="Interactive Platform Architecture Diagram"
          description="Request-response lifecycle and machine learning inference pipeline"
        />
        <CardBody>
          <div className="py-6 flex flex-col items-center space-y-4 max-w-2xl mx-auto">
            {/* Tier 1: Client */}
            <div className="w-full p-4 bg-primary-tint border-2 border-primary rounded-lg text-center shadow-xs">
              <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm">
                <Layers size={18} /> React Single Page Application (Client Layer)
              </div>
              <p className="text-2xs text-text-secondary mt-1">
                Patients (Check-ins, Meds) · Doctors (Plans, Alerts) · Nurses (Triage) · Caregivers · Admins
              </p>
            </div>

            <ArrowDown size={20} className="text-primary animate-bounce" />

            {/* Tier 2: REST Gateway */}
            <div className="w-full p-4 bg-surface-muted border-2 border-border-strong rounded-lg text-center shadow-xs">
              <div className="flex items-center justify-center gap-2 text-text font-bold text-sm">
                <Shield size={18} className="text-primary" /> Django REST Framework API Gateway
              </div>
              <p className="text-2xs text-text-muted mt-1">
                JWT Auth Bearer Token Interceptor · CORS Protection · Serializer Schema Validation
              </p>
            </div>

            <ArrowDown size={20} className="text-primary" />

            {/* Tier 3: Core Subsystems Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white border-2 border-border rounded-lg text-center shadow-xs">
                <div className="flex items-center justify-center gap-1.5 text-text font-bold text-xs mb-1">
                  <Database size={16} className="text-secondary" /> PostgreSQL DB
                </div>
                <p className="text-2xs text-text-muted">Relational schemas, migrations & audit logs</p>
              </div>

              <div className="p-4 bg-primary-tint/60 border-2 border-primary rounded-lg text-center shadow-xs">
                <div className="flex items-center justify-center gap-1.5 text-primary font-bold text-xs mb-1">
                  <Brain size={16} /> ML Risk Engine
                </div>
                <p className="text-2xs text-primary/80">Random Forest multi-class inference</p>
              </div>

              <div className="p-4 bg-white border-2 border-border rounded-lg text-center shadow-xs">
                <div className="flex items-center justify-center gap-1.5 text-text font-bold text-xs mb-1">
                  <Bell size={16} className="text-warning" /> Alert Subsystem
                </div>
                <p className="text-2xs text-text-muted">High-risk threshold notification dispatch</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Layer Specs Table */}
      <Card>
        <CardHeader title="Component Specifications & Technologies" />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Layer / Subsystem</th>
                  <th className="p-3">Technologies</th>
                  <th className="p-3">Functional Responsibilities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {stack.map((s) => (
                  <tr key={s.layer} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3 font-bold text-primary">{s.layer}</td>
                    <td className="p-3 font-mono text-2xs text-text">{s.tech}</td>
                    <td className="p-3 text-text-secondary">{s.desc}</td>
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
