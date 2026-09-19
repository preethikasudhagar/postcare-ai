import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageHeader, Card, CardHeader, CardBody, Tabs, Avatar, DisclaimerNote, Drawer } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import RecoveryTimeline from '../../components/domain/RecoveryTimeline.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import {
  FileText, Activity, Brain, Pill, Calendar, MessageSquare,
  User, ShieldAlert, Plus, CheckCircle, Clock, Thermometer, Send
} from 'lucide-react'

export default function PatientDetail() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [clinicalNote, setClinicalNote] = useState('')
  const [savedNotes, setSavedNotes] = useState([
    { id: 1, author: 'Dr. Rajesh Varma', date: '14 Sep 2026 04:30 PM', text: 'Reviewed Day 10 check-in. Incision clean, no edema. Advised continuation of active quadriceps exercises.' }
  ])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'plan', label: 'Discharge Plan' },
    { id: 'meds', label: 'Medications' },
    { id: 'recovery', label: 'Recovery Tracking' },
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

  return (
    <div className="space-y-6">
      {/* Patient Header Identity Card */}
      <div className="bg-white border border-border rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <Avatar name="Rahul Kumar" size="lg" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-text">Rahul Kumar</h1>
              <RiskBadge level="low" />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              UHID: <strong>{id || 'P-102'}</strong> · 54 Yrs · Male · O+ · Procedure: <strong className="text-text">Total Knee Arthroplasty (L)</strong>
            </p>
            <p className="text-2xs text-text-secondary mt-0.5">
              Surgery Date: 04 Sep 2026 · Post-Op Day 14 · Primary Surgeon: Dr. Rajesh Varma
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
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
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
              <Card>
                <CardHeader title="Current Health Status" />
                <CardBody>
                  <RecoveryRing value={88} size={130} />
                  <div className="mt-4 pt-3 border-t border-border space-y-1.5 text-xs text-text-secondary">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Current Risk:</span>
                      <strong className="text-success">Low (Stable)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Med Adherence:</span>
                      <strong className="text-text">94% (High)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Last Check-In:</span>
                      <strong className="text-text">Today 08:30 AM</strong>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="md:col-span-8">
              <Card>
                <CardHeader title="Latest Check-In Biometrics" description="Submitted by patient on Day 14 post-op" />
                <CardBody>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-surface-muted rounded border border-border">
                      <span className="text-text-muted block">Pain Rating</span>
                      <strong className="text-sm font-bold text-text">1 / 10</strong>
                    </div>
                    <div className="p-3 bg-surface-muted rounded border border-border">
                      <span className="text-text-muted block">Temperature</span>
                      <strong className="text-sm font-bold text-text">36.5 °C</strong>
                    </div>
                    <div className="p-3 bg-surface-muted rounded border border-border">
                      <span className="text-text-muted block">Wound Condition</span>
                      <strong className="text-sm font-bold text-success">Normal</strong>
                    </div>
                    <div className="p-3 bg-surface-muted rounded border border-border">
                      <span className="text-text-muted block">Medication</span>
                      <strong className="text-sm font-bold text-text">All Taken</strong>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-primary-tint/40 border border-primary/20 rounded text-xs text-primary">
                    <strong>Surgeon Guidance:</strong> Patient recovery trajectory is on target. Staple removal scheduled for 24 September.
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <RecoveryTimeline />
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Random Forest Risk Feature Contribution"
              description="Algorithmic feature weighting driving the current 'Low Risk' classification"
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

          <DisclaimerNote />
        </div>
      )}

      {activeTab === 'recovery' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Pain Trajectory (0–10)" />
              <CardBody><LineTrend data={[{day:'D1',score:6},{day:'D3',score:5},{day:'D5',score:4},{day:'D7',score:3},{day:'D9',score:2},{day:'D14',score:1}]} dataKey="score" color="#DC3B3B" bands={false} /></CardBody>
            </Card>
            <Card>
              <CardHeader title="Body Temperature (°C)" />
              <CardBody><LineTrend data={[{day:'D1',score:36.8},{day:'D3',score:37.0},{day:'D5',score:36.9},{day:'D7',score:36.7},{day:'D9',score:36.6},{day:'D14',score:36.5}]} dataKey="score" color="#18A7B5" bands={false} /></CardBody>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
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
