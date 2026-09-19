import React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, StatCard, DisclaimerNote } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import RecoveryTimeline from '../../components/domain/RecoveryTimeline.jsx'
import { Heart, Activity, Calendar, Pill, AlertTriangle, Phone } from 'lucide-react'

export default function CaregiverDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Family & Caregiver Support Portal"
        description="Reassuring, real-time post-operative monitoring for your loved one"
      />

      {/* Linked Patient Identity Banner */}
      <div className="p-4 bg-secondary-tint border border-secondary/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold">
            <Heart size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Monitoring: Rahul Kumar (Husband)</h3>
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
          label="Today's Recovery Score"
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
          trend="Evening dose at 8:00 PM"
          trendUp={true}
          icon={Pill}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Upcoming Appointment"
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
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader title="Overall Healing Index" />
            <CardBody>
              <RecoveryRing value={88} size={120} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Caregiver Support Hotline" />
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

      <DisclaimerNote />
    </div>
  )
}
