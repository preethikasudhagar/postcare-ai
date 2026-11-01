import React, { useState } from 'react'
import { Modal } from '../ui/index.jsx'
import { 
  CheckCircle, AlertTriangle, MessageSquare, Camera, ArrowUpRight, 
  ShieldAlert, User, Calendar, Stethoscope, Pill, Eye, ChevronRight,
  TrendingUp, TrendingDown, Minus, Clock, FileText, Check
} from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const cn = (...a) => twMerge(clsx(...a))

export default function WoundReviewModal({
  isOpen,
  onClose,
  wound,
  onActionComplete
}) {
  const [activeTab, setActiveTab] = useState('clinical_review') // 'clinical_review' | 'comparison' | 'observations'
  const [submitting, setSubmitting] = useState(false)
  
  // Doctor form state
  const [comments, setComments] = useState(wound?.doctor_comments || '')
  const [approvedInstructions, setApprovedInstructions] = useState(
    wound?.doctor_approved_instructions || ''
  )
  const [imageRequestReason, setImageRequestReason] = useState('')
  const [showImageRequestInput, setShowImageRequestInput] = useState(false)
  const [escalationNotes, setEscalationNotes] = useState('')
  const [showEscalationInput, setShowEscalationInput] = useState(false)

  // Comparison image state
  const [selectedComparisonImage, setSelectedComparisonImage] = useState(
    wound?.previous_images && wound.previous_images.length > 0 ? wound.previous_images[0] : null
  )

  if (!wound) return null

  const obs = wound.ai_observations || {}
  const recs = wound.generated_recommendations || {}
  const vitals = wound.latest_vitals || {}

  const handleAction = async (actionType, extraData = {}) => {
    setSubmitting(true)
    try {
      const payload = {
        action: actionType,
        comments: comments.trim(),
        approved_instructions: approvedInstructions.trim(),
        ...extraData
      }
      const res = await api.post(`/recovery/wounds/${wound.id}/doctor-action/`, payload)
      toast.success(res.data?.message || 'Clinical action recorded successfully.')
      if (onActionComplete) {
        onActionComplete(res.data?.wound || wound)
      }
      onClose()
    } catch (err) {
      console.error('Doctor action error:', err)
      const msg = err.response?.data?.error || err.message || 'Failed to execute clinical action.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = () => {
    // If doctor hasn't written custom instructions, provide default approved endorsement
    const finalInstructions = approvedInstructions.trim() || 
      `Approved: Continue routine recovery care as outlined in the generated post-operative guidance. Keep incision clean and dry.`
    handleAction('approve', { approved_instructions: finalInstructions })
  }

  const handleModify = () => {
    if (!approvedInstructions.trim()) {
      toast.error('Please enter the modified doctor instructions before saving.')
      return
    }
    handleAction('modify', { approved_instructions: approvedInstructions.trim() })
  }

  const handleRequestImageSubmit = () => {
    if (!imageRequestReason.trim()) {
      toast.error('Please enter a clinical reason for requesting another image.')
      return
    }
    handleAction('request_image', { reason: imageRequestReason.trim() })
  }

  const handleEscalateSubmit = () => {
    handleAction('escalate', { notes: escalationNotes.trim() })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clinical Wound Image Review"
      subtitle={`${wound.patient_name || 'Patient'} (${wound.patient_uhid || wound.patient_id}) · ${wound.surgery_details || 'Post-Op'} · Day ${wound.recovery_day || 1}`}
      size="xl"
    >
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {/* Urgent Alert Banner */}
        {wound.is_urgent && (
          <div className="p-3.5 bg-danger-tint border-l-4 border-l-danger border border-danger/30 rounded-lg flex items-start gap-3">
            <ShieldAlert className="text-danger flex-shrink-0 mt-0.5" size={18} />
            <div className="text-xs">
              <h4 className="font-bold text-danger uppercase tracking-wide">
                High-Acuity Clinical Alert Flagged
              </h4>
              <p className="text-text-secondary mt-0.5">
                {wound.urgent_reasons && wound.urgent_reasons.length > 0
                  ? wound.urgent_reasons.join('; ')
                  : 'Concerning symptoms or complication indicators detected for this case.'}
              </p>
            </div>
          </div>
        )}

        {/* Top Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-surface-muted/60 p-3 rounded-lg border border-border text-xs">
          <div>
            <span className="text-[10px] text-text-muted uppercase block font-semibold">Upload Date</span>
            <span className="font-bold text-text">
              {new Date(wound.upload_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase block font-semibold">AI Screening Status</span>
            <span className={cn(
              "font-bold uppercase inline-block text-[11px]",
              wound.assessment_result === 'good' ? 'text-primary' :
              wound.assessment_result === 'moderate' ? 'text-warning' :
              wound.assessment_result === 'poor' ? 'text-danger' :
              wound.assessment_result === 'uncertain' ? 'text-amber-600' :
              'text-text-muted'
            )}>
              {wound.assessment_result === 'uncertain' ? 'Uncertain (Review Req.)' : wound.assessment_result}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase block font-semibold">Doctor Review</span>
            <span className={cn(
              "font-bold text-[11px]",
              wound.doctor_review ? 'text-success' : 'text-warning'
            )}>
              {wound.doctor_review_status === 'reviewed' ? 'Approved' :
               wound.doctor_review_status === 'modified' ? 'Modified' :
               wound.doctor_review_status === 'image_requested' ? 'Photo Requested' :
               wound.doctor_review_status === 'escalated' ? 'Escalated' :
               'Pending Review'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase block font-semibold">Vitals at Upload</span>
            <span className="font-bold text-text">
              {vitals?.temperature ? `${vitals.temperature}°C` : 'N/A'} · Pain {vitals?.pain_level !== undefined ? `${vitals.pain_level}/10` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border text-xs">
          <button
            onClick={() => setActiveTab('clinical_review')}
            className={cn(
              "pb-2 px-3 font-semibold transition-colors border-b-2 cursor-pointer",
              activeTab === 'clinical_review' 
                ? "border-primary text-primary" 
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            Doctor Review & Actions
          </button>
          <button
            onClick={() => setActiveTab('observations')}
            className={cn(
              "pb-2 px-3 font-semibold transition-colors border-b-2 cursor-pointer",
              activeTab === 'observations' 
                ? "border-primary text-primary" 
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            AI Visual Observations & Quality
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={cn(
              "pb-2 px-3 font-semibold transition-colors border-b-2 cursor-pointer",
              activeTab === 'comparison' 
                ? "border-primary text-primary" 
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            Image Comparison & History ({wound.previous_images ? wound.previous_images.length : 0})
          </button>
        </div>

        {/* Tab 1: Clinical Review & Actions */}
        {activeTab === 'clinical_review' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left: Image Inspection */}
            <div className="md:col-span-5 flex flex-col gap-2">
              <div className="bg-black/5 rounded-lg border border-border overflow-hidden h-64 flex items-center justify-center relative">
                <img 
                  src={wound.image} 
                  alt="Current wound inspection" 
                  className="max-h-full max-w-full object-contain"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-mono rounded">
                  Current: Day {wound.recovery_day || 1}
                </span>
              </div>
              {wound.remarks && (
                <div className="p-2.5 bg-surface-muted rounded border border-border text-xs">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Patient Note / Reported Symptoms:</span>
                  <p className="text-text mt-0.5">{wound.remarks}</p>
                </div>
              )}
            </div>

            {/* Right: Doctor Instructions & Action Panel */}
            <div className="md:col-span-7 flex flex-col gap-3">
              {/* Doctor Approved Instructions Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-text flex items-center gap-1.5">
                    <Stethoscope size={14} className="text-primary" />
                    Doctor-Approved Patient Instructions
                  </label>
                  <span className="text-[10px] text-text-muted">Directly displayed on patient portal</span>
                </div>
                <textarea
                  className="w-full border border-border-strong rounded p-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[90px]"
                  placeholder="E.g., Approved: Incision is healing satisfactorily. Continue clean dry dressing changes daily. Showering allowed after Day 7..."
                  value={approvedInstructions}
                  onChange={e => setApprovedInstructions(e.target.value)}
                />
              </div>

              {/* Clinical Comments Field (Internal / Medical Notes) */}
              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  Clinical Remarks / Physician Audit Notes
                </label>
                <textarea
                  className="w-full border border-border-strong rounded p-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                  placeholder="Internal notes on erythema margins, staple removal timeline, or surveillance directives..."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                />
              </div>

              {/* Image Request Sub-form */}
              {showImageRequestInput && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 text-xs space-y-2">
                  <span className="font-bold text-amber-900 block flex items-center gap-1">
                    <Camera size={14} /> Request New Wound Photograph from Patient
                  </span>
                  <input
                    type="text"
                    className="w-full bg-surface border border-amber-300 rounded p-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Specify reason (e.g., Image out of focus; please take photo in brighter daylight)..."
                    value={imageRequestReason}
                    onChange={e => setImageRequestReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImageRequestInput(false)}
                      className="px-2.5 py-1 text-xs border border-border text-text-secondary rounded hover:bg-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleRequestImageSubmit}
                      className="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded hover:bg-amber-700 transition-colors"
                    >
                      Send Request to Patient
                    </button>
                  </div>
                </div>
              )}

              {/* Escalation Sub-form */}
              {showEscalationInput && (
                <div className="p-3 bg-danger-tint rounded-lg border border-danger/30 text-xs space-y-2">
                  <span className="font-bold text-danger block flex items-center gap-1">
                    <ShieldAlert size={14} /> Escalate Case to Senior Surgical Consultant
                  </span>
                  <input
                    type="text"
                    className="w-full bg-surface border border-danger/40 rounded p-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-danger"
                    placeholder="Escalation clinical justification..."
                    value={escalationNotes}
                    onChange={e => setEscalationNotes(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEscalationInput(false)}
                      className="px-2.5 py-1 text-xs border border-border text-text-secondary rounded hover:bg-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleEscalateSubmit}
                      className="px-3 py-1 bg-danger text-white font-bold text-xs rounded hover:bg-danger-hover transition-colors"
                    >
                      Confirm Escalation
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 mt-auto">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImageRequestInput(!showImageRequestInput)
                      setShowEscalationInput(false)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-text border border-border hover:bg-surface-muted rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={13} className="text-primary" /> Request New Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEscalationInput(!showEscalationInput)
                      setShowImageRequestInput(false)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-danger border border-danger/30 hover:bg-danger-tint rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert size={13} /> Escalate Case
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleModify}
                    className="px-3.5 py-1.5 text-xs font-semibold text-primary bg-primary-tint border border-primary/30 hover:bg-primary hover:text-white rounded transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Modify & Save
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleApprove}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check size={14} /> Approve Recommendations
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Visual Observations & Quality */}
        {activeTab === 'observations' && (
          <div className="space-y-3 text-xs">
            {obs.ai_status === 'unavailable' ? (
              <div className="p-4 bg-surface-muted rounded-lg border border-border text-center text-text-muted">
                <AlertTriangle size={20} className="mx-auto text-amber-500 mb-2" />
                <p className="font-bold text-text">AI analysis is currently unavailable. Awaiting clinician review.</p>
                <p className="text-2xs text-text-muted mt-1">
                  No trained or validated computer vision model is loaded. Clinical review must be performed manually.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Image Quality Card */}
                {obs.image_quality && (
                  <div className="p-3 bg-surface rounded-lg border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text flex items-center gap-1.5">
                        <Eye size={14} className="text-primary" /> Image Quality & Wound Visibility
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold uppercase rounded border",
                        obs.image_quality.is_acceptable ? 'bg-success-tint text-success border-success/30' : 'bg-warning-tint text-warning border-warning/30'
                      )}>
                        {obs.image_quality.quality_flag}
                      </span>
                    </div>
                    <p className="text-text-secondary text-2xs">{obs.image_quality.quality_notes}</p>
                    <div className="flex gap-4 text-[11px] font-mono text-text-muted pt-1">
                      <span>Resolution: {obs.image_quality.resolution}</span>
                      <span>Sharpness: {obs.image_quality.blur_score}</span>
                      <span>Brightness: {obs.image_quality.brightness_mean}</span>
                    </div>
                  </div>
                )}

                {/* 2. Visual Acuity Indicators Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Redness */}
                  <div className="p-3 bg-surface rounded-lg border border-border">
                    <span className="font-bold text-text block mb-1">🔴 Visible Redness (Erythema)</span>
                    <p className="text-text-secondary text-2xs">{obs.redness?.description || 'N/A'}</p>
                    {obs.redness?.erythema_band_ratio !== undefined && (
                      <span className="text-[10px] font-mono text-text-muted mt-1 block">
                        Erythema band ratio: {obs.redness.erythema_band_ratio}
                      </span>
                    )}
                  </div>

                  {/* Swelling */}
                  <div className="p-3 bg-surface rounded-lg border border-border">
                    <span className="font-bold text-text block mb-1">🌊 Swelling / Edema Indicators</span>
                    <p className="text-text-secondary text-2xs">{obs.swelling?.description || 'N/A'}</p>
                    {obs.swelling?.roughness_index !== undefined && (
                      <span className="text-[10px] font-mono text-text-muted mt-1 block">
                        Surface roughness metric: {obs.swelling.roughness_index}
                      </span>
                    )}
                  </div>

                  {/* Wound Edges */}
                  <div className="p-3 bg-surface rounded-lg border border-border">
                    <span className="font-bold text-text block mb-1">📏 Wound-Edge Appearance</span>
                    <p className="text-text-secondary text-2xs">{obs.wound_edges?.description || 'N/A'}</p>
                    {obs.wound_edges?.margin_edge_contrast !== undefined && (
                      <span className="text-[10px] font-mono text-text-muted mt-1 block">
                        Margin contrast: {obs.wound_edges.margin_edge_contrast}
                      </span>
                    )}
                  </div>

                  {/* Visible Discharge */}
                  <div className="p-3 bg-surface rounded-lg border border-border">
                    <span className="font-bold text-text block mb-1">💧 Visible Discharge / Slough</span>
                    <p className="text-text-secondary text-2xs">{obs.discharge?.description || 'N/A'}</p>
                    {obs.discharge?.slough_band_ratio !== undefined && (
                      <span className="text-[10px] font-mono text-text-muted mt-1 block">
                        Slough band ratio: {obs.discharge.slough_band_ratio}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comparison Summary */}
                {obs.comparison_with_previous && (
                  <div className="p-3 bg-primary-tint/20 rounded-lg border border-primary/20 text-xs">
                    <span className="font-bold text-primary block mb-0.5">🔄 Changes vs. Previous Uploaded Images</span>
                    <p className="text-text-secondary text-2xs">{obs.comparison_with_previous.comparison_summary}</p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="p-2 bg-surface-muted rounded text-[11px] text-text-muted italic border border-border/60">
                  {obs.disclaimer || "AI observations are non-diagnostic decision-support metrics. Attending physician verification required."}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Longitudinal Comparison */}
        {activeTab === 'comparison' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Current Image */}
              <div className="space-y-1">
                <span className="font-bold text-xs text-text block">Current Upload (Day {wound.recovery_day || 1})</span>
                <div className="bg-black/5 rounded-lg border border-border overflow-hidden h-60 flex items-center justify-center">
                  <img src={wound.image} alt="Current" className="max-h-full max-w-full object-contain" />
                </div>
                <span className="text-2xs text-text-muted block text-center">
                  Uploaded: {new Date(wound.upload_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Selected Previous Image */}
              <div className="space-y-1">
                <span className="font-bold text-xs text-text block">
                  {selectedComparisonImage 
                    ? `Previous Upload (Day ${selectedComparisonImage.recovery_day || '—'})` 
                    : 'No Previous Image Selected'}
                </span>
                <div className="bg-black/5 rounded-lg border border-border overflow-hidden h-60 flex items-center justify-center">
                  {selectedComparisonImage?.image ? (
                    <img src={selectedComparisonImage.image} alt="Previous comparison" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-text-muted">No prior images available for comparison.</span>
                  )}
                </div>
                {selectedComparisonImage && (
                  <span className="text-2xs text-text-muted block text-center">
                    Uploaded: {new Date(selectedComparisonImage.upload_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail selector of previous images */}
            {wound.previous_images && wound.previous_images.length > 0 && (
              <div>
                <span className="text-xs font-bold text-text block mb-2">Select Previous Image for Comparison:</span>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {wound.previous_images.map((prevImg) => (
                    <button
                      key={prevImg.id}
                      type="button"
                      onClick={() => setSelectedComparisonImage(prevImg)}
                      className={cn(
                        "w-20 h-16 rounded border overflow-hidden flex-shrink-0 cursor-pointer transition-all",
                        selectedComparisonImage?.id === prevImg.id 
                          ? "ring-2 ring-primary border-primary" 
                          : "border-border hover:border-primary/50 opacity-80 hover:opacity-100"
                      )}
                    >
                      <img src={prevImg.image} alt="prev" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
