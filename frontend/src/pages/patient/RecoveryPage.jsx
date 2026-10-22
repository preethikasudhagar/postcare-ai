import React, { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../services/api'
import { PageHeader, Card, CardHeader, CardBody, Drawer } from '../../components/ui/index.jsx'
import RecoveryRing from '../../components/domain/RecoveryRing.jsx'
import RecoveryTimeline from '../../components/domain/RecoveryTimeline.jsx'
import WoundUpload from '../../components/domain/WoundUpload.jsx'
import LineTrend from '../../charts/LineTrend.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import { HelpCircle, Activity, ShieldAlert, Thermometer, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/**
 * Format ISO date string "YYYY-MM-DD" into a clean "Mon D" string (e.g. "Sep 6")
 * using UTC to avoid timezone shift inconsistencies.
 */
function formatShortDate(dateStr) {
  if (!dateStr) return ''
  try {
    const parts = String(dateStr).split('T')[0].split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(Date.UTC(year, month, day))
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    }
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch (e) {
    return String(dateStr)
  }
}

/**
 * Format ISO date string "YYYY-MM-DD" into full readable date (e.g. "September 6, 2026")
 */
function formatFullDate(dateStr) {
  if (!dateStr) return ''
  try {
    const parts = String(dateStr).split('T')[0].split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(Date.UTC(year, month, day))
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    }
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch (e) {
    return String(dateStr)
  }
}

export default function RecoveryPage() {
  const { user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/recovery/history/')
      const rawList = Array.isArray(res.data) ? res.data : []
      // Sort chronologically by date ascending
      const sorted = [...rawList].sort((a, b) => {
        const timeA = new Date(a.date || a.submitted_at || 0).getTime()
        const timeB = new Date(b.date || b.submitted_at || 0).getTime()
        if (timeA !== timeB) return timeA - timeB
        return (a.id || 0) - (b.id || 0)
      })
      setHistory(sorted)
    } catch (err) {
      console.error('Failed to fetch recovery history:', err)
      setError('Unable to load recovery score history. Please verify your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Transform check-in history into calculated recovery score trend
  const scoreHistoryData = useMemo(() => {
    return history
      .filter((item) => item && item.recovery_score !== null && item.recovery_score !== undefined)
      .map((item, idx) => {
        const rawScore = Number(item.recovery_score)
        const score = !isNaN(rawScore) ? Math.round(rawScore) : null
        let risk = 'low'
        if (item.risk_prediction && item.risk_prediction.risk_level) {
          risk = String(item.risk_prediction.risk_level).toLowerCase()
        } else if (item.risk) {
          risk = String(item.risk).toLowerCase()
        } else if (score !== null) {
          if (score < 50) risk = 'high'
          else if (score < 80) risk = 'medium'
        }

        return {
          id: item.id || idx,
          day: formatShortDate(item.date) || `Day ${idx + 1}`,
          fullDate: formatFullDate(item.date) || item.date || `Day ${idx + 1}`,
          score,
          risk,
          pain: item.pain_level !== null && item.pain_level !== undefined ? Number(item.pain_level) : null,
          temp: item.temperature !== null && item.temperature !== undefined ? Number(item.temperature) : null,
        }
      })
      .filter((item) => item.score !== null)
  }, [history])

  // Transform check-in history into pain score trend (0-10)
  const painHistoryData = useMemo(() => {
    return history
      .filter((item) => item && item.pain_level !== null && item.pain_level !== undefined)
      .map((item, idx) => ({
        id: item.id || idx,
        day: formatShortDate(item.date) || `Day ${idx + 1}`,
        fullDate: formatFullDate(item.date) || item.date || `Day ${idx + 1}`,
        score: Number(item.pain_level),
      }))
      .filter((item) => !isNaN(item.score))
  }, [history])

  // Transform check-in history into temperature trend (°C)
  const tempHistoryData = useMemo(() => {
    return history
      .filter((item) => item && item.temperature !== null && item.temperature !== undefined)
      .map((item, idx) => ({
        id: item.id || idx,
        day: formatShortDate(item.date) || `Day ${idx + 1}`,
        fullDate: formatFullDate(item.date) || item.date || `Day ${idx + 1}`,
        score: Number(Number(item.temperature).toFixed(1)),
      }))
      .filter((item) => !isNaN(item.score))
  }, [history])

  // Adherence trend for the last 7 check-ins
  const adherenceData = useMemo(() => {
    if (!history || !history.length) return []
    const recent = history.slice(-7)
    return recent.map((item, idx) => {
      const adh = item?.medication_adherence
      let val = 100
      if (adh === 'some') val = 60
      else if (adh === 'none') val = 0
      else if (typeof adh === 'number') val = Math.max(0, Math.min(100, Math.round(adh)))
      return {
        name: formatShortDate(item?.date) || `D${idx + 1}`,
        value: val,
      }
    })
  }, [history])

  // Latest check-in values for Hero overview and calculation breakdown drawer
  const latestCheckin = history.length > 0 ? history[history.length - 1] : null
  const latestScore = latestCheckin?.recovery_score !== null && latestCheckin?.recovery_score !== undefined
    ? Math.round(Number(latestCheckin.recovery_score))
    : (loading ? null : 0)

  let heroTitle = 'Post-Operative Progress: Good Recovery'
  let heroDesc = 'Your recovery parameters show steadily decreasing pain levels, stable body temperature, and high medication adherence.'
  if (!loading && history.length === 0) {
    heroTitle = 'Post-Operative Progress: Awaiting Check-In'
    heroDesc = 'Complete your daily recovery check-in to begin calculating your recovery score and monitoring trends.'
  } else if (latestScore !== null) {
    if (latestScore >= 80) {
      heroTitle = 'Post-Operative Progress: Good Recovery'
      heroDesc = 'Your recovery parameters show steadily decreasing pain levels, stable body temperature, and high medication adherence.'
    } else if (latestScore >= 50) {
      heroTitle = 'Post-Operative Progress: Moderate Recovery (Active Monitoring)'
      heroDesc = 'Your recovery parameters indicate steady progress with mild symptoms tracked by your clinical team.'
    } else {
      heroTitle = 'Post-Operative Progress: Clinical Attention Advised'
      heroDesc = 'Your recent check-in parameters indicate elevated clinical risk. Please review symptoms with your doctor.'
    }
  }

  const recoveryDayText = history.length > 0 ? `Day ${history.length} of 30` : 'Day 1 of 30'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recovery Progress"
        action={
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-border-strong text-xs font-medium rounded-sm text-text bg-white hover:bg-surface-muted transition-colors shadow-xs cursor-pointer"
          >
            <HelpCircle size={14} className="text-primary" /> Score Breakdown
          </button>
        }
      />

      {/* Hero Overview */}
      <div className="bg-white border border-border rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-6">
          <RecoveryRing value={latestScore ?? 85} size={130} />
          <div>
            <h2 className="text-lg font-bold text-text">{heroTitle}</h2>
            <p className="text-xs text-text-secondary mt-1 max-w-md">
              {heroDesc}
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
              <span>{recoveryDayText}</span>
              <span>•</span>
              <span>Procedure: Total Knee Replacement</span>
              <span>•</span>
              <span>Primary Dr: Dr. Rajesh Varma</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Timeline */}
      <RecoveryTimeline
        data={history}
        loading={loading}
        error={error}
        onRetry={fetchHistory}
      />

      {/* Wound Upload & History */}
      <WoundUpload patientId={user?.patient_profile_id || user?.patient_id} />

      {/* 2 x 2 Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Pain Score Trend (0–10)"
            description="Target: progressive decline below 3/10"
          />
          <CardBody>
            <LineTrend
              data={painHistoryData}
              dataKey="score"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              name="Pain Level"
              unit="/10"
              color="#DC3B3B"
              bands={false}
              loading={loading}
              error={error}
              onRetry={fetchHistory}
              emptyMessage="No pain level records logged yet. Complete a check-in to track pain trends."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Body Temperature Trend (°C)"
            description="Normal clinical range: 36.1°C – 37.2°C"
          />
          <CardBody>
            <LineTrend
              data={tempHistoryData}
              dataKey="score"
              domain={[35, 41]}
              ticks={[35, 36, 37, 38, 39, 40, 41]}
              name="Temperature"
              unit="°C"
              color="#18A7B5"
              bands={false}
              loading={loading}
              error={error}
              onRetry={fetchHistory}
              emptyMessage="No temperature records logged yet. Complete a check-in to track temperature trends."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Medication Adherence (%)"
            description="Weekly prescribed dosage completion rate"
          />
          <CardBody>
            <BarCompare
              data={adherenceData}
              loading={loading}
              error={error}
              onRetry={fetchHistory}
              emptyMessage="No medication adherence records logged yet. Complete a check-in to track adherence."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Calculated Recovery Score History"
            description="Integrated multi-factor recovery index (0–100)"
          />
          <CardBody>
            <LineTrend
              data={scoreHistoryData}
              dataKey="score"
              xAxisKey="day"
              name="Recovery Score"
              color="#1D5FD1"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              bands={true}
              loading={loading}
              error={error}
              onRetry={fetchHistory}
              emptyMessage="No recovery score history available yet. Complete a recovery check-in to begin tracking progress."
            />
          </CardBody>
        </Card>
      </div>

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
                <strong className="text-text">1. Pain Level Penalty</strong>
                <p className="text-2xs text-text-muted">Formula: -4 pts per pain level point (0–10 scale)</p>
              </div>
              <span className="font-bold text-text-secondary text-xs">
                {latestCheckin ? `-${latestCheckin.pain_level * 4} pts` : '-12 pts'}
              </span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">2. Wound Condition Penalty</strong>
                <p className="text-2xs text-text-muted">Normal=0, Mild Redness=-5, Swelling=-15, Discharge=-25, Severe=-40</p>
              </div>
              <span className="font-bold text-text-secondary text-xs">
                {latestCheckin ? `${latestCheckin.wound_condition === 'normal' ? '0 pts' : '-15 pts'}` : '0 pts'}
              </span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">3. Medication Adherence Penalty</strong>
                <p className="text-2xs text-text-muted">All taken=0, Missed some=-10, None taken=-25</p>
              </div>
              <span className="font-bold text-text-secondary text-xs">
                {latestCheckin ? `${latestCheckin.medication_adherence === 'all' ? '0 pts' : '-10 pts'}` : '0 pts'}
              </span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">4. Body Temperature Penalty</strong>
                <p className="text-2xs text-text-muted">&gt;37.5°C = -15 pts; &gt;38.2°C = -25 pts</p>
              </div>
              <span className="font-bold text-text-secondary text-xs">
                {latestCheckin ? `${Number(latestCheckin.temperature) > 37.5 ? '-15 pts' : '0 pts'}` : '0 pts'}
              </span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong className="text-text">5. Symptom Burden Penalty</strong>
                <p className="text-2xs text-text-muted">-5 pts per reported acute symptom</p>
              </div>
              <span className="font-bold text-text-secondary text-xs">
                {latestCheckin && Array.isArray(latestCheckin.symptoms)
                  ? `-${latestCheckin.symptoms.filter(s => s !== 'None of the above').length * 5} pts`
                  : '0 pts'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-primary-tint/60 border border-primary/20 rounded-md text-primary">
            <p className="font-bold text-sm mb-1">
              Current Calculated Score: {latestScore !== null ? `${latestScore} / 100` : 'N/A'}
            </p>
            <p className="text-2xs">
              {latestScore >= 80
                ? 'Categorized as "Good Recovery" (80–100 range).'
                : latestScore >= 50
                ? 'Categorized as "Moderate Concern / Active Monitoring" (50–79 range).'
                : 'Categorized as "Clinical Attention Advised" (0–49 range).'}
            </p>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
