import React from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import RecoveryTimeline from '../../components/domain/RecoveryTimeline.jsx'
import WoundUpload from '../../components/domain/WoundUpload.jsx'
import { Heart, Activity, Calendar, Pill, Phone } from 'lucide-react'

export default function CaregiverDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Caregiver Dashboard" />

      {/* Linked Patient Identity Banner */}
      <div className="p-4 bg-secondary-tint/40 border border-secondary/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold">
            <Heart size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Monitoring: Rahul Kumar (Husband)</h3>
            <p className="text-2xs text-text-muted">Total Knee Arthroplasty (L) · Post-Op Day 14 · Dr. Rajesh Varma</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Current Status:</span>
          <RiskBadge level="low" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Recovery Score"
          value="88 / 100"
          trend="Good progress"
          trendUp={true}
          icon={Activity}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="Medications Taken"
          value="3 of 4 doses"
          trend="On schedule"
          trendUp={true}
          icon={Pill}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Next Appointment"
          value="24 Sep"
          trend="10:30 AM · Orthopedics"
          icon={Calendar}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <RecoveryTimeline />
          <WoundUpload />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader title="Healing Progress" />
            <CardBody>
              <div className="py-2">
                <RecoveryRing value={88} size={120} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Caregiver Helpline" />
            <CardBody>
              <div className="p-3 bg-surface-muted rounded text-xs space-y-2 border border-border">
                <p className="font-semibold text-text">Emergency Nursing Helpdesk</p>
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Phone size={14} /> +91 80 2345 6789 (24/7 Helpline)
                </div>
                <p className="text-2xs text-text-muted">Direct line to post-op triage coordinator</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
