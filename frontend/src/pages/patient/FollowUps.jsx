import React, { useState } from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard, ConfirmDialog } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import { Calendar, Clock, MapPin, User, CheckCircle2, AlertCircle, Plus } from 'lucide-react'

export default function FollowUps() {
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      title: 'Staple Removal & Incision Review',
      doctor: 'Dr. Rajesh Varma',
      dept: 'Department of Orthopedic Surgery',
      date: '24 Sep 2026',
      time: '10:30 AM',
      location: 'OPD Block B · Room 304',
      status: 'upcoming',
      purpose: 'Clinical evaluation of surgical incision healing, removal of orthopedic staples, and gait assessment.'
    },
    {
      id: 2,
      title: 'Physiotherapy Range-of-Motion Evaluation',
      doctor: 'Dr. Ananya Iyer (PT)',
      dept: 'Rehabilitation & Physical Therapy',
      date: '02 Oct 2026',
      time: '02:00 PM',
      location: 'Physio Gym · Ground Floor',
      status: 'upcoming',
      purpose: 'Goniometric knee flexion measurement, quadriceps strengthening progression, and active load monitoring.'
    },
    {
      id: 3,
      title: 'Initial Post-Discharge Virtual Check-in',
      doctor: 'Dr. Rajesh Varma',
      dept: 'Orthopedics Telehealth',
      date: '10 Sep 2026',
      time: '11:00 AM',
      location: 'Video Consultation',
      status: 'completed',
      purpose: 'Initial review of early recovery milestones, pain control, and DVT prophylaxis adherence.'
    }
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-Up Consultations & Appointments"
        description="Track your scheduled clinical consultations, post-operative assessments, and physiotherapy reviews"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Upcoming Consultations"
          value="2 scheduled"
          trend="Next: 24 Sep"
          trendUp={true}
          icon={Calendar}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Completed Follow-Ups"
          value="1 session"
          trend="10 Sep 2026"
          trendUp={true}
          icon={CheckCircle2}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="Missed / Rescheduled"
          value="0 missed"
          trend="100% on-time"
          trendUp={true}
          icon={Clock}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
      </div>

      {/* Appointment Cards List */}
      <div className="space-y-4">
        <h2 className="text-md font-semibold text-text">Your Scheduled Appointments</h2>
        <div className="grid grid-cols-1 gap-4">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardBody>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-sm font-bold text-text">{apt.title}</h3>
                      <StatusBadge status={apt.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                      <span className="flex items-center gap-1.5 font-semibold text-primary">
                        <Calendar size={13} /> {apt.date}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-text">
                        <Clock size={13} /> {apt.time}
                      </span>
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <User size={13} /> {apt.doctor} ({apt.dept})
                      </span>
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <MapPin size={13} /> {apt.location}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{apt.purpose}</p>
                  </div>

                  {apt.status === 'upcoming' && (
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button className="h-8 px-3 text-xs font-medium text-text border border-border-strong hover:bg-surface-muted rounded-sm transition-colors">
                        Request Reschedule
                      </button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
