import React, { useState } from 'react'
import { PageHeader, Card, CardHeader, CardBody, DisclaimerNote, Drawer } from '../../components/ui/index.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import RecoveryTimeline from '../../components/domain/RecoveryTimeline.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import { Activity, Info, HelpCircle, Thermometer, ShieldAlert, Pill } from 'lucide-react'

export default function RecoveryPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const painData = [
    { day: 'Day 1', score: 6 },
    { day: 'Day 3', score: 5 },
    { day: 'Day 5', score: 7 },
    { day: 'Day 7', score: 4 },
    { day: 'Day 9', score: 3 },
    { day: 'Day 11', score: 2 },
    { day: 'Day 13', score: 1 },
  ]

  const tempData = [
    { day: 'Day 1', score: 36.8 },
    { day: 'Day 3', score: 37.1 },
    { day: 'Day 5', score: 37.8 },
    { day: 'Day 7', score: 37.0 },
    { day: 'Day 9', score: 36.7 },
    { day: 'Day 11', score: 36.5 },
    { day: 'Day 13', score: 36.5 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recovery Monitoring & Longitudinal Trends"
        description="Comprehensive daily biometric trends, pain trajectories, and recovery calculations"
        action={
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-border-strong text-xs font-medium rounded-sm text-text bg-white hover:bg-surface-muted transition-colors shadow-xs"
          >
            <HelpCircle size={14} className="text-primary" /> How is this score calculated?
          </button>
        }
      />

      {/* Hero Overview */}
      <div className="bg-white border border-border rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-6">
          <RecoveryRing value={88} size={130} />
          <div>
            <h2 className="text-lg font-bold text-text">Post-Operative Progress: Good Recovery</h2>
            <p className="text-xs text-text-secondary mt-1 max-w-md">
              Your recovery parameters show steadily decreasing pain levels, stable body temperature, and high medication adherence.
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
              <span>Day 14 of 30</span>
              <span>•</span>
              <span>Procedure: Total Knee Replacement</span>
              <span>•</span>
              <span>Primary Dr: Dr. Rajesh Varma</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Timeline */}
      <RecoveryTimeline />

      {/* 2 x 2 Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Pain Score Trend (0–10)"
            description="Target: progressive decline below 3/10"
          />
          <CardBody>
            <LineTrend data={painData} dataKey="score" name="Pain Level" color="#DC3B3B" bands={false} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Body Temperature Trend (°C)"
            description="Normal clinical range: 36.1°C – 37.2°C"
          />
          <CardBody>
            <LineTrend data={tempData} dataKey="score" name="Temperature" color="#18A7B5" unit="°C" bands={false} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Medication Adherence (%)"
            description="Weekly prescribed dosage completion rate"
          />
          <CardBody>
            <BarCompare />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Calculated Recovery Score History"
            description="Integrated multi-factor recovery index (0–100)"
          />
          <CardBody>
            <LineTrend />
          </CardBody>
        </Card>
      </div>

      <DisclaimerNote />

      {/* Score Calculation Breakdown Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Recovery Score Calculation Methodology"
      >
        <div className="space-y-4 text-xs text-text-secondary">
          <p>
            The <strong>PostCare AI Recovery Score</strong> is a calculated decision-support metric (0–100) combining multiple clinical dimensions:
          </p>

          <div className="border border-border rounded-md divide-y divide-border bg-surface-muted">
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">1. Pain Level (Max 30 pts)</strong>
                <p className="text-2xs text-text-muted">Formula: max(0, 10 - pain_level) × 3</p>
              </div>
              <span className="font-bold text-success text-sm">27 / 30 pts</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">2. Wound Condition (Max 30 pts)</strong>
                <p className="text-2xs text-text-muted">Normal=30, Mild=20, Swelling=10, Discharge=5, Severe=0</p>
              </div>
              <span className="font-bold text-success text-sm">30 / 30 pts</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">3. Medication Adherence (Max 20 pts)</strong>
                <p className="text-2xs text-text-muted">All taken=20, Missed some=10, None=0</p>
              </div>
              <span className="font-bold text-success text-sm">20 / 20 pts</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">4. Body Temperature (Max 10 pts)</strong>
                <p className="text-2xs text-text-muted">36.1–37.2°C = 10 pts; &gt;38.0°C = 0 pts</p>
              </div>
              <span className="font-bold text-success text-sm">10 / 10 pts</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">5. Symptom Burden (Max 10 pts)</strong>
                <p className="text-2xs text-text-muted">10 minus 2 pts per reported acute symptom</p>
              </div>
              <span className="font-bold text-success text-sm">10 / 10 pts</span>
            </div>
          </div>

          <div className="p-3 bg-primary-tint/60 border border-primary/20 rounded-md text-primary">
            <p className="font-bold text-sm mb-1">Total Calculated Score: 97 / 100</p>
            <p className="text-2xs">Categorized as "Good Progress" (80–100 range).</p>
          </div>

          <p className="text-2xs text-text-muted italic">
            Note: This score is an academic heuristic for educational and algorithmic demonstration, not an approved medical diagnostic score.
          </p>
        </div>
      </Drawer>
    </div>
  )
}
