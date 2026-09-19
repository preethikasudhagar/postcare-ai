import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { StatCard, Card, CardHeader, CardBody, DisclaimerNote, PageHeader } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import RecoveryTimeline from '../../components/domain/RecoveryTimeline.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import { Activity, ShieldAlert, Calendar, CheckSquare, Clock, ArrowRight, Pill, Bell, Info } from 'lucide-react'

export default function PatientDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Take morning medications (Amoxicillin 500mg, Paracetamol)', completed: true, to: '/patient/medications' },
    { id: 2, title: 'Complete today\'s recovery check-in', completed: false, to: '/patient/check-in' },
    { id: 3, title: 'Perform 15-minute gentle knee flexion exercises', completed: true, to: '/patient/discharge-plan' },
    { id: 4, title: 'Review upcoming follow-up appointment instructions', completed: false, to: '/patient/follow-ups' },
  ])

  const [recoveryHistory, setRecoveryHistory] = useState([])
  const [latestCheckin, setLatestCheckin] = useState(null)
  const [medCount, setMedCount] = useState(2)
  const [nextFollowUp, setNextFollowUp] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function fetchDashboard() {
      try {
        const [histRes, medRes, fuRes] = await Promise.allSettled([
          api.get('/recovery/history/'),
          api.get('/medications/'),
          api.get('/follow-ups/'),
        ])
        if (!isMounted) return
        if (histRes.status === 'fulfilled' && Array.isArray(histRes.value.data) && histRes.value.data.length > 0) {
          setRecoveryHistory(histRes.value.data)
          setLatestCheckin(histRes.value.data[0])
        }
        if (medRes.status === 'fulfilled' && Array.isArray(medRes.value.data)) {
          setMedCount(medRes.value.data.length)
        }
        if (fuRes.status === 'fulfilled' && Array.isArray(fuRes.value.data) && fuRes.value.data.length > 0) {
          setNextFollowUp(fuRes.value.data[0])
        }
      } catch (e) {
        // Fallback to initial display
      }
    }
    fetchDashboard()
    return () => { isMounted = false }
  }, [])

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const defaultTrendData = [
    { day: 'Day 1', score: 85 },
    { day: 'Day 3', score: 80 },
    { day: 'Day 5', score: 70 },
    { day: 'Day 7', score: 65 },
    { day: 'Day 9', score: 78 },
    { day: 'Day 11', score: 85 },
    { day: 'Day 13', score: 88 },
  ]

  const trendData = recoveryHistory.length >= 2
    ? recoveryHistory.slice(0, 10).reverse().map((c, idx) => ({
        day: `Day ${idx + 1}`,
        score: Math.round(c.recovery_score || 80),
      }))
    : defaultTrendData

  const currentScore = latestCheckin?.recovery_score ? Math.round(latestCheckin.recovery_score) : 88
  const currentRisk = latestCheckin?.risk_prediction?.risk_level || 'low'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, ${user?.first_name || 'Rahul'}`}
        description="Here is your post-operative recovery progress and today's care checklist."
        action={
          <Link
            to="/patient/check-in"
            className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white text-sm font-medium rounded-sm hover:bg-primary-hover shadow-xs transition-colors"
          >
            <Activity size={16} /> Submit Today's Check-in
          </Link>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Recovery Score"
          value={`${currentScore} / 100`}
          trend={currentScore >= 80 ? "Steady recovery progress" : "Requires close observation"}
          trendUp={currentScore >= 80}
          icon={Activity}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="Risk Classification"
          value={currentRisk === 'high' ? 'High Risk' : currentRisk === 'medium' ? 'Medium Risk' : 'Low Risk'}
          trend="ML decision support"
          trendUp={currentRisk === 'low'}
          icon={ShieldAlert}
          iconBg={currentRisk === 'high' ? 'bg-danger-tint' : currentRisk === 'medium' ? 'bg-warning-tint' : 'bg-primary-tint'}
          iconColor={currentRisk === 'high' ? 'text-danger' : currentRisk === 'medium' ? 'text-warning' : 'text-primary'}
        />
        <StatCard
          label="Next Follow-Up"
          value={nextFollowUp?.appointment_date || "24 Sep"}
          trend={nextFollowUp ? `${nextFollowUp.appointment_time?.slice(0, 5) || '10:30'} · ${nextFollowUp.department || 'Outpatient'}` : "10:30 AM · Ortho"}
          icon={Calendar}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
        <StatCard
          label="Prescriptions"
          value={`${medCount} Active`}
          trend="On prescribed schedule"
          trendUp={true}
          icon={Pill}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
        />
      </div>

      {/* Main Column 8 cols + Side Column 4 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main 8 Cols */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Check-in Card */}
          <Card>
            <CardHeader
              title="Today's Recovery Status"
              description="Post-operative monitoring and assessment"
              action={
                <span className="text-xs text-text-muted">
                  {latestCheckin ? `Recorded ${latestCheckin.date}` : "Today"}
                </span>
              }
            />
            <CardBody>
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-primary-tint/50 border border-primary/20 rounded-[8px] gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {currentScore}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text">Daily Assessment Recorded</h4>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Pain: <strong className="text-text">{latestCheckin?.pain_level ?? 2}/10</strong> · Temp: <strong className="text-text">{latestCheckin?.temperature ?? 36.6}°C</strong> · Wound: <strong className="text-text capitalize">{latestCheckin?.wound_condition?.replace('_', ' ') ?? 'Normal'}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge level={currentRisk} />
                  <Link
                    to="/patient/check-in"
                    className="text-xs font-medium text-primary hover:underline ml-2"
                  >
                    New check-in
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Recovery Timeline */}
          <RecoveryTimeline />

          {/* Recovery Progress Chart */}
          <Card>
            <CardHeader
              title="Recovery Progression Curve"
              description="Calculated recovery score across post-operative days (Normal range: 80–100)"
            />
            <CardBody>
              <LineTrend data={trendData} />
            </CardBody>
          </Card>
        </div>

        {/* Side 4 Cols */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recovery Ring */}
          <Card>
            <CardHeader title="Current Health Status" />
            <CardBody>
              <div className="py-2">
                <RecoveryRing value={currentScore} size={130} />
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-text-muted">ML Confidence:</span>
                <span className="font-semibold text-text tabular-nums">
                  {latestCheckin?.risk_prediction?.confidence
                    ? `${Math.round(latestCheckin.risk_prediction.confidence * 100)}% (High)`
                    : '95% (High)'}
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Today's Tasks Interactive Checklist */}
          <Card>
            <CardHeader
              title="Today's Care Tasks"
              description="Check off items as you complete them"
            />
            <CardBody>
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-sm hover:bg-surface-muted transition-colors cursor-pointer border border-border"
                    onClick={() => toggleTask(t.id)}
                  >
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => {}}
                      className="w-4 h-4 mt-0.5 text-primary rounded border-border-strong cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${t.completed ? 'line-through text-text-muted' : 'text-text'}`}>
                        {t.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Upcoming Appointment Widget */}
          <Card>
            <CardHeader title="Next Follow-Up" />
            <CardBody>
              <div className="p-3 bg-secondary-tint/40 border border-secondary/20 rounded-[8px]">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} className="text-secondary" />
                  <span className="text-xs font-semibold text-secondary">24 September 2026 · 10:30 AM</span>
                </div>
                <p className="text-xs font-medium text-text">Dr. Rajesh Varma</p>
                <p className="text-2xs text-text-muted">Dept of Orthopedic Surgery · Room 304</p>
                <Link
                  to="/patient/follow-ups"
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-3 hover:underline"
                >
                  View appointment details <ArrowRight size={12} />
                </Link>
              </div>
            </CardBody>
          </Card>

          <DisclaimerNote compact />
        </div>
      </div>
    </div>
  )
}
