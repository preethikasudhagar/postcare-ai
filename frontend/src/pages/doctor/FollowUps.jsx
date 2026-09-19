import React, { useState } from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import { Calendar, Clock, Plus, Filter, Search, CheckCircle } from 'lucide-react'

export default function DoctorFollowUps() {
  const [view, setView] = useState('list')

  const appointments = [
    { id: 1, patient: 'Ramesh Patel', uhid: 'P-107', time: '10:00 AM', date: 'Today', type: 'Staple Removal', status: 'completed' },
    { id: 2, patient: 'Deepa Krishnan', uhid: 'P-105', time: '11:30 AM', date: 'Today', type: 'Incision Inspection', status: 'upcoming' },
    { id: 3, patient: 'Sanjay Deshmukh', uhid: 'P-112', time: '02:00 PM', date: 'Today', type: 'Pain Medication Adjustment', status: 'upcoming' },
    { id: 4, patient: 'Rahul Kumar', uhid: 'P-102', time: '10:30 AM', date: '24 Sep 2026', type: 'Post-Op Day 20 Review', status: 'upcoming' },
    { id: 5, patient: 'Vikram Mehta', uhid: 'P-101', time: '04:00 PM', date: '25 Sep 2026', type: 'Cardiac Suture Check', status: 'upcoming' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-Up Schedule & Clinical Consultations"
        description="Manage in-person appointments, post-operative assessments, and tele-consultations"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Today's Appointments"
          value="3 pending"
          trend="1 completed"
          trendUp={true}
          icon={Calendar}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Weekly Total"
          value="18 sessions"
          trend="4 tele-visits"
          trendUp={true}
          icon={Clock}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
        <StatCard
          label="Completion Rate"
          value="96%"
          trend="High adherence"
          trendUp={true}
          icon={CheckCircle}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Time & Date</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Consultation Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-muted/60 transition-colors">
                    <td className="p-3">
                      <strong className="block text-primary font-bold">{a.time}</strong>
                      <span className="text-2xs text-text-muted">{a.date}</span>
                    </td>
                    <td className="p-3">
                      <strong className="block text-text">{a.patient}</strong>
                      <span className="text-2xs text-text-muted">{a.uhid}</span>
                    </td>
                    <td className="p-3 text-text-secondary font-medium">{a.type}</td>
                    <td className="p-3"><StatusBadge status={a.status} /></td>
                    <td className="p-3 text-right">
                      <button className="px-2.5 py-1 text-xs font-medium text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
