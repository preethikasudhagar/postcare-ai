import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardBody, StatCard, Modal } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import { Calendar, Clock, CheckCircle, AlertTriangle, User, RefreshCw, Check, X, ShieldAlert } from 'lucide-react'
import api from '../../services/api'

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  try {
    const parts = String(dateStr).split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return ''
  try {
    const s = String(timeStr).trim()
    if (s.toLowerCase().includes('am') || s.toLowerCase().includes('pm')) {
      return s
    }
    const parts = s.split(':')
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10)
      const minutes = parts[1]
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 || 12
      return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`
    }
    return timeStr
  } catch {
    return timeStr
  }
}

const DEFAULT_DOCTOR_APPOINTMENTS = [
  { id: 1, patient: 'Ramesh Patel', uhid: 'P-107', time: '10:00 AM', date: 'Today', type: 'Staple Removal', status: 'completed' },
  { id: 2, patient: 'Deepa Krishnan', uhid: 'P-105', time: '11:30 AM', date: 'Today', type: 'Incision Inspection', status: 'upcoming' },
  { id: 3, patient: 'Sanjay Deshmukh', uhid: 'P-112', time: '02:00 PM', date: 'Today', type: 'Pain Medication Adjustment', status: 'upcoming' },
  { id: 4, patient: 'Rahul Kumar', uhid: 'P-102', time: '10:30 AM', date: '24 Sep 2026', type: 'Post-Op Day 20 Review', status: 'upcoming' },
  { id: 5, patient: 'Vikram Mehta', uhid: 'P-101', time: '04:00 PM', date: '25 Sep 2026', type: 'Cardiac Suture Check', status: 'upcoming' },
]

export default function DoctorFollowUps() {
  const [appointments, setAppointments] = useState(DEFAULT_DOCTOR_APPOINTMENTS)
  const [tabFilter, setTabFilter] = useState('all')
  const [successBanner, setSuccessBanner] = useState('')

  // Review Modal State
  const [reviewApt, setReviewApt] = useState(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/follow-ups/')
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((item) => ({
          id: item.id,
          patient: item.patient_name || 'Patient',
          uhid: item.patient_uhid || `PAT-${item.patient || item.id}`,
          date: formatDateDisplay(item.appointment_date),
          raw_date: item.appointment_date,
          time: formatTimeDisplay(item.appointment_time),
          raw_time: item.appointment_time,
          type: item.purpose || 'Follow-up Consultation',
          status: item.status,
          reschedule_requested: Boolean(item.reschedule_requested),
          reschedule_date: item.reschedule_date,
          reschedule_time: item.reschedule_time,
          reschedule_reason: item.reschedule_reason,
          notes: item.notes,
        }))
        setAppointments(mapped)
      }
    } catch {
      // Fallback
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const handleOpenReview = (apt) => {
    setReviewApt(apt)
    setReviewNote('')
    setReviewError('')
    setIsReviewOpen(true)
  }

  const handleCloseReview = () => {
    setIsReviewOpen(false)
    setReviewApt(null)
    setReviewNote('')
    setReviewError('')
  }

  const handleReviewAction = async (action) => {
    if (!reviewApt) return
    setReviewError('')
    setSubmitting(true)

    try {
      const res = await api.post(`/follow-ups/${reviewApt.id}/review-reschedule/`, {
        action,
        note: reviewNote.trim(),
      })

      if (res.data) {
        const actionLabel = action === 'approve' ? 'approved' : 'declined'
        setSuccessBanner(
          `Reschedule request for ${reviewApt.patient} was successfully ${actionLabel}. The patient has been notified.`
        )
        handleCloseReview()
        fetchAppointments()
        setTimeout(() => setSuccessBanner(''), 8000)
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        `Failed to ${action} reschedule request. Please try again.`
      setReviewError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const pendingRequests = appointments.filter(
    (a) => a.reschedule_requested || a.status === 'reschedule_requested'
  )

  const filteredAppointments = appointments.filter((a) => {
    if (tabFilter === 'pending') {
      return a.reschedule_requested || a.status === 'reschedule_requested'
    }
    if (tabFilter === 'upcoming') {
      return a.status === 'upcoming' || a.status === 'rescheduled'
    }
    if (tabFilter === 'completed') {
      return a.status === 'completed'
    }
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Follow-Up Consultations" />

      {/* Success Notification */}
      {successBanner && (
        <div className="flex items-start gap-3 p-4 bg-success-tint border border-success/30 rounded-xl text-success shadow-xs animate-fadeIn">
          <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-xs font-medium">
            <p className="font-semibold text-sm">Reschedule Request Handled</p>
            <p className="mt-0.5 text-text-secondary">{successBanner}</p>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            className="text-text-muted hover:text-text text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pending Reschedule Alert Pill if any pending */}
      {pendingRequests.length > 0 && (
        <div className="p-3 bg-warning-tint/70 border border-warning/40 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-warning font-semibold">
            <AlertTriangle size={16} />
            <span>
              {pendingRequests.length} pending reschedule request{pendingRequests.length > 1 ? 's' : ''} awaiting your clinical review.
            </span>
          </div>
          <button
            onClick={() => setTabFilter('pending')}
            className="px-2.5 py-1 text-xs font-semibold bg-warning text-white rounded-md hover:bg-warning/90 transition-colors cursor-pointer"
          >
            View Requests
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Today's Appointments"
          value={`${appointments.filter((a) => a.status === 'upcoming').length} pending`}
          trend={`${appointments.filter((a) => a.status === 'completed').length} completed`}
          trendUp={true}
          icon={Calendar}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Reschedule Requests"
          value={`${pendingRequests.length} pending`}
          trend={pendingRequests.length > 0 ? "Requires review" : "Up to date"}
          trendUp={pendingRequests.length === 0}
          icon={Clock}
          iconBg={pendingRequests.length > 0 ? "bg-warning-tint" : "bg-secondary-tint"}
          iconColor={pendingRequests.length > 0 ? "text-warning" : "text-secondary"}
        />
        <StatCard
          label="Completion Rate"
          value="96%"
          trend="High adherence"
          trendUp={true}
          icon={CheckCircle}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          {/* Filter Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border text-xs">
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All Consultations' },
                {
                  id: 'pending',
                  label: `Reschedule Requests ${pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}`,
                },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTabFilter(t.id)}
                  className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                    tabFilter === t.id
                      ? 'bg-primary text-white font-semibold'
                      : 'text-text-secondary hover:bg-surface-muted'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchAppointments}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors cursor-pointer"
              title="Refresh followups"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Time & Date</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Consultation Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-text-muted">
                      No consultations found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((a) => {
                    const isPending =
                      a.reschedule_requested || a.status === 'reschedule_requested'

                    return (
                      <tr key={a.id} className="hover:bg-surface-muted/60 transition-colors">
                        <td className="p-3">
                          <strong className="block text-primary font-bold">{a.time}</strong>
                          <span className="text-2xs text-text-muted">{a.date}</span>
                          {isPending && (
                            <span className="block mt-1 text-2xs font-semibold text-warning">
                              Req: {formatDateDisplay(a.reschedule_date)} @ {formatTimeDisplay(a.reschedule_time)}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <strong className="block text-text">{a.patient}</strong>
                          <span className="text-2xs text-text-muted">{a.uhid}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-text-secondary font-medium">{a.type}</span>
                          {isPending && a.reschedule_reason && (
                            <p className="text-2xs text-text-muted italic truncate max-w-xs mt-0.5">
                              "{a.reschedule_reason}"
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="p-3 text-right">
                          {isPending ? (
                            <button
                              onClick={() => handleOpenReview(a)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-warning hover:bg-warning/90 rounded transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Clock size={12} /> Review Request
                            </button>
                          ) : (
                            <button className="px-2.5 py-1 text-xs font-medium text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors cursor-pointer">
                              Manage
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Doctor Review Reschedule Modal */}
      {reviewApt && (
        <Modal
          isOpen={isReviewOpen}
          onClose={handleCloseReview}
          title="Review Reschedule Request"
          subtitle={`Patient: ${reviewApt.patient} (${reviewApt.uhid})`}
          size="md"
        >
          <div className="space-y-4">
            {/* Consultation Summary */}
            <div className="p-3.5 bg-surface-muted border border-border rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text">{reviewApt.type}</span>
                <StatusBadge status={reviewApt.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                <div>
                  <span className="text-text-muted block text-2xs uppercase tracking-wide">
                    Current Scheduled Time
                  </span>
                  <span className="font-semibold text-text">
                    {reviewApt.date} · {reviewApt.time}
                  </span>
                </div>
                <div>
                  <span className="text-warning block text-2xs uppercase tracking-wide font-bold">
                    Requested New Slot
                  </span>
                  <span className="font-bold text-text">
                    {formatDateDisplay(reviewApt.reschedule_date)} · {formatTimeDisplay(reviewApt.reschedule_time)}
                  </span>
                </div>
              </div>

              {reviewApt.reschedule_reason && (
                <div className="pt-2 border-t border-border">
                  <span className="text-text-muted block text-2xs uppercase">Patient Reason:</span>
                  <p className="text-text font-medium italic mt-0.5">"{reviewApt.reschedule_reason}"</p>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {reviewError && (
              <div className="flex items-start gap-2.5 p-3 bg-danger-tint border border-danger/30 rounded-lg text-danger text-xs animate-fadeIn">
                <ShieldAlert size={15} className="mt-0.5 flex-shrink-0" />
                <span className="font-medium break-words">{reviewError}</span>
              </div>
            )}

            {/* Doctor Note / Reason */}
            <div>
              <label htmlFor="review-note" className="block text-xs font-semibold text-text mb-1.5">
                Clinical Note / Decision Remarks <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              <textarea
                id="review-note"
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a remark for the patient or clinic staff..."
                className="w-full p-2.5 text-xs bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
              <button
                type="button"
                onClick={handleCloseReview}
                disabled={submitting}
                className="h-9 px-3.5 text-xs font-medium text-text border border-border-strong hover:bg-surface-muted rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReviewAction('reject')}
                  disabled={submitting}
                  className="h-9 px-3.5 text-xs font-semibold text-danger border border-danger/30 bg-danger-tint hover:bg-danger hover:text-white rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <X size={13} /> Decline Request
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewAction('approve')}
                  disabled={submitting}
                  className="h-9 px-4 text-xs font-semibold text-white bg-success hover:bg-success/90 active:scale-[0.99] rounded-lg transition-all duration-150 flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Approve Reschedule
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
