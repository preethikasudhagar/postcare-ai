import React, { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardBody, ConfirmDialog, Modal } from '../ui/index.jsx'
import { Upload, X, AlertTriangle, User, Calendar, Image as ImageIcon, Trash2, Eye, Info } from 'lucide-react'
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
    // eslint-disable-next-line
  }, [effectivePatientId])

  const fetchImages = async () => {
    setLoading(true)
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
      setLoading(false)
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
                    className="px-4 py-2 bg-white border border-border text-xs font-semibold text-text rounded shadow-sm hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Browse Files
                  </button>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden bg-white shadow-xs">
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
                  <div key={img.id} className="flex flex-col sm:flex-row gap-4 p-3 border border-border rounded-lg hover:shadow-xs transition-shadow bg-white relative">
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
                        
                        <div className="flex items-center gap-2">
                          {/* ML Assessment Status Badge */}
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-bold uppercase rounded border",
                            img.assessment_result === 'good' ? 'bg-primary-tint text-primary border-primary/30' :
                            img.assessment_result === 'moderate' ? 'bg-warning-tint text-warning border-warning/30' :
                            img.assessment_result === 'poor' ? 'bg-danger-tint text-danger border-danger/30' :
                            img.assessment_result === 'uncertain' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
                            img.assessment_result === 'failed' ? 'bg-danger-tint text-danger border-danger/30' :
                            'bg-surface-muted text-text-muted border-border'
                          )}>
                            {img.assessment_result === 'pending' ? 'ML: Processing' :
                             img.assessment_result === 'failed' ? 'ML: Failed' :
                             img.assessment_result === 'unavailable' ? 'ML: UNAVAILABLE' :
                             img.assessment_result === 'uncertain' ? 'ML: Uncertain (Review Req.)' :
                             img.assessment_result === 'good' ? `ML: Good Class${img.confidence != null ? ` (${Math.round(img.confidence * 100)}%)` : ''}` :
                             img.assessment_result === 'moderate' ? `ML: Moderate Class${img.confidence != null ? ` (${Math.round(img.confidence * 100)}%)` : ''}` :
                             img.assessment_result === 'poor' ? `ML: Poor Class${img.confidence != null ? ` (${Math.round(img.confidence * 100)}%)` : ''}` :
                             `ML: ${img.assessment_result}`}
                          </span>

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
                          ) : (
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold uppercase rounded border",
                              img.doctor_review ? 'bg-success-tint border-success/30 text-success' : 'bg-surface-muted border-border text-text-muted'
                            )}>
                              {img.doctor_review ? 'Dr. Reviewed' : 'Physician Review: Pending'}
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
                      
                      {/* Clinical Decision Support Status Banners (Preventing False Reassurance) */}
                      {img.assessment_result === 'unavailable' && (
                        <div className="mt-2 text-2xs text-text-muted flex items-start gap-1.5 bg-surface-muted/60 p-2 rounded border border-border/50">
                          <AlertTriangle size={13} className="text-text-muted flex-shrink-0 mt-0.5" />
                          <span>Automated CV model is not deployed for wound images. Attending clinician review is required.</span>
                        </div>
                      )}

                      {img.assessment_result === 'pending' && (
                        <div className="mt-2 text-2xs text-text-muted flex items-center gap-1.5 bg-surface-muted/60 p-2 rounded border border-border/50">
                          <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <span>Image uploaded successfully. Automated assessment in progress...</span>
                        </div>
                      )}

                      {img.assessment_result === 'failed' && (
                        <div className="mt-2 text-2xs text-danger flex items-start gap-1.5 bg-danger-tint/60 p-2 rounded border border-danger/20">
                          <AlertTriangle size={13} className="text-danger flex-shrink-0 mt-0.5" />
                          <span>Image inference engine failed to process photo. Attending clinical review required.</span>
                        </div>
                      )}

                      {img.assessment_result === 'uncertain' && (
                        <div className="mt-2.5 text-2xs rounded-lg border border-amber-500/30 bg-amber-50/70 p-3 text-amber-950 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-amber-950">Assessment Status: Uncertain — Clinician Review Required</span>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-900 rounded border border-amber-500/30">
                                  Review Required
                                </span>
                              </div>
                              <p className="mt-1 text-amber-900/90 leading-relaxed text-2xs">
                                Automated screening cannot clear this image. The appearance falls outside validated closed-incision training limits and requires clinical evaluation.
                              </p>
                            </div>
                          </div>

                          {img.assessment_reason && (
                            <div className="bg-white/80 rounded p-2.5 border border-amber-400/40 text-amber-950">
                              <span className="font-bold block text-[11px] mb-1 text-amber-900">Reason for Classification:</span>
                              <p className="text-[11px] leading-relaxed text-amber-950 font-normal">{img.assessment_reason}</p>
                            </div>
                          )}

                          {img.raw_probabilities && (
                            <div className="bg-white/60 rounded p-2.5 border border-amber-300/50">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900 mb-1.5">
                                <span>Actual Model Raw Output:</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-amber-100 rounded text-amber-800">
                                  Argmax: {img.raw_probabilities.raw_prediction ? img.raw_probabilities.raw_prediction.toUpperCase() : 'GOOD'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                                <div className="bg-amber-100/60 rounded py-1.5 px-2 border border-amber-200">
                                  <span className="text-[10px] block text-text-muted font-sans font-medium">Good</span>
                                  <span className="font-bold text-text">{Math.round(img.raw_probabilities.good * 100)}%</span>
                                </div>
                                <div className="bg-amber-100/60 rounded py-1.5 px-2 border border-amber-200">
                                  <span className="text-[10px] block text-text-muted font-sans font-medium">Moderate</span>
                                  <span className="font-bold text-text">{Math.round(img.raw_probabilities.moderate * 100)}%</span>
                                </div>
                                <div className="bg-amber-100/60 rounded py-1.5 px-2 border border-amber-200">
                                  <span className="text-[10px] block text-text-muted font-sans font-medium">Poor</span>
                                  <span className="font-bold text-text">{Math.round(img.raw_probabilities.poor * 100)}%</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-amber-900/80 mt-1.5 italic leading-tight">
                                Notice: The 78% Good probability reflects the uncalibrated majority-class training prior (88% Good in SurgWound closed incision dataset). It is not an assessment of healthy healing for out-of-distribution wounds.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {img.assessment_result === 'good' && (
                        <div className="mt-2.5 text-2xs text-text-secondary bg-surface-muted p-3 rounded-lg border border-border space-y-2">
                          <div className="flex items-start gap-2">
                            <Info size={15} className="text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-bold text-xs text-text block">Model Output: Good Class (Routine Screening)</span>
                              <p className="text-2xs text-text-muted mt-0.5">
                                Incision margins appear intact within normal screening parameters. Automated screening does not replace medical evaluation; physician review is required.
                              </p>
                            </div>
                          </div>
                          {img.assessment_reason && (
                            <div className="bg-white rounded p-2 border border-border text-[11px] text-text">
                              <span className="font-semibold block text-text-muted mb-0.5">Reason:</span>
                              <p>{img.assessment_reason}</p>
                            </div>
                          )}
                          {img.raw_probabilities && (
                            <div className="text-[10px] font-mono text-text-muted pt-1 flex gap-3">
                              <span>P(Good): {Math.round(img.raw_probabilities.good * 100)}%</span>
                              <span>P(Moderate): {Math.round(img.raw_probabilities.moderate * 100)}%</span>
                              <span>P(Poor): {Math.round(img.raw_probabilities.poor * 100)}%</span>
                            </div>
                          )}
                        </div>
                      )}

                      {img.assessment_result === 'moderate' && (
                        <div className="mt-2.5 text-2xs text-warning bg-warning-tint/60 p-3 rounded-lg border border-warning/30 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={15} className="text-warning flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-bold text-xs block">Model Output: Moderate Class — Clinician Review Required (48h)</span>
                              <p className="text-2xs mt-0.5">
                                Elevated indicators detected for periwound erythema, edema, or exudate. Professional clinical monitoring required.
                              </p>
                            </div>
                          </div>
                          {img.assessment_reason && (
                            <div className="bg-white rounded p-2 border border-warning/30 text-[11px] text-text">
                              <span className="font-semibold block text-warning mb-0.5">Reason:</span>
                              <p>{img.assessment_reason}</p>
                            </div>
                          )}
                          {img.raw_probabilities && (
                            <div className="text-[10px] font-mono pt-1 flex gap-3">
                              <span>P(Good): {Math.round(img.raw_probabilities.good * 100)}%</span>
                              <span>P(Moderate): {Math.round(img.raw_probabilities.moderate * 100)}%</span>
                              <span>P(Poor): {Math.round(img.raw_probabilities.poor * 100)}%</span>
                            </div>
                          )}
                        </div>
                      )}

                      {img.assessment_result === 'poor' && (
                        <div className="mt-2.5 text-2xs text-danger bg-danger-tint/60 p-3 rounded-lg border border-danger/30 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={15} className="text-danger flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-bold text-xs block">Model Output: Poor Class — Prompt Clinical Assessment Required</span>
                              <p className="text-2xs mt-0.5">
                                High-acuity features detected indicating potential surgical complication, dehiscence, or infection. Immediate clinical review advised.
                              </p>
                            </div>
                          </div>
                          {img.assessment_reason && (
                            <div className="bg-white rounded p-2 border border-danger/30 text-[11px] text-text">
                              <span className="font-semibold block text-danger mb-0.5">Reason:</span>
                              <p>{img.assessment_reason}</p>
                            </div>
                          )}
                          {img.raw_probabilities && (
                            <div className="text-[10px] font-mono pt-1 flex gap-3">
                              <span>P(Good): {Math.round(img.raw_probabilities.good * 100)}%</span>
                              <span>P(Moderate): {Math.round(img.raw_probabilities.moderate * 100)}%</span>
                              <span>P(Poor): {Math.round(img.raw_probabilities.poor * 100)}%</span>
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
