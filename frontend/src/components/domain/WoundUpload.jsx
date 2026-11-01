import React, { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardBody, ConfirmDialog, Modal } from '../ui/index.jsx'
import { Upload, X, AlertTriangle, User, Calendar, Image as ImageIcon, Trash2, Eye, Info, CheckCircle2, Clock, ShieldCheck, Camera } from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '../../context/AuthContext'

const cn = (...a) => twMerge(clsx(...a))

export default function WoundUpload({ 
  patientId = null, 
  title = "Wound Images", 
  description = null, 
  readOnly = false 
}) {
  const { user } = useAuth()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [remarks, setRemarks] = useState('')
  const fileInputRef = useRef(null)

  // Deletion state
  const [deletingImage, setDeletingImage] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false)
  const [isClearingHistory, setIsClearingHistory] = useState(false)
  const isUploadingRef = useRef(false)

  // Image display failure handling & Lightbox state
  const [brokenImages, setBrokenImages] = useState({})
  const [lightboxImage, setLightboxImage] = useState(null)

  // Resolve effective patient ID:
  // 1. Explicit patientId prop if provided
  // 2. User's linked patient_profile_id (integer PK)
  // 3. User's linked patient_id (string UHID)
  const effectivePatientId = patientId || user?.patient_profile_id || user?.patient_id || null
  const isMissingPatientProfile = user?.role === 'patient' && !effectivePatientId

  useEffect(() => {
    fetchImages()
    const interval = setInterval(() => {
      fetchImages(true)
    }, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line
  }, [effectivePatientId])

  const fetchImages = async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const url = effectivePatientId ? `/recovery/wounds/patient/${effectivePatientId}/` : `/recovery/wounds/patient/me/`
      const res = await api.get(url)
      // Deduplicate records by unique database record ID to prevent any duplicate card rendering
      const rawList = Array.isArray(res.data) ? res.data : []
      const deduplicated = Array.from(new Map(rawList.map(item => [item.id, item])).values())
      setImages(deduplicated)
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Failed to load wound images', err)
      }
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validation
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      toast.error('Only JPG, PNG, and WEBP formats are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size cannot exceed 5MB.')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveSelection = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemarks('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    // Immediate synchronous lock to prevent multiple rapid clicks / duplicate POSTs
    if (!selectedFile || isUploadingRef.current) return

    if (user?.role === 'patient' && !effectivePatientId) {
      toast.error('No linked patient profile found for this account. Please contact clinical administration.')
      return
    }

    isUploadingRef.current = true
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      if (remarks.trim()) {
        formData.append('remarks', remarks.trim())
      }
      if (effectivePatientId) {
        formData.append('patient', effectivePatientId)
      }

      const res = await api.post('/recovery/wounds/upload/', formData)
      toast.success('Wound image uploaded successfully.')
      handleRemoveSelection()

      // Immediately display newly uploaded image in Upload History without full page reload
      if (res.data && res.data.id) {
        setImages(prev => [res.data, ...prev.filter(item => item.id !== res.data.id)])
      }
      fetchImages()
    } catch (err) {
      console.error("UPLOAD ERROR:", err)
      let errMsg = 'Failed to upload image.'
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data.substring(0, 100)
        } else if (err.response.data.error) {
          errMsg = err.response.data.error
        } else if (err.response.data.detail) {
          errMsg = err.response.data.detail
        } else if (typeof err.response.data === 'object') {
          const firstKey = Object.keys(err.response.data)[0]
          if (firstKey && Array.isArray(err.response.data[firstKey])) {
            errMsg = `${firstKey}: ${err.response.data[firstKey][0]}`
          } else if (firstKey && typeof err.response.data[firstKey] === 'string') {
            errMsg = `${firstKey}: ${err.response.data[firstKey]}`
          } else {
            errMsg = JSON.stringify(err.response.data).substring(0, 100)
          }
        }
      } else if (err.message) {
        errMsg = err.message
      }
      toast.error(errMsg)
    } finally {
      isUploadingRef.current = false
      setUploading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingImage) return
    setIsDeleting(true)
    try {
      await api.delete(`/recovery/wounds/${deletingImage.id}/`)
      toast.success('Wound image deleted successfully.')
      setDeletingImage(null)
      fetchImages()
    } catch (err) {
      console.error('DELETE ERROR:', err)
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete wound image.'
      toast.error(errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClearHistoryConfirm = async () => {
    setIsClearingHistory(true)
    try {
      const url = effectivePatientId ? `/recovery/wounds/patient/${effectivePatientId}/clear/` : `/recovery/wounds/clear/`
      const res = await api.delete(url)
      const data = res.data
      if (data.retained_count > 0) {
        toast.info(
          data.message || `Deleted ${data.deleted_count} image(s). ${data.retained_count} record(s) retained under clinical policy.`,
          { duration: 6000 }
        )
      } else {
        toast.success(data.message || `Successfully deleted ${data.deleted_count} wound image(s).`)
      }
      setIsClearHistoryOpen(false)
      fetchImages()
    } catch (err) {
      console.error('CLEAR HISTORY ERROR:', err)
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to clear wound image history.'
      toast.error(errMsg)
    } finally {
      setIsClearingHistory(false)
    }
  }

  return (
    <div className="space-y-6 min-w-0">
      <Card>
        <CardHeader title={title} description={description} />
        <CardBody>
          {/* Upload Area */}
          {!readOnly && (
            <div className="mb-6">
              {isMissingPatientProfile && (
                <div className="mb-4 p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-900">No Linked Patient Profile Found</p>
                    <p className="text-amber-800 mt-1 leading-relaxed">
                      Your user account is not currently linked to an active patient medical record. Please contact clinical administration or your care team to associate your profile before uploading recovery images.
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex flex-wrap items-center gap-3 text-2xs text-amber-900">
                      <span>Account Reference: <strong>{user?.email || 'N/A'}</strong> (User ID: #{user?.id || '—'})</span>
                      {user?.role === 'admin' && (
                        <a 
                          href="/admin/users" 
                          className="font-bold text-primary underline hover:text-primary-hover"
                        >
                          Open Admin Portal to link this account &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!previewUrl ? (
                <div 
                  className={cn(
                    "border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors bg-surface-muted/30",
                    isMissingPatientProfile ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-surface-muted"
                  )}
                  onClick={() => {
                    if (isMissingPatientProfile) {
                      toast.error('No linked patient profile found for this account. Please contact clinical administration.')
                      return
                    }
                    fileInputRef.current?.click()
                  }}
                >
                  <div className="w-12 h-12 bg-primary-tint text-primary rounded-full flex items-center justify-center mb-3">
                    <Upload size={20} />
                  </div>
                  <h4 className="text-sm font-semibold text-text mb-1">Click to select an image</h4>
                  <p className="text-xs text-text-muted mb-4">Supported formats: JPG, PNG, WEBP (Max 5MB)</p>
                  <button 
                    type="button"
                    disabled={isMissingPatientProfile}
                    className="px-4 py-2 bg-surface border border-border text-xs font-semibold text-text rounded shadow-sm hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Browse Files
                  </button>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden bg-surface shadow-xs">
                  <div className="p-3 bg-surface-muted border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-text flex items-center gap-2">
                      <ImageIcon size={14} className="text-primary" /> Image Preview
                    </span>
                    <button 
                      onClick={handleRemoveSelection}
                      className="p-1 text-text-muted hover:text-danger transition-colors rounded hover:bg-danger-tint cursor-pointer"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/3 bg-black/5 rounded flex items-center justify-center overflow-hidden h-40 flex-shrink-0 border border-border">
                      <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-text mb-1">Optional Note for Doctor</label>
                        <textarea
                          className="w-full border border-border-strong rounded p-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                          placeholder="E.g., Notice some mild redness around the stitches..."
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end mt-auto">
                        <button 
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                          onClick={handleUpload}
                          disabled={uploading || isMissingPatientProfile}
                        >
                          {uploading ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                          ) : (
                            <><Upload size={14} /> Submit Image</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".jpg,.jpeg,.png,.webp" 
                onChange={handleFileChange} 
              />
            </div>
          )}

          {/* History Section */}
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
              <h4 className="text-sm font-bold text-text flex items-center gap-2">
                Upload History
              </h4>
              {!readOnly && images.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearHistoryOpen(true)}
                  disabled={isClearingHistory}
                  className="px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger-tint rounded border border-danger/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Clear all eligible wound image uploads"
                >
                  <Trash2 size={13} />
                  Clear Upload History
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="py-8 flex justify-center text-xs text-text-muted">Loading history...</div>
            ) : images.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted bg-surface-muted/30 rounded border border-dashed border-border">
                No wound images uploaded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {images.map(img => (
                  <div key={img.id} className="flex flex-col sm:flex-row gap-4 p-3 border border-border rounded-lg hover:shadow-xs transition-shadow bg-surface relative">
                    {/* Thumbnail with Error Handling and Lightbox */}
                    <div className="w-full sm:w-28 h-20 bg-surface-muted rounded overflow-hidden flex-shrink-0 border border-border flex items-center justify-center relative group">
                      {brokenImages[img.id] ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-text-muted bg-surface-muted">
                          <AlertTriangle size={16} className="text-warning mb-1" />
                          <span className="text-[10px] leading-tight">Image unavailable</span>
                        </div>
                      ) : (
                        <>
                          <img 
                            src={img.image} 
                            alt={`Wound check ${img.id}`} 
                            className="max-w-full max-h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                            onError={() => setBrokenImages(prev => ({ ...prev, [img.id]: true }))}
                            onClick={() => setLightboxImage(img)}
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxImage(img)}
                            title="Inspect image"
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          >
                            <Eye size={18} />
                          </button>
                        </>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-3 text-2xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> 
                            {new Date(img.upload_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} /> {img.uploaded_by_name || 'Patient'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {/* AI Assessment Status Badge (Explicit Processing States) */}
                          {img.assessment_result === 'pending' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-secondary-tint text-secondary border-secondary/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" /> AI Analysis in Progress
                            </span>
                          ) : img.assessment_result === 'good' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-success-tint text-success border-success/30 flex items-center gap-1">
                              <ShieldCheck size={11} /> AI Completed: Good Healing {img.confidence != null ? `(${Math.round(img.confidence * 100)}%)` : ''}
                            </span>
                          ) : img.assessment_result === 'moderate' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-warning-tint text-warning border-warning/30 flex items-center gap-1">
                              <AlertTriangle size={11} /> AI Completed: Moderate Risk {img.confidence != null ? `(${Math.round(img.confidence * 100)}%)` : ''}
                            </span>
                          ) : img.assessment_result === 'poor' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-danger-tint text-danger border-danger/30 flex items-center gap-1">
                              <AlertTriangle size={11} /> AI Completed: Complication Alert {img.confidence != null ? `(${Math.round(img.confidence * 100)}%)` : ''}
                            </span>
                          ) : img.assessment_result === 'uncertain' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-amber-500/10 text-amber-700 border-amber-500/30 flex items-center gap-1">
                              <Clock size={11} /> AI Completed: Clinician Review Required
                            </span>
                          ) : img.assessment_result === 'failed' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-danger-tint text-danger border-danger/30">
                              AI Analysis Failed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-surface-muted text-text-muted border-border">
                              AI Analysis Unavailable
                            </span>
                          )}

                          {/* Doctor Review Badge / Action */}
                          {readOnly && !img.doctor_review ? (
                            <button
                              onClick={async () => {
                                try {
                                  await api.patch(`/recovery/wounds/${img.id}/review/`, { doctor_review: true });
                                  fetchImages();
                                  toast.success('Marked as reviewed.');
                                } catch (e) {
                                  toast.error('Failed to update review status.');
                                }
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-primary-tint border-primary text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                            >
                              Mark Reviewed
                            </button>
                          ) : img.doctor_review_status === 'reviewed' || img.doctor_review ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-success-tint border-success/30 text-success flex items-center gap-1">
                              <CheckCircle2 size={11} /> Doctor Approved
                            </span>
                          ) : img.doctor_review_status === 'modified' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-primary-tint border-primary/30 text-primary flex items-center gap-1">
                              <CheckCircle2 size={11} /> Doctor Modified
                            </span>
                          ) : img.doctor_review_status === 'image_requested' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-warning-tint border-amber-400 text-amber-900 flex items-center gap-1">
                              <Camera size={11} /> New Photo Requested
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded border bg-warning-tint border border-amber-300 text-warning flex items-center gap-1">
                              <Clock size={11} /> Physician Review: Pending
                            </span>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingImage(img)}
                            disabled={img.doctor_review}
                            title={img.doctor_review ? "Clinically reviewed records are preserved under audit retention policy" : "Delete wound image"}
                            className={cn(
                              "p-1 rounded transition-colors ml-1 inline-flex items-center justify-center",
                              img.doctor_review 
                                ? "text-border cursor-not-allowed opacity-40" 
                                : "text-text-muted hover:text-danger hover:bg-danger-tint cursor-pointer"
                            )}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      
                      {img.remarks && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          <span className="font-semibold">Note:</span> {img.remarks}
                        </p>
                      )}
                                           {/* Urgent Warning Banner */}
                      {img.is_urgent && (
                        <div className="mt-2.5 p-3 rounded-lg border-l-4 border-l-danger border border-danger/30 bg-danger-tint/60 text-danger space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={15} className="text-danger flex-shrink-0" />
                            <span className="font-bold text-xs uppercase tracking-wide">
                              Urgent Clinical Attention Advised
                            </span>
                          </div>
                          <p className="text-2xs text-text-secondary leading-relaxed">
                            {img.urgent_reasons && img.urgent_reasons.length > 0 
                              ? `Concerning post-op symptoms flagged: ${img.urgent_reasons.join('; ')}.`
                              : 'High-acuity post-operative complication indicators detected.'}
                            {' '}Your attending clinical team has been alerted. If experiencing heavy bleeding or severe distress, seek emergency medical care immediately.
                          </p>
                        </div>
                      )}

                      {/* Doctor Requested Another Image Notice */}
                      {img.doctor_review_status === 'image_requested' && (
                        <div className="mt-2.5 p-3 rounded-lg border border-amber-400 bg-amber-50 text-amber-950 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                              <AlertTriangle size={14} className="text-amber-600" /> Attending Doctor Requested a New Photograph
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded">
                              Re-Take Requested
                            </span>
                          </div>
                          <p className="text-2xs text-amber-900 leading-relaxed">
                            <strong>Reason:</strong> {img.image_request_reason || "Doctor requested a clearer photo under better lighting."}
                          </p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700 transition-colors cursor-pointer mt-1"
                          >
                            <Upload size={12} /> Upload New Photo Now
                          </button>
                        </div>
                      )}

                      {/* Doctor-Approved Instructions Box */}
                      {img.doctor_approved_instructions && (
                        <div className="mt-2.5 p-3 rounded-lg border border-primary/40 bg-primary-tint/20 text-text space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                              🩺 Doctor-Approved Instructions
                            </span>
                            {img.reviewed_by_name && (
                              <span className="text-2xs text-text-muted">
                                {img.reviewed_by_name} {img.reviewed_at ? `· ${new Date(img.reviewed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text leading-relaxed whitespace-pre-line font-medium">
                            {img.doctor_approved_instructions}
                          </p>
                        </div>
                      )}

                      {/* Doctor Comments if available */}
                      {img.doctor_comments && (
                        <div className="mt-2 p-2.5 rounded bg-surface-muted border border-border text-xs text-text">
                          <span className="font-semibold block text-text-secondary text-[11px] mb-0.5">Doctor Clinical Comments:</span>
                          <p className="text-text-secondary">{img.doctor_comments}</p>
                        </div>
                      )}

                      {/* AI Status / Observations Banners */}
                      {img.assessment_result === 'unavailable' && (
                        <div className="mt-2 text-2xs text-text-muted flex items-start gap-1.5 bg-surface-muted/60 p-2.5 rounded border border-border/50">
                          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>AI analysis is currently unavailable. Awaiting clinician review.</span>
                        </div>
                      )}

                      {img.assessment_result === 'pending' && (
                        <div className="mt-2 text-2xs text-text-muted flex items-center gap-1.5 bg-surface-muted/60 p-2.5 rounded border border-border/50">
                          <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <span>Image uploaded securely. Automated wound analysis in progress...</span>
                        </div>
                      )}

                      {/* Structured AI Visual Observations Grid */}
                      {img.ai_observations && (img.ai_observations.ai_status === 'completed' || (img.assessment_result && img.assessment_result !== 'unavailable' && img.assessment_result !== 'pending')) && (
                        <div className="mt-2.5 p-3 rounded-lg border border-border bg-surface-muted/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-text flex items-center gap-1.5">
                              🤖 AI-Generated Visual Observations
                            </span>
                            <span className="text-[10px] text-text-muted italic">Clinical Decision Support (ExtraTrees CV Model)</span>
                          </div>

                          {/* Model Finding & Confidence Breakdown */}
                          {img.raw_probabilities && (
                            <div className="p-2.5 bg-surface rounded border border-border/60 text-2xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-text">Supported Classification Finding:</span>
                                <span className="font-bold text-primary">
                                  {img.assessment_result === 'good' ? 'Normal Healing' :
                                   img.assessment_result === 'moderate' ? 'Moderate Risk (Active Monitoring)' :
                                   img.assessment_result === 'poor' ? 'Elevated Complication Risk' :
                                   'Uncertain (Clinician Calibration)'}
                                  {img.confidence != null ? ` · ${Math.round(img.confidence * 100)}% Confidence` : ''}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center">
                                <div className="bg-success-tint/40 p-1 rounded border border-success/20">
                                  <span className="block text-success font-semibold">Good Healing</span>
                                  <span className="text-text font-bold">{Math.round((img.raw_probabilities.good || 0) * 100)}%</span>
                                </div>
                                <div className="bg-warning-tint/40 p-1 rounded border border-warning/20">
                                  <span className="block text-warning font-semibold">Moderate Risk</span>
                                  <span className="text-text font-bold">{Math.round((img.raw_probabilities.moderate || 0) * 100)}%</span>
                                </div>
                                <div className="bg-danger-tint/40 p-1 rounded border border-danger/20">
                                  <span className="block text-danger font-semibold">Poor / Complication</span>
                                  <span className="text-text font-bold">{Math.round((img.raw_probabilities.poor || 0) * 100)}%</span>
                                </div>
                              </div>
                              {img.assessment_reason && (
                                <p className="text-[11px] text-text-secondary leading-relaxed pt-1 border-t border-border/40">
                                  {img.assessment_reason}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
                            <div className="p-2 bg-surface rounded border border-border/60">
                              <span className="font-semibold text-text block">🔴 Visible Redness:</span>
                              <p className="text-text-muted mt-0.5">{img.ai_observations.redness?.description || 'Within expected limits.'}</p>
                            </div>
                            <div className="p-2 bg-surface rounded border border-border/60">
                              <span className="font-semibold text-text block">🌊 Tissue Edema / Contour:</span>
                              <p className="text-text-muted mt-0.5">{img.ai_observations.swelling?.description || 'Within expected limits.'}</p>
                            </div>
                            <div className="p-2 bg-surface rounded border border-border/60">
                              <span className="font-semibold text-text block">📏 Margin Edges:</span>
                              <p className="text-text-muted mt-0.5">{img.ai_observations.wound_edges?.description || 'Well approximated.'}</p>
                            </div>
                            <div className="p-2 bg-surface rounded border border-border/60">
                              <span className="font-semibold text-text block">💧 Exudate / Slough:</span>
                              <p className="text-text-muted mt-0.5">{img.ai_observations.discharge?.description || 'No purulent discharge detected.'}</p>
                            </div>
                          </div>

                          {img.ai_observations.comparison_with_previous && img.ai_observations.comparison_with_previous.has_previous && (
                            <div className="p-2 bg-primary-tint/20 rounded border border-primary/20 text-2xs text-text-secondary">
                              <strong className="text-primary block">🔄 Changes vs. Previous Photo:</strong>
                              <p className="mt-0.5">{img.ai_observations.comparison_with_previous.comparison_summary}</p>
                            </div>
                          )}

                          {img.ai_observations.image_quality && (
                            <div className="text-[10px] text-text-muted pt-0.5 flex items-center justify-between">
                              <span>Image Quality: <strong className="capitalize">{img.ai_observations.image_quality.quality_flag}</strong> ({img.ai_observations.image_quality.resolution})</span>
                              <span>{img.ai_observations.image_quality.is_acceptable ? '✓ Wound clearly visible' : '⚠ Limited visibility'}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Structured Post-Operative Recommendations */}
                      {img.generated_recommendations && (
                        <div className="mt-2.5 p-3 rounded-lg border border-border bg-surface space-y-2.5 text-xs">
                          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                            <span className="font-bold text-text flex items-center gap-1.5">
                              📋 Post-Operative Care Guidance & Reminders
                            </span>
                            <span className="text-2xs text-primary font-semibold">
                              {img.generated_recommendations.recovery_phase || `Day ${img.recovery_day || 1}`}
                            </span>
                          </div>

                          {/* Wound Care & Hygiene */}
                          {img.generated_recommendations.wound_care && img.generated_recommendations.wound_care.length > 0 && (
                            <div>
                              <strong className="text-2xs uppercase text-text-muted block mb-1">Wound-Care & Hygiene:</strong>
                              <ul className="list-disc list-inside text-2xs text-text-secondary space-y-0.5">
                                {img.generated_recommendations.wound_care.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                                {img.generated_recommendations.hygiene && img.generated_recommendations.hygiene.slice(0, 1).map((item, i) => (
                                  <li key={`h-${i}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Prescribed Medication Schedule Reminders */}
                          {img.generated_recommendations.medication_reminders && (
                            <div className="pt-1.5 border-t border-border/40">
                              <strong className="text-2xs uppercase text-text-muted block mb-1">Prescribed Medication Adherence:</strong>
                              <ul className="list-disc list-inside text-2xs text-text-secondary space-y-0.5">
                                {img.generated_recommendations.medication_reminders.slice(0, 2).map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Follow-Up Appointment Reminders */}
                          {img.generated_recommendations.followup_reminders && img.generated_recommendations.followup_reminders.length > 0 && (
                            <div className="pt-1.5 border-t border-border/40">
                              <strong className="text-2xs uppercase text-text-muted block mb-1">Follow-Up Reminders:</strong>
                              <p className="text-2xs text-text-secondary">
                                {img.generated_recommendations.followup_reminders[0]}
                              </p>
                            </div>
                          )}

                          {/* When to Contact Doctor */}
                          {img.generated_recommendations.contact_doctor && img.generated_recommendations.contact_doctor.length > 0 && (
                            <div className="p-2 rounded bg-surface-muted text-2xs text-text-muted border border-border/50">
                              <strong className="text-text block mb-0.5">When to Contact Doctor:</strong>
                              <p>{img.generated_recommendations.contact_doctor[0]}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Confirmation Dialog for Image Deletion */}
      <ConfirmDialog
        isOpen={Boolean(deletingImage)}
        onClose={() => !isDeleting && setDeletingImage(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Wound Image?"
        description="Are you sure you want to delete this uploaded wound image? This action cannot be undone."
        confirmLabel={isDeleting ? "Deleting..." : "Delete Image"}
        cancelLabel="Cancel"
        variant="danger"
        loading={isDeleting}
      />

      {/* Confirmation Dialog for Clearing Wound Image History */}
      <ConfirmDialog
        isOpen={isClearHistoryOpen}
        onClose={() => !isClearingHistory && setIsClearHistoryOpen(false)}
        onConfirm={handleClearHistoryConfirm}
        title="Clear Wound Image History?"
        description="This will delete all eligible wound image uploads from your history. Doctor-reviewed clinical records may be retained according to the application's retention policy. This action cannot be undone for permanently deleted records."
        confirmLabel={isClearingHistory ? "Clearing..." : "Clear History"}
        cancelLabel="Cancel"
        variant="danger"
        loading={isClearingHistory}
      />

      {/* Lightbox Modal for Full Image Inspection */}
      {lightboxImage && (
        <Modal
          isOpen={Boolean(lightboxImage)}
          onClose={() => setLightboxImage(null)}
          title="Wound Image Inspection"
          subtitle={`Uploaded on ${new Date(lightboxImage.upload_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} by ${lightboxImage.uploaded_by_name || 'Patient'}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-black/5 rounded-lg border border-border overflow-hidden flex items-center justify-center max-h-[60vh]">
              <img 
                src={lightboxImage.image} 
                alt="Wound inspection enlarged" 
                className="max-h-[58vh] max-w-full object-contain rounded" 
              />
            </div>
            {lightboxImage.remarks && (
              <div className="bg-surface-muted/60 p-3 rounded border border-border text-xs text-text">
                <span className="font-semibold block mb-0.5">Clinical / Patient Note:</span>
                <p className="text-text-secondary">{lightboxImage.remarks}</p>
              </div>
            )}
            <div className="flex flex-col gap-2.5 text-xs text-text-muted pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span>Assessment Status: <strong className="uppercase text-text font-bold">{lightboxImage.assessment_result === 'uncertain' ? 'Uncertain (Review Req.)' : lightboxImage.assessment_result}</strong></span>
                <span>Physician Review: <strong className={lightboxImage.doctor_review ? "text-success font-bold" : "text-text-muted font-bold"}>{lightboxImage.doctor_review ? 'Doctor Reviewed' : 'Pending Review'}</strong></span>
              </div>
              {lightboxImage.assessment_reason && (
                <div className="bg-surface-muted p-2.5 rounded border border-border text-text">
                  <span className="font-bold block text-[11px] mb-0.5 text-text-secondary">Assessment Reason:</span>
                  <p className="text-[11px] leading-relaxed text-text">{lightboxImage.assessment_reason}</p>
                </div>
              )}
              {lightboxImage.raw_probabilities && (
                <div className="text-[11px] font-mono bg-surface-muted p-2 rounded border border-border flex justify-between text-text-secondary">
                  <span>P(good): {Math.round(lightboxImage.raw_probabilities.good * 100)}%</span>
                  <span>P(moderate): {Math.round(lightboxImage.raw_probabilities.moderate * 100)}%</span>
                  <span>P(poor): {Math.round(lightboxImage.raw_probabilities.poor * 100)}%</span>
                </div>
              )}
              <div className="text-[10px] text-text-muted italic">
                * Note: Automated assessment does not establish clinical safety. Attending physician evaluation is required.
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
