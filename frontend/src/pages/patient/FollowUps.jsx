import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardBody, StatCard, Modal } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import { Calendar, Clock, MapPin, User, CheckCircle2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import api from '../../services/api'

// Clinic OPD standard consultation slots
const CLINIC_TIME_SLOTS = [
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
]

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

function getTomorrowDateString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yyyy = tomorrow.getFullYear()
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const dd = String(tomorrow.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const DEFAULT_APPOINTMENTS = [
  {
    id: 1,
    title: 'Staple Removal & Incision Review',
    purpose: 'Clinical evaluation of surgical incision healing, removal of orthopedic staples, and gait assessment.',
    doctor: 'Dr. Rajesh Varma',
    dept: 'Department of Orthopedic Surgery',
    date: '24 Sep 2026',
    raw_date: '2026-09-24',
    time: '10:30 AM',
    raw_time: '10:30:00',
    location: 'OPD Block B · Room 304',
    status: 'upcoming',
    reschedule_requested: false,
    reschedule_date: null,
    reschedule_time: null,
    reschedule_reason: '',
  },
  {
    id: 2,
    title: 'Physiotherapy Range-of-Motion Evaluation',
    purpose: 'Goniometric knee flexion measurement, quadriceps strengthening progression, and active load monitoring.',
    doctor: 'Dr. Ananya Iyer (PT)',
    dept: 'Rehabilitation & Physical Therapy',
    date: '02 Oct 2026',
    raw_date: '2026-10-02',
    time: '02:00 PM',
    raw_time: '14:00:00',
    location: 'Physio Gym · Ground Floor',
    status: 'upcoming',
    reschedule_requested: false,
    reschedule_date: null,
    reschedule_time: null,
    reschedule_reason: '',
  },
  {
    id: 3,
    title: 'Initial Post-Discharge Virtual Check-in',
    purpose: 'Initial review of early recovery milestones, pain control, and DVT prophylaxis adherence.',
    doctor: 'Dr. Rajesh Varma',
    dept: 'Orthopedics Telehealth',
    date: '10 Sep 2026',
    raw_date: '2026-09-10',
    time: '11:00 AM',
    raw_time: '11:00:00',
    location: 'Video Consultation',
    status: 'completed',
    reschedule_requested: false,
    reschedule_date: null,
    reschedule_time: null,
    reschedule_reason: '',
  }
]

export default function FollowUps() {
  const [appointments, setAppointments] = useState(DEFAULT_APPOINTMENTS)
  const [loading, setLoading] = useState(false)
  const [successBanner, setSuccessBanner] = useState('')

  // Reschedule Modal State
  const [selectedApt, setSelectedApt] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formReason, setFormReason] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch follow-ups from backend API
  const fetchAppointments = async () => {
    try {
      const res = await api.get('/follow-ups/')
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((item) => ({
          id: item.id,
          title: item.purpose || 'Follow-up Consultation',
          purpose: item.purpose || 'Post-operative clinical follow-up and evaluation.',
          doctor: item.doctor_name || 'Attending Physician',
          dept: item.department ? `Department of ${item.department}` : 'Orthopedic Surgery',
          date: formatDateDisplay(item.appointment_date),
          raw_date: item.appointment_date,
          time: formatTimeDisplay(item.appointment_time),
          raw_time: item.appointment_time,
          location: item.department ? `OPD · ${item.department}` : 'OPD Block B · Room 304',
          status: item.status,
          notes: item.notes,
          reschedule_requested: Boolean(item.reschedule_requested),
          reschedule_date: item.reschedule_date,
          reschedule_time: item.reschedule_time,
          reschedule_reason: item.reschedule_reason || '',
        }))
        setAppointments(mapped)
      }
    } catch {
      // Retain fallback data if network/api is unavailable
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  // Open Reschedule Modal
  const handleOpenReschedule = (apt) => {
    // Only allow for appointments that are not completed or cancelled or already pending
    if (apt.status === 'completed' || apt.status === 'cancelled') return
    if (apt.reschedule_requested || apt.status === 'reschedule_requested') return

    setSelectedApt(apt)
    setFormDate('')
    setFormTime('')
    setFormReason('')
    setValidationErrors({})
    setServerError('')
    setIsModalOpen(true)
  }

  // Close Reschedule Modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedApt(null)
    setValidationErrors({})
    setServerError('')
  }

  // Form Validation
  const validateForm = () => {
    const errors = {}
    if (!formDate || !formDate.trim()) {
      errors.date = 'Requested new date is required.'
    } else {
      const selected = new Date(formDate + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selected < today) {
        errors.date = 'Requested date cannot be in the past.'
      }
    }

    if (!formTime || !formTime.trim()) {
      errors.time = 'Requested consultation time is required.'
    }

    // Check if requested slot matches current scheduled slot
    if (selectedApt && formDate && formTime) {
      const currDate = selectedApt.raw_date || ''
      const currTimeFormatted = formatTimeDisplay(selectedApt.raw_time)
      const newTimeFormatted = formatTimeDisplay(formTime)

      if (currDate === formDate && currTimeFormatted === newTimeFormatted) {
        errors.time = 'Requested slot matches the currently scheduled appointment. Please choose a different date or time.'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit Reschedule Request
  const handleSubmitReschedule = async (e) => {
    e.preventDefault()
    setServerError('')

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        reschedule_date: formDate,
        reschedule_time: formTime,
        reschedule_reason: formReason.trim(),
      }

      const res = await api.post(`/follow-ups/${selectedApt.id}/request-reschedule/`, payload)

      if (res.data) {
        // Update local appointments list immediately
        setAppointments((prev) =>
          prev.map((item) =>
            item.id === selectedApt.id
              ? {
                  ...item,
                  status: 'reschedule_requested',
                  reschedule_requested: true,
                  reschedule_date: formDate,
                  reschedule_time: formTime,
                  reschedule_reason: formReason.trim(),
                }
              : item
          )
        )

        setSuccessBanner(
          `Reschedule request submitted successfully for ${formatDateDisplay(formDate)} at ${formatTimeDisplay(formTime)}. Your doctor will review this request.`
        )
        handleCloseModal()
        // Auto-clear banner after 8 seconds
        setTimeout(() => setSuccessBanner(''), 8000)
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to submit reschedule request. Please check your connection and try again.'
      setServerError(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate dynamic stats
  const upcomingCount = appointments.filter(
    (a) => a.status === 'upcoming' || a.status === 'reschedule_requested' || a.status === 'rescheduled'
  ).length

  const completedCount = appointments.filter((a) => a.status === 'completed').length
  const rescheduledCount = appointments.filter((a) => a.status === 'rescheduled').length

  const nextUpcoming = appointments.find(
    (a) => a.status === 'upcoming' || a.status === 'reschedule_requested' || a.status === 'rescheduled'
  )

  const minPickerDate = getTomorrowDateString()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-Up Consultations & Appointments"
        description="Track your scheduled clinical consultations, post-operative assessments, and physiotherapy reviews"
      />

      {/* Success Banner */}
      {successBanner && (
        <div className="flex items-start gap-3 p-4 bg-success-tint border border-success/30 rounded-xl text-success shadow-xs animate-fadeIn">
          <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-xs font-medium">
            <p className="font-semibold text-sm">Reschedule Request Submitted</p>
            <p className="mt-0.5 text-text-secondary">{successBanner}</p>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            className="text-text-muted hover:text-text text-xs p-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Upcoming Consultations"
          value={`${upcomingCount} scheduled`}
          trend={nextUpcoming ? `Next: ${nextUpcoming.date}` : 'All caught up'}
          trendUp={true}
          icon={Calendar}
          iconBg="bg-primary-tint"
          iconColor="text-primary"
        />
        <StatCard
          label="Completed Follow-Ups"
          value={`${completedCount} session${completedCount === 1 ? '' : 's'}`}
          trend="Clinical compliance on track"
          trendUp={true}
          icon={CheckCircle2}
          iconBg="bg-success-tint"
          iconColor="text-success"
        />
        <StatCard
          label="Rescheduled Consultations"
          value={`${rescheduledCount} confirmed`}
          trend="Coordinated with care team"
          trendUp={true}
          icon={Clock}
          iconBg="bg-secondary-tint"
          iconColor="text-secondary"
        />
      </div>

      {/* Appointment Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-md font-semibold text-text">Your Scheduled Appointments</h2>
          <button
            onClick={fetchAppointments}
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors"
            title="Refresh appointments"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {appointments.map((apt) => {
            const isPendingReschedule =
              apt.reschedule_requested || apt.status === 'reschedule_requested'
            const isCompleted = apt.status === 'completed'
            const isCancelled = apt.status === 'cancelled'
            const isRescheduled = apt.status === 'rescheduled'

            return (
              <Card key={apt.id}>
                <CardBody>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-sm font-bold text-text">{apt.title}</h3>
                        <StatusBadge status={apt.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                        <span className="flex items-center gap-1.5 font-semibold text-primary">
                          <Calendar size={13} /> {apt.date}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-text">
                          <Clock size={13} /> {apt.time}
                        </span>
                        <span className="flex items-center gap-1.5 text-text-muted">
                          <User size={13} /> {apt.doctor} ({apt.dept})
                        </span>
                        <span className="flex items-center gap-1.5 text-text-muted">
                          <MapPin size={13} /> {apt.location}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted mt-1 leading-relaxed">{apt.purpose}</p>

                      {/* Reschedule Requested Status Banner */}
                      {isPendingReschedule && (
                        <div className="mt-3 p-3 bg-warning-tint/70 border border-warning/30 rounded-lg flex items-start gap-2.5 animate-fadeIn">
                          <Clock size={15} className="text-warning mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-text">
                            <p className="font-semibold text-warning">
                              Reschedule Request Pending Doctor Review
                            </p>
                            <p className="text-text-secondary mt-0.5">
                              Requested Slot:{' '}
                              <strong className="text-text">
                                {formatDateDisplay(apt.reschedule_date)} at{' '}
                                {formatTimeDisplay(apt.reschedule_time)}
                              </strong>
                            </p>
                            {apt.reschedule_reason && (
                              <p className="text-text-muted mt-1 italic">
                                "{apt.reschedule_reason}"
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rescheduled Confirmed Notice */}
                      {isRescheduled && (
                        <div className="mt-2.5 p-2.5 bg-secondary-tint/40 border border-secondary/20 rounded-lg flex items-center gap-2 text-xs text-text-secondary">
                          <CheckCircle2 size={14} className="text-secondary flex-shrink-0" />
                          <span>
                            Appointment rescheduled with doctor approval. Please attend at the updated time above.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                      {isPendingReschedule ? (
                        <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-warning bg-warning-tint/50 border border-warning/30 rounded-sm">
                          <Clock size={12} /> Reschedule Pending
                        </span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                          <CheckCircle2 size={13} /> Completed
                        </span>
                      ) : isCancelled ? (
                        <span className="text-xs text-text-muted font-medium">Cancelled</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReschedule(apt)}
                          className="h-8 px-3 text-xs font-medium text-text border border-border-strong hover:bg-surface-muted hover:border-primary rounded-sm transition-all duration-150 flex items-center gap-1.5 shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer active:scale-[0.98]"
                        >
                          <Clock size={13} className="text-text-muted" />
                          Request Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Reschedule Request Modal */}
      {selectedApt && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Request Appointment Reschedule"
          subtitle="Submit a preferred date and time for your doctor to review"
          size="md"
        >
          <form onSubmit={handleSubmitReschedule} className="space-y-4">
            {/* Current Appointment Summary Card */}
            <div className="p-3.5 bg-surface-muted border border-border rounded-lg space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text">{selectedApt.title}</span>
                <StatusBadge status={selectedApt.status} />
              </div>
              <p className="text-text-secondary">
                <span className="text-text-muted">Doctor:</span> {selectedApt.doctor}
              </p>
              <div className="flex items-center gap-4 text-text-secondary">
                <span>
                  <strong className="text-text">Current Date:</strong> {selectedApt.date}
                </span>
                <span>
                  <strong className="text-text">Time:</strong> {selectedApt.time}
                </span>
              </div>
            </div>

            {/* Server Error Alert Banner */}
            {serverError && (
              <div className="flex items-start gap-2.5 p-3 bg-danger-tint border border-danger/30 rounded-lg text-danger text-xs animate-fadeIn">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span className="font-medium break-words">{serverError}</span>
              </div>
            )}

            {/* Date Picker */}
            <div>
              <label htmlFor="reschedule-date" className="block text-xs font-semibold text-text mb-1.5">
                Requested New Date <span className="text-danger">*</span>
              </label>
              <input
                id="reschedule-date"
                type="date"
                min={minPickerDate}
                value={formDate}
                onChange={(e) => {
                  setFormDate(e.target.value)
                  if (validationErrors.date) {
                    setValidationErrors((v) => ({ ...v, date: null }))
                  }
                  if (serverError) setServerError('')
                }}
                required
                className={`w-full h-10 px-3 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                  validationErrors.date ? 'border-danger focus:ring-danger' : 'border-border-strong'
                }`}
              />
              {validationErrors.date && (
                <p className="text-xs text-danger font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {validationErrors.date}
                </p>
              )}
            </div>

            {/* Time Slot Selector */}
            <div>
              <label htmlFor="reschedule-time" className="block text-xs font-semibold text-text mb-1.5">
                Requested Consultation Time <span className="text-danger">*</span>
              </label>
              <select
                id="reschedule-time"
                value={formTime}
                onChange={(e) => {
                  setFormTime(e.target.value)
                  if (validationErrors.time) {
                    setValidationErrors((v) => ({ ...v, time: null }))
                  }
                  if (serverError) setServerError('')
                }}
                required
                className={`w-full h-10 px-3 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer ${
                  validationErrors.time ? 'border-danger focus:ring-danger' : 'border-border-strong'
                }`}
              >
                <option value="">Select an available OPD clinic slot</option>
                {CLINIC_TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label} (Clinic OPD)
                  </option>
                ))}
              </select>
              {validationErrors.time && (
                <p className="text-xs text-danger font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {validationErrors.time}
                </p>
              )}
            </div>

            {/* Reason for Rescheduling */}
            <div>
              <label htmlFor="reschedule-reason" className="block text-xs font-semibold text-text mb-1.5">
                Reason for Rescheduling <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              <textarea
                id="reschedule-reason"
                rows={3}
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="Let your doctor know the reason (e.g., transport availability, work conflict, caregiver assistance)..."
                className="w-full p-3 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                className="h-9 px-4 text-xs font-medium text-text border border-border-strong hover:bg-surface-muted rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:scale-[0.99] rounded-lg transition-all duration-150 flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {submitting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Submit Request
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
