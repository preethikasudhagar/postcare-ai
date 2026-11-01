import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader, Card, CardHeader, CardBody, Modal } from '../../components/ui/index.jsx'
import { 
  Plus, 
  Search, 
  Filter, 
  Stethoscope, 
  AlertCircle, 
  RefreshCw, 
  Edit2, 
  CheckCircle, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Clock, 
  UserCheck, 
  UserX,
  Lock,
  Unlock
} from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all')
  const [statusTab, setStatusTab] = useState('all') // 'all', 'pending', 'approved', 'rejected'

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Modal State for Rejection Reason
  const [rejectingDoctor, setRejectingDoctor] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingLoading, setRejectingLoading] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    specialization: 'Orthopedic Surgery',
    license_number: '',
    password: '',
    approval_status: 'approved',
    rejection_reason: '',
    is_active: true
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [docsRes, deptsRes] = await Promise.all([
        api.get('/patients/doctors/'),
        api.get('/patients/departments/')
      ])
      setDoctors(Array.isArray(docsRes.data) ? docsRes.data : docsRes.data.results || [])
      setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : deptsRes.data.results || [])
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load doctors and departments'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAddModal = () => {
    setEditingDoctor(null)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: departments[0]?.id ? String(departments[0].id) : '',
      specialization: 'Orthopedic Surgery',
      license_number: '',
      password: '',
      approval_status: 'approved',
      rejection_reason: '',
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (doc) => {
    setEditingDoctor(doc)
    setFormData({
      first_name: doc.user?.first_name || '',
      last_name: doc.user?.last_name || '',
      email: doc.user?.email || '',
      phone: doc.user?.phone || '',
      department: doc.department ? String(doc.department) : '',
      specialization: doc.specialization || 'Orthopedic Surgery',
      license_number: doc.license_number || '',
      password: '',
      approval_status: doc.approval_status || 'approved',
      rejection_reason: doc.rejection_reason || '',
      is_active: doc.user?.is_active ?? true
    })
    setIsModalOpen(true)
  }

  const handleApproveDoctor = async (doc) => {
    try {
      await api.post(`/patients/doctors/${doc.id}/approve/`)
      toast.success(`Dr. ${doc.user?.first_name} ${doc.user?.last_name} has been approved!`)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve doctor')
    }
  }

  const openRejectModal = (doc) => {
    setRejectingDoctor(doc)
    setRejectionReason('')
  }

  const handleConfirmReject = async (e) => {
    e.preventDefault()
    if (!rejectingDoctor) return
    try {
      setRejectingLoading(true)
      await api.post(`/patients/doctors/${rejectingDoctor.id}/reject/`, {
        reason: rejectionReason.trim()
      })
      toast.info(`Dr. ${rejectingDoctor.user?.first_name} ${rejectingDoctor.user?.last_name} application marked as rejected.`)
      setRejectingDoctor(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reject doctor account')
    } finally {
      setRejectingLoading(false)
    }
  }

  const handleToggleActive = async (doc) => {
    const newActive = doc.user?.is_active === false ? true : false
    try {
      await api.patch(`/patients/doctors/${doc.id}/`, { is_active: newActive })
      toast.success(`Dr. ${doc.user?.first_name} ${doc.user?.last_name} account ${newActive ? 'activated' : 'deactivated'}.`)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to toggle account activation')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('First and last name are required')
      return
    }

    if (!editingDoctor && !formData.email.trim()) {
      toast.error('Email address is required')
      return
    }

    try {
      setSubmitting(true)
      if (editingDoctor) {
        // Edit existing doctor
        await api.patch(`/patients/doctors/${editingDoctor.id}/`, {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          department: formData.department ? Number(formData.department) : null,
          specialization: formData.specialization.trim(),
          license_number: formData.license_number.trim(),
          approval_status: formData.approval_status,
          rejection_reason: formData.rejection_reason.trim(),
          is_active: formData.is_active
        })
        toast.success(`Doctor profile for Dr. ${formData.first_name} ${formData.last_name} updated successfully`)
      } else {
        // Create new doctor/surgeon
        await api.post('/patients/doctors/', {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password.trim() || 'Doctor@123',
          phone: formData.phone.trim(),
          department: formData.department ? Number(formData.department) : null,
          specialization: formData.specialization.trim(),
          license_number: formData.license_number.trim()
        })
        toast.success(`Surgeon Dr. ${formData.first_name} ${formData.last_name} credentialed successfully`)
      }

      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      const errData = err.response?.data
      let errMsg = 'Failed to save doctor record'
      if (errData && typeof errData === 'object') {
        const firstKey = Object.keys(errData)[0]
        const val = errData[firstKey]
        errMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val)
      }
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Count summaries
  const pendingCount = useMemo(() => doctors.filter((d) => d.approval_status === 'pending').length, [doctors])
  const approvedCount = useMemo(() => doctors.filter((d) => d.approval_status === 'approved' || !d.approval_status).length, [doctors])
  const rejectedCount = useMemo(() => doctors.filter((d) => d.approval_status === 'rejected').length, [doctors])

  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const name = `${d.user?.first_name || ''} ${d.user?.last_name || ''}`.toLowerCase()
      const email = (d.user?.email || '').toLowerCase()
      const spec = (d.specialization || '').toLowerCase()
      const license = (d.license_number || '').toLowerCase()
      const q = search.toLowerCase()

      const matchesSearch = name.includes(q) || email.includes(q) || spec.includes(q) || license.includes(q)
      const matchesDept = selectedDeptFilter === 'all' || String(d.department) === String(selectedDeptFilter)

      // Tab Status Filter
      const docStatus = d.approval_status || 'approved'
      const matchesStatus = statusTab === 'all' || docStatus === statusTab

      return matchesSearch && matchesDept && matchesStatus
    })
  }, [doctors, search, selectedDeptFilter, statusTab])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors & Surgeons"
        action={
          <button
            type="button"
            onClick={openAddModal}
            className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Surgeon
          </button>
        }
      />

      {/* Pending Approval Alert Banner */}
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 flex-shrink-0">
              <Clock size={18} className="animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-amber-950">
                {pendingCount} Doctor Registration{pendingCount > 1 ? 's' : ''} Awaiting Review
              </p>
              <p className="text-amber-800 text-2xs mt-0.5">
                New physician accounts require administrative credential approval before clinical portal and patient cohort access is granted.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusTab('pending')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-2xs transition-colors cursor-pointer flex-shrink-0"
          >
            Review Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 bg-danger-tint border border-danger/30 rounded-xl text-danger flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="px-3 py-1 bg-surface border border-danger/40 rounded text-xs font-semibold hover:bg-danger-tint transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      <Card>
        <CardHeader
          title="Attending Surgical Faculty & Medical Staff"
          description="Manage physician credential verification, clinical privileges, departmental assignments, and account access"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search doctor, spec, license..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search doctors"
                  className="h-8 pl-7 pr-3 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                aria-label="Filter by department"
                className="h-8 px-2.5 text-xs bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {/* Status Filter Tabs */}
        <div className="px-5 pt-2 pb-0 border-b border-border flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Faculty', count: doctors.length },
            { id: 'pending', label: 'Pending Approval', count: pendingCount, highlight: pendingCount > 0 },
            { id: 'approved', label: 'Approved Staff', count: approvedCount },
            { id: 'rejected', label: 'Rejected', count: rejectedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`h-9 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-2xs ${
                tab.highlight
                  ? 'bg-amber-100 text-amber-800 font-bold'
                  : statusTab === tab.id
                    ? 'bg-primary-tint text-primary'
                    : 'bg-surface-muted text-text-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Doctor Name</th>
                  <th className="p-3">Specialization & Dept</th>
                  <th className="p-3">Medical License</th>
                  <th className="p-3">Active Patients</th>
                  <th className="p-3">Credential Review</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Loading surgical faculty records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-text-muted">
                      {doctors.length === 0
                        ? 'No surgical faculty currently registered. Click "Add Surgeon" to create a profile.'
                        : 'No doctors matched your search or status filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((d) => {
                    const status = d.approval_status || 'approved'
                    const isPending = status === 'pending'
                    const isRejected = status === 'rejected'
                    const isApproved = status === 'approved'

                    return (
                      <tr key={d.id} className="hover:bg-surface-muted/50 transition-colors">
                        <td className="p-3 font-semibold text-text">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-tint flex items-center justify-center text-primary font-bold text-2xs">
                              {d.user?.first_name?.[0] || 'D'}
                            </div>
                            <div>
                              <div>Dr. {d.user?.first_name} {d.user?.last_name}</div>
                              <div className="text-2xs text-text-muted font-normal">{d.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-text">{d.specialization || 'General Surgery'}</div>
                          <div className="text-2xs text-text-muted">{d.department_name || 'Department Unassigned'}</div>
                        </td>
                        <td className="p-3 font-mono text-2xs text-text-secondary">
                          {d.license_number || 'MCI-PENDING'}
                        </td>
                        <td className="p-3 font-bold text-primary tabular-nums">
                          {d.active_patients_count || 0} patients
                        </td>
                        <td className="p-3">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-success-tint text-success border border-success/20">
                              <CheckCircle2 size={11} />
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <span 
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-danger-tint text-danger border border-danger/20"
                              title={d.rejection_reason || 'Rejected by administration'}
                            >
                              <XCircle size={11} />
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${
                            d.user?.is_active !== false
                              ? 'bg-success-tint text-success'
                              : 'bg-surface-muted text-text-muted'
                          }`}>
                            {d.user?.is_active !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveDoctor(d)}
                                  className="px-2.5 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1 font-semibold cursor-pointer shadow-2xs"
                                >
                                  <CheckCircle size={12} /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRejectModal(d)}
                                  className="px-2 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors inline-flex items-center gap-1 font-semibold cursor-pointer"
                                >
                                  <XCircle size={12} /> Reject
                                </button>
                              </>
                            )}

                            {isRejected && (
                              <button
                                type="button"
                                onClick={() => handleApproveDoctor(d)}
                                className="px-2.5 py-1 text-xs text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors inline-flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <CheckCircle size={12} /> Re-approve
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openEditModal(d)}
                              className="px-2.5 py-1 text-xs text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 size={12} /> Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(d)}
                              title={d.user?.is_active !== false ? 'Deactivate Doctor Account' : 'Activate Doctor Account'}
                              className="p-1 text-text-muted hover:text-text bg-surface-muted hover:bg-border rounded transition-colors cursor-pointer"
                            >
                              {d.user?.is_active !== false ? <Unlock size={14} /> : <Lock size={14} className="text-danger" />}
                            </button>
                          </div>
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

      {/* Add / Edit Doctor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingDoctor ? `Edit Surgeon: Dr. ${formData.first_name} ${formData.last_name}` : 'Add Attending Surgeon / Doctor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Rajesh"
                className="w-full h-9 px-3 bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Varma"
                className="w-full h-9 px-3 bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary font-medium mb-1">Email Address *</label>
            <input
              type="email"
              required
              disabled={!!editingDoctor}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="dr.varma@postcare.demo"
              className="w-full h-9 px-3 bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
            {editingDoctor && (
              <span className="text-2xs text-text-muted mt-0.5 block">Email cannot be changed after creation.</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">Specialization *</label>
              <input
                type="text"
                required
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="Orthopedic & Joint Surgery"
                className="w-full h-9 px-3 bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full h-9 px-3 bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">General / Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">License Number</label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="MCI-748291-K"
                className="w-full h-9 px-3 bg-surface-muted border border-border rounded-lg text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full h-9 px-3 bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {editingDoctor && (
            <div className="p-3 bg-surface-muted border border-border rounded-lg space-y-3">
              <div>
                <label className="block text-text-secondary font-medium mb-1">Credential Review Status</label>
                <select
                  value={formData.approval_status}
                  onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                  className="w-full h-9 px-3 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="pending">Pending Approval (Restricted Clinical Access)</option>
                  <option value="approved">Approved (Full Clinical Access)</option>
                  <option value="rejected">Rejected (Application Declined)</option>
                </select>
              </div>

              {formData.approval_status === 'rejected' && (
                <div>
                  <label className="block text-text-secondary font-medium mb-1">Rejection Reason</label>
                  <textarea
                    rows={2}
                    value={formData.rejection_reason}
                    onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                    placeholder="Provide specific notes regarding why credentials were not verified..."
                    className="w-full p-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="doc_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary rounded cursor-pointer"
                />
                <label htmlFor="doc_is_active" className="text-text font-medium cursor-pointer">
                  Active account status (permit physician login)
                </label>
              </div>
            </div>
          )}

          {!editingDoctor && (
            <div>
              <label className="block text-text-secondary font-medium mb-1">Initial Password (Optional)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Defaults to Doctor@123 if left blank"
                className="w-full h-9 px-3 bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="h-8 px-3.5 border border-border text-text font-medium rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {submitting ? 'Saving...' : editingDoctor ? 'Save Changes' : 'Save Surgeon'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Doctor Prompt Modal */}
      <Modal
        isOpen={!!rejectingDoctor}
        onClose={() => !rejectingLoading && setRejectingDoctor(null)}
        title={`Reject Registration: Dr. ${rejectingDoctor?.user?.first_name} ${rejectingDoctor?.user?.last_name}`}
      >
        <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
          <p className="text-text-secondary leading-relaxed">
            Are you sure you want to reject this physician registration? The doctor will be informed that their credentials could not be verified.
          </p>

          <div>
            <label className="block text-text-secondary font-semibold mb-1">
              Rejection Reason / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. License number not found in State Medical Registry, please contact hospital administration."
              className="w-full p-2.5 bg-surface-muted border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              disabled={rejectingLoading}
              onClick={() => setRejectingDoctor(null)}
              className="h-8 px-3.5 border border-border text-text font-medium rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejectingLoading}
              className="h-8 px-4 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {rejectingLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
