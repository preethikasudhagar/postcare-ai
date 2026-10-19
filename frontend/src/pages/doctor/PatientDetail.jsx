import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { PageHeader, Card, CardHeader, CardBody, Tabs, Avatar, Drawer } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import RecoveryTimeline from '../../components/domain/RecoveryTimeline.jsx'
import WoundUpload from '../../components/domain/WoundUpload.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import {
  FileText, Activity, Brain, Pill, Calendar, MessageSquare,
  User, ShieldAlert, Plus, CheckCircle, Clock, Thermometer, Send, AlertCircle
} from 'lucide-react'

export default function PatientDetail() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [clinicalNote, setClinicalNote] = useState('')
  const [savedNotes, setSavedNotes] = useState([
    { id: 1, author: 'Dr. Rajesh Varma', date: '14 Sep 2026 04:30 PM', text: 'Reviewed Day 10 check-in. Incision clean, no edema. Advised continuation of active quadriceps exercises.' }
  ])

  // Backend API states
  const [patientData, setPatientData] = useState(null)
  const [checkins, setCheckins] = useState(null)
  const [checkinsLoading, setCheckinsLoading] = useState(true)
  const [checkinsError, setCheckinsError] = useState(false)

  const fetchData = useCallback(async () => {
    setCheckinsLoading(true)
    setCheckinsError(false)
    try {
      const [patRes, recRes] = await Promise.allSettled([
        api.get(`/patients/${id}/`),
        api.get(`/recovery/patient/${id}/`)
      ])

      if (patRes.status === 'fulfilled' && patRes.value?.data) {
        setPatientData(patRes.value.data)
      }

      if (recRes.status === 'fulfilled' && Array.isArray(recRes.value?.data)) {
        // Fulfilled: may be empty array (no check-ins yet) or populated list
        setCheckins(recRes.value.data)
      } else if (recRes.status === 'rejected') {
        // Network / server error — show error state with retry
        setCheckinsError(true)
        setCheckins(null)
      } else {
        // Fulfilled but unexpected format → treat as empty
        setCheckins([])
      }
    } catch (err) {
      setCheckinsError(true)
    } finally {
      setCheckinsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'plan', label: 'Discharge Plan' },
    { id: 'meds', label: 'Medications' },
    { id: 'recovery', label: 'Recovery Tracking' },
    { id: 'wounds', label: 'Wound Images' },
    { id: 'risk', label: 'AI Risk Analysis' },
    { id: 'followups', label: 'Follow-Ups' },
    { id: 'notes', label: 'Clinical Notes' }
  ]

  const handleAddNote = (e) => {
    e.preventDefault()
    if (!clinicalNote.trim()) return
    setSavedNotes([
      { id: Date.now(), author: 'Dr. Rajesh Varma', date: 'Just now', text: clinicalNote },
      ...savedNotes
    ])
    setClinicalNote('')
    setNoteDrawerOpen(false)
  }

  const patientName = patientData?.user?.first_name ? `${patientData.user.first_name} ${patientData.user.last_name}` : 'Rahul Kumar'
  const patientUHID = patientData?.patient_id || id || 'P-102'
  const patientProcedure = patientData?.surgery_type || 'Total Knee Arthroplasty (L)'
  const patientGender = patientData?.gender === 'M' ? 'Male' : patientData?.gender === 'F' ? 'Female' : 'Male'
  const latestCheckin = Array.isArray(checkins) && checkins.length > 0 ? checkins[checkins.length - 1] : null
  const currentRisk = latestCheckin?.risk_prediction?.risk_level || 'low'
  const currentScore = latestCheckin?.recovery_score !== undefined ? Math.round(latestCheckin.recovery_score) : 88

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Patient Header Identity Card */}
      <div className="bg-white border border-border rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs min-w-0">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar name={patientName} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-text truncate">{patientName}</h1>
              <RiskBadge level={currentRisk} />
            </div>
            <p className="text-xs text-text-muted mt-0.5 truncate">
              UHID: <strong>{patientUHID}</strong> · 54 Yrs · {patientGender} · O+ · Procedure: <strong className="text-text">{patientProcedure}</strong>
            </p>
            <p className="text-2xs text-text-secondary mt-0.5 truncate">
              Surgery Date: 04 Sep 2026 · Post-Op Day 14 · Primary Surgeon: Dr. Rajesh Varma
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
          <button
            onClick={() => setNoteDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-hover transition-colors shadow-xs"
          >
            <Plus size={14} /> Add Clinical Note
          </button>
          <Link
            to="/doctor/messages"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-border-strong text-xs font-medium rounded-sm text-text bg-white hover:bg-surface-muted transition-colors"
          >
            <MessageSquare size={14} /> Message Patient
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="min-w-0 overflow-x-auto">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-w-0">
            <div className="md:col-span-4 min-w-0">
              <Card>
                <CardHeader title="Current Health Status" />
                <CardBody>
                  <RecoveryRing value={currentScore} size={130} />
                  <div className="mt-4 pt-3 border-t border-border space-y-1.5 text-xs text-text-secondary">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Current Risk:</span>
                      <strong className={currentRisk === 'high' ? 'text-danger' : currentRisk === 'medium' ? 'text-warning' : 'text-success'}>
                        {currentRisk.toUpperCase()} ({currentRisk === 'low' ? 'Stable' : 'Attention'})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Med Adherence:</span>
                      <strong className="text-text">94% (High)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Last Check-In:</span>
                      <strong className="text-text">{latestCheckin?.date || 'Today 08:30 AM'}</strong>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="md:col-span-8 min-w-0">
              <Card>
                <CardHeader title="Latest Check-In Biometrics" description="Submitted by patient on Post-Op Check-In" />
                <CardBody>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-surface-muted rounded border border-border">
                      <span className="text-text-muted block">Pain Rating</span>
                      <strong className="text-sm font-bold text-text">{latestCheckin?.pain_level ?? 1} / 10</strong>
                    </div>
                    <div className="p-3 bg-surface-muted rounded border border-border">
                      <span className="text-text-muted block">Temperature</span>
                      <strong className="text-sm font-bold text-text">{latestCheckin?.temperature ?? 36.5} °C</strong>
                    </div>
                    <div className="p-3 bg-surface-muted rounded border border-border">
                      <span className="text-text-muted block">Wound Condition</span>
                      <strong className="text-sm font-bold text-success capitalize">{latestCheckin?.wound_condition?.replace('_', ' ') ?? 'Normal'}</strong>
                    </div>
                    <div className="p-3 bg-surface-muted rounded border border-border">
                      <span className="text-text-muted block">Medication</span>
                      <strong className="text-sm font-bold text-text capitalize">{latestCheckin?.medication_adherence ?? 'All Taken'}</strong>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-primary-tint/40 border border-primary/20 rounded text-xs text-primary">
                    <strong>Surgeon Guidance:</strong> Patient recovery trajectory is on target. Staple removal scheduled for 24 September.
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Recovery Timeline Component */}
          <div className="min-w-0">
            <RecoveryTimeline data={checkins} loading={checkinsLoading} error={checkinsError} onRetry={fetchData} />
          </div>
        </div>
      )}

      {activeTab === 'recovery' && (
        <div className="space-y-6 min-w-0">
          <div className="min-w-0">
            <RecoveryTimeline data={checkins} loading={checkinsLoading} error={checkinsError} onRetry={fetchData} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
            <Card>
              <CardHeader title="Pain Trajectory (0–10)" />
              <CardBody>
                <LineTrend
                  data={
                    Array.isArray(checkins) && checkins.length > 0
                      ? checkins.map((c, i) => ({ day: `D${i + 1}`, score: c.pain_level }))
                      : [{ day: 'D1', score: 6 }, { day: 'D3', score: 5 }, { day: 'D5', score: 4 }, { day: 'D7', score: 3 }, { day: 'D9', score: 2 }, { day: 'D14', score: 1 }]
                  }
                  dataKey="score"
                  color="#DC3B3B"
                  bands={false}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Body Temperature (°C)" />
              <CardBody>
                <LineTrend
                  data={
                    Array.isArray(checkins) && checkins.length > 0
                      ? checkins.map((c, i) => ({ day: `D${i + 1}`, score: c.temperature }))
                      : [{ day: 'D1', score: 36.8 }, { day: 'D3', score: 37.0 }, { day: 'D5', score: 36.9 }, { day: 'D7', score: 36.7 }, { day: 'D9', score: 36.6 }, { day: 'D14', score: 36.5 }]
                  }
                  dataKey="score"
                  color="#18A7B5"
                  bands={false}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'wounds' && (
        <div className="space-y-6 min-w-0">
          <WoundUpload patientId={id} title="Patient Wound Images" description="Review images uploaded by the patient or their caregiver" readOnly={true} />
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader
              title="Random Forest Risk Feature Contribution"
              description="Algorithmic feature weighting driving the current risk classification"
            />
            <CardBody>
              <div className="space-y-3">
                {[
                  { feature: 'Pain Level (1/10)', weight: '35%', contribution: 'Strong Positive (+28 pts)' },
                  { feature: 'Wound Condition (Normal)', weight: '30%', contribution: 'Strong Positive (+30 pts)' },
                  { feature: 'Body Temperature (36.5°C)', weight: '15%', contribution: 'Normal Baseline (+10 pts)' },
                  { feature: 'Medication Adherence (100%)', weight: '12%', contribution: 'High Compliance (+20 pts)' },
                  { feature: 'Acute Symptom Count (0)', weight: '8%', contribution: 'No Distress (+10 pts)' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-surface-muted rounded text-xs border border-border">
                    <span className="font-semibold text-text">{f.feature}</span>
                    <span className="text-text-muted">Feature Importance: <strong>{f.weight}</strong></span>
                    <span className="text-success font-medium">{f.contribution}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4 min-w-0">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-text">Clinical Progress Notes & Observations</h3>
            <button onClick={() => setNoteDrawerOpen(true)} className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded">
              + New Note
            </button>
          </div>

          <div className="space-y-3">
            {savedNotes.map((n) => (
              <div key={n.id} className="p-4 bg-white border border-border rounded-lg shadow-xs space-y-1">
                <div className="flex justify-between text-xs">
                  <strong className="text-text font-semibold">{n.author}</strong>
                  <span className="text-text-muted">{n.date}</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Note Drawer */}
      <Drawer
        isOpen={noteDrawerOpen}
        onClose={() => setNoteDrawerOpen(false)}
        title="Record Clinical Observation"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1">Clinical Observation / Action Plan</label>
            <textarea
              rows={6}
              value={clinicalNote}
              onChange={(e) => setClinicalNote(e.target.value)}
              placeholder="Enter clinical examination notes, prescription adjustments, or wound inspection findings..."
              className="w-full p-3 text-xs border border-border-strong rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full h-10 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors"
          >
            Save Clinical Note
          </button>
        </form>
      </Drawer>
    </div>
  )
}
