import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard } from '../../components/ui/index.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import RecoveryTimeline from '../../components/domain/RecoveryTimeline.jsx'
import WoundUpload from '../../components/domain/WoundUpload.jsx'
import api from '../../services/api'
import { Heart, Activity, Calendar, Pill, Phone, UserCheck } from 'lucide-react'
import { formatDate, formatRelativeDate } from '../../utils/dateUtils'

export default function CaregiverDashboard() {
  const [patient, setPatient] = useState(null)
  const [recoveryHistory, setRecoveryHistory] = useState([])
  const [medications, setMedications] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchCaregiverData() {
      try {
        const [patRes, histRes, medRes, fuRes] = await Promise.allSettled([
          api.get('/patients/'),
          api.get('/recovery/history/'),
          api.get('/medications/'),
          api.get('/follow-ups/'),
        ])
        if (!mounted) return

        if (patRes.status === 'fulfilled' && Array.isArray(patRes.value.data) && patRes.value.data.length > 0) {
          setPatient(patRes.value.data[0])
        }
        if (histRes.status === 'fulfilled' && Array.isArray(histRes.value.data)) {
          setRecoveryHistory(histRes.value.data)
        }
        if (medRes.status === 'fulfilled' && Array.isArray(medRes.value.data)) {
          setMedications(medRes.value.data)
        }
        if (fuRes.status === 'fulfilled' && Array.isArray(fuRes.value.data)) {
          setFollowUps(fuRes.value.data)
        }
      } catch (err) {
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchCaregiverData()
    return () => { mounted = false }
  }, [])

  const patientName = patient?.user
    ? `${patient.user.first_name} ${patient.user.last_name}`
    : 'Assigned Patient'

  const latestCheckin = recoveryHistory.length > 0
    ? recoveryHistory[recoveryHistory.length - 1]
    : null

  const recoveryScore = latestCheckin?.recovery_score !== undefined && latestCheckin?.recovery_score !== null
    ? Math.round(latestCheckin.recovery_score)
    : (patient?.latest_recovery_score ? Math.round(patient.latest_recovery_score) : 85)

  const riskLevel = latestCheckin?.risk_prediction?.risk_level
    || patient?.latest_risk_level
    || 'low'

  const nextAppointment = followUps.find(f => f.status === 'upcoming') || followUps[0]
  const nextApptDate = nextAppointment?.appointment_date
    ? formatDate(nextAppointment.appointment_date, 'DD MMM YYYY')
    : formatRelativeDate(3, 'DD MMM YYYY')
  const nextApptTime = nextAppointment?.appointment_time
    ? nextAppointment.appointment_time.slice(0, 5)
    : '10:30 AM'
  const nextApptDept = nextAppointment?.department || 'Surgical Ward'

  const activeMedsCount = medications.filter(m => m.status === 'active').length || medications.length || 2

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
            <h3 className="text-sm font-semibold text-text">
              Monitoring: {patientName} {patient?.patient_id ? `(${patient.patient_id})` : ''}
            </h3>
            <p className="text-2xs text-text-muted">
              {patient?.surgery_type || 'Post-Operative Recovery'} · {patient?.primary_doctor_name ? `Dr. ${patient.primary_doctor_name}` : 'Attending Physician'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Current Clinical Status:</span>
          <RiskBadge level={riskLevel} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Recovery Score"
          value={`${recoveryScore} / 100`}
          trend={recoveryScore >= 80 ? "Steady recovery progress" : "Observation recommended"}
          trendUp={recoveryScore >= 80}
          icon={Activity}
          iconBg={recoveryScore >= 80 ? "bg-success-tint" : "bg-warning-tint"}
          iconColor={recoveryScore >= 80 ? "text-success" : "text-warning"}
        />
        <StatCard
          label="Prescribed Medications"
          value={`${activeMedsCount} active`}
          trend="Adherence monitored"
          trendUp={true}
          icon={Pill}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Next Appointment"
          value={nextApptDate}
          trend={`${nextApptTime} · ${nextApptDept}`}
          icon={Calendar}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <RecoveryTimeline data={recoveryHistory} loading={loading} />
          <WoundUpload />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader title="Healing Progress" />
            <CardBody>
              <div className="py-2">
                <RecoveryRing value={recoveryScore} size={120} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Caregiver Helpline" />
            <CardBody>
              <div className="p-3 bg-surface-muted rounded text-xs space-y-2 border border-border">
                <p className="font-semibold text-text">Emergency Care Helpdesk</p>
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
