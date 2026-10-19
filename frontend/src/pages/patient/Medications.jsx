import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard, ConfirmDialog } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import { Pill, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import api from '../../services/api'

const DEFAULT_MEDS = [
  { id: 1, name: 'Cefuroxime Axetil', dosage: '500 mg', freq: 'Twice daily', timing: 'Morning & Evening after food', status: 'taken', nextDose: 'Completed for today' },
  { id: 2, name: 'Paracetamol', dosage: '650 mg', freq: 'Thrice daily', timing: 'Every 8 hours as needed', status: 'taken', nextDose: 'Completed for today' },
  { id: 3, name: 'Enoxaparin Sodium (SubQ)', dosage: '40 mg / 0.4 mL', freq: 'Once daily', timing: 'Night at 8:00 PM', status: 'pending', nextDose: 'Today at 8:00 PM' },
  { id: 4, name: 'Pantoprazole', dosage: '40 mg', freq: 'Once daily', timing: 'Morning before breakfast', status: 'taken', nextDose: 'Tomorrow at 7:30 AM' },
]

export default function Medications() {
  const [meds, setMeds] = useState(DEFAULT_MEDS)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, med: null, action: '' })

  // Synchronize with backend API if available while preserving full default list
  useEffect(() => {
    let isMounted = true
    async function fetchMedications() {
      try {
        const res = await api.get('/medications/')
        if (!isMounted) return
        if (Array.isArray(res.data) && res.data.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0]
          const mapped = res.data.map(m => {
            const todayLog = m.logs?.find(l => l.date === todayStr)
            return {
              id: m.id,
              name: m.medicine_name || m.name,
              dosage: m.dosage,
              freq: m.frequency || m.freq || 'Daily',
              timing: m.instructions || m.timing || 'As directed',
              status: todayLog ? todayLog.status : (m.status === 'completed' ? 'taken' : 'pending'),
              nextDose: m.next_dose || m.nextDose || (m.status === 'completed' ? 'Completed for today' : 'Today as scheduled'),
            }
          })
          setMeds(prev => prev.map(p => {
            const match = mapped.find(m => m.name.toLowerCase() === p.name.toLowerCase())
            return match ? { ...p, ...match } : p
          }))
        }
      } catch (err) {
        // Retain initial medications if offline or error
      }
    }
    fetchMedications()
    return () => { isMounted = false }
  }, [])

  const handleAction = (med, action) => {
    setConfirmDialog({ isOpen: true, med, action })
  }

  const confirmAction = async () => {
    const { med, action } = confirmDialog
    if (!med) return
    const newStatus = action === 'taken' ? 'taken' : 'missed'

    // Update state immediately
    setMeds(prev => prev.map(m => m.id === med.id ? { ...m, status: newStatus } : m))
    setConfirmDialog({ isOpen: false, med: null, action: '' })

    // Optional API sync for persistent logging
    try {
      if (med.id) {
        await api.post(`/medications/${med.id}/log/`, { status: newStatus })
      }
    } catch (err) {
      // Graceful fallback for demo or unpersisted items
    }
  }

  const completedCount = meds.filter(m => m.status === 'taken').length
  const pendingCount = meds.filter(m => m.status === 'pending').length
  const missedCount = meds.filter(m => m.status === 'missed').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medication Schedule & Adherence"
        description="Track all your active prescriptions, log daily dosages, and review weekly adherence rates"
      />

      {/* Summary statistic cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Today's Prescriptions"
          value={`${meds.length} active`}
          trend={`${completedCount} completed, ${pendingCount} pending`}
          trendUp={pendingCount === 0}
          icon={Pill}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
          className="h-full flex flex-col justify-between"
        />
        <StatCard
          label="Weekly Adherence Rate"
          value="94%"
          trend="Target: >90%"
          trendUp={true}
          icon={CheckCircle}
          iconBg="bg-success-tint"
          iconColor="text-success"
          className="h-full flex flex-col justify-between"
        />
        <StatCard
          label="Doses Missed (Last 7d)"
          value={`${missedCount > 0 ? missedCount : 1} dose`}
          trend={missedCount > 0 ? "Reported today" : "Reported on Day 4"}
          trendUp={missedCount === 0}
          icon={AlertTriangle}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
          className="h-full flex flex-col justify-between"
        />
      </div>

      {/* Main Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Today's Schedule (8 cols on desktop) */}
        <div className="lg:col-span-8 min-w-0 space-y-4">
          <div className="flex items-center justify-between h-7">
            <h2 className="text-md font-semibold text-text">Today's Medication Doses</h2>
            <span className="text-xs text-text-muted font-medium">{meds.length} scheduled</span>
          </div>

          <div className="space-y-3">
            {meds.map((med) => (
              <Card key={med.id}>
                <CardBody className="p-4 sm:p-5">
                  <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4">
                    {/* Left: Medication Icon vertically centered */}
                    <div className="w-10 h-10 rounded-[8px] bg-primary-tint flex items-center justify-center text-primary flex-shrink-0 self-center">
                      <Pill size={20} />
                    </div>

                    {/* Center: Medication Details */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-sm font-bold text-text break-words">
                          {med.name}
                        </h3>
                        <span className="inline-flex items-center text-xs px-2 py-0.5 bg-surface-muted rounded text-text-secondary font-medium whitespace-nowrap flex-shrink-0">
                          {med.dosage}
                        </span>
                        <div className="flex-shrink-0">
                          <StatusBadge status={med.status} />
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{med.timing}</p>
                      <p className="text-2xs text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Clock size={12} className="flex-shrink-0" />
                        <span>Next schedule: {med.nextDose}</span>
                      </p>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="col-span-2 sm:col-span-1 flex items-center gap-2 w-full sm:w-auto sm:justify-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      {med.status !== 'taken' && (
                        <button
                          type="button"
                          onClick={() => handleAction(med, 'taken')}
                          className="h-8 px-3.5 text-xs font-semibold text-white bg-success hover:bg-success-hover rounded-sm transition-colors shadow-xs whitespace-nowrap inline-flex items-center justify-center flex-1 sm:flex-initial"
                        >
                          Mark Taken
                        </button>
                      )}
                      {med.status !== 'missed' && (
                        <button
                          type="button"
                          onClick={() => handleAction(med, 'missed')}
                          className="h-8 px-3.5 text-xs font-medium text-danger border border-danger/30 hover:bg-danger-tint rounded-sm transition-colors whitespace-nowrap inline-flex items-center justify-center flex-1 sm:flex-initial"
                        >
                          Report Missed
                        </button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* 7-Day Adherence Chart (4 cols on desktop) */}
        <div className="lg:col-span-4 min-w-0 space-y-4">
          <div className="flex items-center justify-between h-7">
            <h2 className="text-md font-semibold text-text">Adherence Overview</h2>
            <span className="text-xs font-medium text-success bg-success-tint px-2 py-0.5 rounded-full">
              Target: &gt;90%
            </span>
          </div>

          <Card className="h-full">
            <CardHeader
              title="7-Day Adherence Pattern"
              description="Daily completed dosage percentage"
            />
            <CardBody className="p-5">
              <BarCompare />
              <p className="text-2xs text-text-muted mt-3 text-center leading-relaxed">
                Maintaining &gt;90% adherence significantly accelerates healing and prevents wound infection.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, med: null, action: '' })}
        onConfirm={confirmAction}
        title={confirmDialog.action === 'taken' ? 'Record Medication Dose as Taken' : 'Report Missed Medication Dose'}
        description={`Confirm updating ${confirmDialog.med?.name} (${confirmDialog.med?.dosage}) status to "${confirmDialog.action}"?`}
        confirmLabel={confirmDialog.action === 'taken' ? 'Confirm Taken' : 'Report Missed'}
        variant={confirmDialog.action === 'taken' ? 'warning' : 'danger'}
      />
    </div>
  )
}
