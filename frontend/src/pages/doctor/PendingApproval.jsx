import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../../components/ui/Logo'
import { 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Stethoscope, 
  FileText,
  Mail,
  Award
} from 'lucide-react'
import { toast } from 'sonner'

export default function PendingApproval() {
  const { user, logout, refreshUser, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)

  // Redirect if already approved or not a doctor
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true })
      return
    }
    if (user.role === 'doctor' && user.approval_status === 'approved') {
      navigate('/doctor/dashboard', { replace: true })
    } else if (user.role !== 'doctor') {
      const redirects = {
        patient: '/patient/dashboard',
        caregiver: '/caregiver/dashboard',
        admin: '/admin/dashboard',
      }
      navigate(redirects[user.role] || '/login', { replace: true })
    }
  }, [user, isAuthenticated, navigate])

  const handleCheckStatus = async () => {
    setChecking(true)
    try {
      const updatedUser = await refreshUser()
      if (updatedUser?.approval_status === 'approved') {
        toast.success('Your doctor credentials have been approved! Access granted.')
        navigate('/doctor/dashboard', { replace: true })
      } else if (updatedUser?.approval_status === 'rejected') {
        toast.error('Your application status is marked as rejected. Please check the review notes below.')
      } else {
        toast.info('Your registration is still under review by Hospital Administration.')
      }
    } catch {
      toast.error('Unable to refresh status. Please try again in a few moments.')
    } finally {
      setChecking(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isRejected = user?.approval_status === 'rejected'

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Top Header */}
      <header className="w-full border-b border-border bg-surface px-6 py-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <Logo variant="full" size="md" />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-danger hover:bg-danger-tint border border-border rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Card Header Banner */}
          <div className={`p-6 sm:p-8 text-white ${
            isRejected
              ? 'bg-gradient-to-r from-red-700 to-rose-600'
              : 'bg-gradient-to-r from-[#5421A8] via-[#7138D8] to-[#9055FA]'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-xs">
                {isRejected ? <AlertCircle size={22} /> : <Clock size={22} className="animate-pulse" />}
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
                  {isRejected ? 'Application Not Approved' : 'Clinical Verification Pending'}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                  Dr. {user?.first_name} {user?.last_name}
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-lg">
              {isRejected
                ? 'Your registration as an attending surgeon / physician could not be validated by PostCare AI Hospital Administration.'
                : 'Thank you for registering with PostCare AI. All physician profiles undergo administrative credential verification before clinical and patient record access is unlocked.'}
            </p>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Status Details */}
            {isRejected ? (
              <div className="p-4 bg-danger-tint border border-danger/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-danger font-semibold text-xs">
                  <AlertCircle size={16} />
                  <span>Administrative Rejection Notice</span>
                </div>
                <p className="text-xs text-danger/90 leading-relaxed">
                  {user?.rejection_reason || 'Application credentials could not be verified by hospital administration. Please ensure your medical license and full legal name match national medical registry records.'}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-semibold text-xs text-amber-950">
                  <ShieldCheck size={16} className="text-amber-700" />
                  <span>Hospital Verification Protocol</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  We verify all medical licenses and institutional appointments to ensure HIPAA compliance and patient data confidentiality. Verification typically takes 1–24 business hours.
                </p>
              </div>
            )}

            {/* Profile Overview */}
            <div className="bg-surface-muted/60 border border-border rounded-xl p-4 space-y-3 text-xs">
              <h2 className="text-2xs font-bold uppercase tracking-wider text-text-muted">
                Submitted Professional Credentials
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-start gap-2.5">
                  <Mail size={15} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-text-muted block text-2xs">Account Email</span>
                    <span className="font-semibold text-text">{user?.email}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Stethoscope size={15} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-text-muted block text-2xs">Specialization</span>
                    <span className="font-semibold text-text">{user?.specialization || 'General Surgery / Specialist'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Award size={15} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-text-muted block text-2xs">Medical License No.</span>
                    <span className="font-mono font-semibold text-text">{user?.license_number || 'Pending'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <FileText size={15} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-text-muted block text-2xs">Account Status</span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      isRejected ? 'text-danger' : 'text-amber-700'
                    }`}>
                      {isRejected ? 'Rejected' : 'Pending Administrative Review'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {!isRejected && (
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="w-full sm:w-auto flex-1 h-11 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
                  <span>{checking ? 'Checking Status…' : 'Check Approval Status'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto h-11 px-5 border border-border bg-surface text-text text-xs font-semibold rounded-lg hover:bg-surface-muted transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={15} className="text-text-muted" />
                <span>Return to Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-2xs text-text-muted border-t border-border bg-surface">
        <span>© {new Date().getFullYear()} PostCare AI • Medical Governance & Physician Credentialing</span>
      </footer>
    </div>
  )
}
