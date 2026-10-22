import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardHeader, CardBody } from '../../components/ui/index.jsx'
import { Save, RefreshCw, CheckCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const SETTINGS_KEY = 'postcare_admin_clinical_settings'

const DEFAULT_SETTINGS = {
  highRiskThreshold: 50,
  medAdherenceTarget: 90,
  emailAlerts: true,
  smsAlerts: true,
  autoDischargeSummary: true,
}

export default function AdminSettings() {
  const [highRiskThreshold, setHighRiskThreshold] = useState(DEFAULT_SETTINGS.highRiskThreshold)
  const [medAdherenceTarget, setMedAdherenceTarget] = useState(DEFAULT_SETTINGS.medAdherenceTarget)
  const [emailAlerts, setEmailAlerts] = useState(DEFAULT_SETTINGS.emailAlerts)
  const [smsAlerts, setSmsAlerts] = useState(DEFAULT_SETTINGS.smsAlerts)
  const [autoDischargeSummary, setAutoDischargeSummary] = useState(DEFAULT_SETTINGS.autoDischargeSummary)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.highRiskThreshold != null) setHighRiskThreshold(parsed.highRiskThreshold)
        if (parsed.medAdherenceTarget != null) setMedAdherenceTarget(parsed.medAdherenceTarget)
        if (parsed.emailAlerts != null) setEmailAlerts(parsed.emailAlerts)
        if (parsed.smsAlerts != null) setSmsAlerts(parsed.smsAlerts)
        if (parsed.autoDischargeSummary != null) setAutoDischargeSummary(parsed.autoDischargeSummary)
      }
    } catch {
      // Fallback to defaults
    }
  }, [])

  const handleSave = (e) => {
    e.preventDefault()

    if (highRiskThreshold < 0 || highRiskThreshold > 100) {
      toast.error('Risk escalation threshold must be between 0 and 100')
      return
    }

    if (medAdherenceTarget < 0 || medAdherenceTarget > 100) {
      toast.error('Medication adherence goal must be between 0 and 100')
      return
    }

    setSaving(true)
    setTimeout(() => {
      try {
        const config = {
          highRiskThreshold,
          medAdherenceTarget,
          emailAlerts,
          smsAlerts,
          autoDischargeSummary,
          updatedAt: new Date().toISOString()
        }
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(config))
        toast.success('Clinical governance configuration saved successfully')
      } catch (err) {
        toast.error('Failed to save configuration')
      } finally {
        setSaving(false)
      }
    }, 300)
  }

  const handleReset = () => {
    setHighRiskThreshold(DEFAULT_SETTINGS.highRiskThreshold)
    setMedAdherenceTarget(DEFAULT_SETTINGS.medAdherenceTarget)
    setEmailAlerts(DEFAULT_SETTINGS.emailAlerts)
    setSmsAlerts(DEFAULT_SETTINGS.smsAlerts)
    setAutoDischargeSummary(DEFAULT_SETTINGS.autoDischargeSummary)
    localStorage.removeItem(SETTINGS_KEY)
    toast.info('Settings restored to hospital clinical defaults')
  }

  return (
    <div className="max-w-form mx-auto space-y-6">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader title="AI Risk Engine & Alert Thresholds" />
        <CardBody>
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-text mb-1">
                High Risk Escalation Score Cut-Off (0–100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={highRiskThreshold}
                onChange={(e) => setHighRiskThreshold(Number(e.target.value))}
                className="w-full sm:w-48 p-2 text-xs bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-text"
              />
            </div>

            <div>
              <label className="block font-medium text-text mb-1">
                Target Medication Adherence Goal (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={medAdherenceTarget}
                onChange={(e) => setMedAdherenceTarget(Number(e.target.value))}
                className="w-full sm:w-48 p-2 text-xs bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-text"
              />
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <div>
                <strong className="text-text block">Automated Clinical Notifications</strong>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border"
              />
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <div>
                <strong className="text-text block">Urgent SMS Patient Escalation</strong>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border"
              />
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <div>
                <strong className="text-text block">Automated Discharge Summaries</strong>
              </div>
              <input
                type="checkbox"
                checked={autoDischargeSummary}
                onChange={(e) => setAutoDischargeSummary(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border"
              />
            </div>

            <div className="pt-4 flex items-center gap-2 border-t border-border">
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-9 px-3 border border-border text-text hover:bg-surface-muted text-xs font-medium rounded transition-colors flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
