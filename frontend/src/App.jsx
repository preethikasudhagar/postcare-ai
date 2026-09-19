import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
const AppShell = lazy(() => import('./layouts/AppShell'))

// Public pages
const LandingPage    = lazy(() => import('./pages/public/LandingPage'))
const LoginPage      = lazy(() => import('./pages/public/LoginPage'))
const RegisterPage   = lazy(() => import('./pages/public/RegisterPage'))
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'))
const ResetPassword  = lazy(() => import('./pages/public/ResetPassword'))

// Shared
const NotFound  = lazy(() => import('./pages/shared/NotFound'))
const Forbidden = lazy(() => import('./pages/shared/Forbidden'))

// Patient
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard'))
const PatientProfile   = lazy(() => import('./pages/patient/PatientProfile'))
const DischargePlan    = lazy(() => import('./pages/patient/DischargePlan'))
const Medications      = lazy(() => import('./pages/patient/Medications'))
const RecoveryPage     = lazy(() => import('./pages/patient/RecoveryPage'))
const RecoveryCheckIn  = lazy(() => import('./pages/patient/RecoveryCheckIn'))
const FollowUps        = lazy(() => import('./pages/patient/FollowUps'))
const PatientNotifications = lazy(() => import('./pages/patient/Notifications'))
const PatientMessages  = lazy(() => import('./pages/patient/Messages'))

// Doctor
const DoctorDashboard    = lazy(() => import('./pages/doctor/DoctorDashboard'))
const PatientList        = lazy(() => import('./pages/doctor/PatientList'))
const PatientDetail      = lazy(() => import('./pages/doctor/PatientDetail'))
const DischargePlans     = lazy(() => import('./pages/doctor/DischargePlans'))
const DischargePlanEdit  = lazy(() => import('./pages/doctor/DischargePlanEdit'))
const DoctorFollowUps    = lazy(() => import('./pages/doctor/FollowUps'))
const RiskPredictions    = lazy(() => import('./pages/doctor/RiskPredictions'))
const DoctorAlerts       = lazy(() => import('./pages/doctor/Alerts'))
const DoctorNotifications = lazy(() => import('./pages/doctor/Notifications'))
const DoctorMessages     = lazy(() => import('./pages/doctor/Messages'))
const DoctorReports      = lazy(() => import('./pages/doctor/Reports'))

// Nurse
const NurseDashboard = lazy(() => import('./pages/nurse/NurseDashboard'))
const NursePatients  = lazy(() => import('./pages/nurse/Patients'))
const NurseRecovery  = lazy(() => import('./pages/nurse/Recovery'))
const NurseAlerts    = lazy(() => import('./pages/nurse/Alerts'))
const NurseFollowUps = lazy(() => import('./pages/nurse/FollowUps'))

// Admin
const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers        = lazy(() => import('./pages/admin/Users'))
const AdminDoctors      = lazy(() => import('./pages/admin/Doctors'))
const AdminNurses       = lazy(() => import('./pages/admin/Nurses'))
const AdminDepartments  = lazy(() => import('./pages/admin/Departments'))
const AdminReports      = lazy(() => import('./pages/admin/Reports'))
const AdminSettings     = lazy(() => import('./pages/admin/Settings'))
const MLEvaluation      = lazy(() => import('./pages/admin/MLEvaluation'))
const Architecture      = lazy(() => import('./pages/admin/Architecture'))

// Caregiver
const CaregiverDashboard = lazy(() => import('./pages/caregiver/CaregiverDashboard'))
const CaregiverNotifications = lazy(() => import('./pages/caregiver/Notifications'))

// Fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    </div>
  )
}

// Route guard
function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/403" replace />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Authenticated shell */}
        <Route element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AppShell />
            </Suspense>
          </ProtectedRoute>
        }>
          {/* Patient routes */}
          <Route path="/patient/dashboard"     element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="/patient/profile"       element={<ProtectedRoute roles={['patient']}><PatientProfile /></ProtectedRoute>} />
          <Route path="/patient/discharge-plan" element={<ProtectedRoute roles={['patient']}><DischargePlan /></ProtectedRoute>} />
          <Route path="/patient/medications"   element={<ProtectedRoute roles={['patient']}><Medications /></ProtectedRoute>} />
          <Route path="/patient/recovery"      element={<ProtectedRoute roles={['patient']}><RecoveryPage /></ProtectedRoute>} />
          <Route path="/patient/check-in"      element={<ProtectedRoute roles={['patient']}><RecoveryCheckIn /></ProtectedRoute>} />
          <Route path="/patient/follow-ups"    element={<ProtectedRoute roles={['patient']}><FollowUps /></ProtectedRoute>} />
          <Route path="/patient/notifications" element={<ProtectedRoute roles={['patient']}><PatientNotifications /></ProtectedRoute>} />
          <Route path="/patient/messages"      element={<ProtectedRoute roles={['patient']}><PatientMessages /></ProtectedRoute>} />

          {/* Doctor routes */}
          <Route path="/doctor/dashboard"      element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor/patients"       element={<ProtectedRoute roles={['doctor']}><PatientList /></ProtectedRoute>} />
          <Route path="/doctor/patients/:id"   element={<ProtectedRoute roles={['doctor']}><PatientDetail /></ProtectedRoute>} />
          <Route path="/doctor/discharge-plans"    element={<ProtectedRoute roles={['doctor']}><DischargePlans /></ProtectedRoute>} />
          <Route path="/doctor/discharge-plans/new" element={<ProtectedRoute roles={['doctor']}><DischargePlanEdit /></ProtectedRoute>} />
          <Route path="/doctor/discharge-plans/:id/edit" element={<ProtectedRoute roles={['doctor']}><DischargePlanEdit /></ProtectedRoute>} />
          <Route path="/doctor/follow-ups"     element={<ProtectedRoute roles={['doctor']}><DoctorFollowUps /></ProtectedRoute>} />
          <Route path="/doctor/risk-predictions" element={<ProtectedRoute roles={['doctor']}><RiskPredictions /></ProtectedRoute>} />
          <Route path="/doctor/alerts"         element={<ProtectedRoute roles={['doctor']}><DoctorAlerts /></ProtectedRoute>} />
          <Route path="/doctor/notifications"  element={<ProtectedRoute roles={['doctor']}><DoctorNotifications /></ProtectedRoute>} />
          <Route path="/doctor/messages"       element={<ProtectedRoute roles={['doctor']}><DoctorMessages /></ProtectedRoute>} />
          <Route path="/doctor/reports"        element={<ProtectedRoute roles={['doctor']}><DoctorReports /></ProtectedRoute>} />

          {/* Nurse routes */}
          <Route path="/nurse/dashboard"  element={<ProtectedRoute roles={['nurse']}><NurseDashboard /></ProtectedRoute>} />
          <Route path="/nurse/patients"   element={<ProtectedRoute roles={['nurse']}><NursePatients /></ProtectedRoute>} />
          <Route path="/nurse/recovery"   element={<ProtectedRoute roles={['nurse']}><NurseRecovery /></ProtectedRoute>} />
          <Route path="/nurse/alerts"     element={<ProtectedRoute roles={['nurse']}><NurseAlerts /></ProtectedRoute>} />
          <Route path="/nurse/follow-ups" element={<ProtectedRoute roles={['nurse']}><NurseFollowUps /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/dashboard"   element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users"       element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/doctors"     element={<ProtectedRoute roles={['admin']}><AdminDoctors /></ProtectedRoute>} />
          <Route path="/admin/nurses"      element={<ProtectedRoute roles={['admin']}><AdminNurses /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute roles={['admin']}><AdminDepartments /></ProtectedRoute>} />
          <Route path="/admin/reports"     element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/settings"    element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/ml-evaluation" element={<ProtectedRoute roles={['admin']}><MLEvaluation /></ProtectedRoute>} />
          <Route path="/admin/architecture"  element={<ProtectedRoute roles={['admin']}><Architecture /></ProtectedRoute>} />

          {/* Caregiver routes */}
          <Route path="/caregiver/dashboard"     element={<ProtectedRoute roles={['caregiver']}><CaregiverDashboard /></ProtectedRoute>} />
          <Route path="/caregiver/notifications" element={<ProtectedRoute roles={['caregiver']}><CaregiverNotifications /></ProtectedRoute>} />
        </Route>

        {/* Errors */}
        <Route path="/403" element={<Forbidden />} />
        <Route path="*"    element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
