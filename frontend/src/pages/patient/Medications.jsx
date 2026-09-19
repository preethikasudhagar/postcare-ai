import React, { useState } from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard, Modal, ConfirmDialog } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import BarCompare from '../../charts/BarCompare.jsx'
import { Pill, CheckCircle, Clock, AlertTriangle, AlertCircle, Plus } from 'lucide-react'

export default function Medications() {
  const [meds, setMeds] = useState([
    { id: 1, name: 'Cefuroxime Axetil', dosage: '500 mg', freq: 'Twice daily', timing: 'Morning & Evening after food', status: 'taken', nextDose: 'Completed for today' },
    { id: 2, name: 'Paracetamol', dosage: '650 mg', freq: 'Thrice daily', timing: 'Every 8 hours as needed', status: 'taken', nextDose: 'Completed for today' },
    { id: 3, name: 'Enoxaparin Sodium (SubQ)', dosage: '40 mg / 0.4 mL', freq: 'Once daily', timing: 'Night at 8:00 PM', status: 'pending', nextDose: 'Today at 8:00 PM' },
    { id: 4, name: 'Pantoprazole', dosage: '40 mg', freq: 'Once daily', timing: 'Morning before breakfast', status: 'taken', nextDose: 'Tomorrow at 7:30 AM' },
  ])

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, med: null, action: '' })

  const handleAction = (med, action) => {
    setConfirmDialog({ isOpen: true, med, action })
  }

  const confirmAction = () => {
    const { med, action } = confirmDialog
    setMeds(meds.map(m => m.id === med.id ? { ...m, status: action === 'taken' ? 'taken' : 'missed' } : m))
    setConfirmDialog({ isOpen: false, med: null, action: '' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medication Schedule & Adherence"
        description="Track all your active prescriptions, log daily dosages, and review weekly adherence rates"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Today's Prescriptions"
          value="4 active"
          trend="3 completed, 1 pending"
          trendUp={true}
          icon={Pill}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Weekly Adherence Rate"
          value="94%"
          trend="Target: >90%"
          trendUp={true}
          icon={CheckCircle}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="Doses Missed (Last 7d)"
          value="1 dose"
          trend="Reported on Day 4"
          trendUp={false}
          icon={AlertTriangle}
          iconBg="bg-warning-tint"
          iconColor="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Schedule (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-md font-semibold text-text">Today's Medication Doses</h2>
          <div className="space-y-3">
            {meds.map((med) => (
              <Card key={med.id}>
                <CardBody>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[8px] bg-primary-tint flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                        <Pill size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-text">{med.name}</h3>
                          <span className="text-xs px-2 py-0.5 bg-surface-muted rounded text-text-secondary font-medium">
                            {med.dosage}
                          </span>
                          <StatusBadge status={med.status} />
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{med.timing}</p>
                        <p className="text-2xs text-text-muted mt-0.5 flex items-center gap-1">
                          <Clock size={11} /> Next schedule: {med.nextDose}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {med.status !== 'taken' && (
                        <button
                          onClick={() => handleAction(med, 'taken')}
                          className="h-8 px-3 text-xs font-semibold text-white bg-success hover:bg-success-hover rounded-sm transition-colors shadow-xs"
                        >
                          Mark Taken
                        </button>
                      )}
                      {med.status !== 'missed' && (
                        <button
                          onClick={() => handleAction(med, 'missed')}
                          className="h-8 px-3 text-xs font-medium text-danger border border-danger/30 hover:bg-danger-tint rounded-sm transition-colors"
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

        {/* 7-Day Adherence Chart (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader
              title="7-Day Adherence Pattern"
              description="Daily completed dosage percentage"
            />
            <CardBody>
              <BarCompare />
              <p className="text-2xs text-text-muted mt-3 text-center">
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
