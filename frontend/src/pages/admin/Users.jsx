import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardBody, Modal } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import { Plus, Search, Filter, ShieldCheck, Check, X, AlertCircle, Link2, UserCheck, AlertTriangle, ShieldAlert } from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Patient Record Linking State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [allPatients, setAllPatients] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [linkingMode, setLinkingMode] = useState('existing') // 'existing' | 'new'
  const [newSurgeryType, setNewSurgeryType] = useState('General Post-Operative Recovery')
  const [isLinking, setIsLinking] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    role: 'doctor',
    password: '',
    phone: ''
  })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/users/')
      setUsers(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch (err) {
      toast.error('Failed to load user records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleStatus = async (user) => {
    try {
      const updatedStatus = !user.is_active
      await api.patch(`/admin/users/${user.id}/`, { is_active: updatedStatus })
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: updatedStatus } : u))
      toast.success(`User ${updatedStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (err) {
      toast.error('Failed to update user status')
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!formData.email || !formData.password || !formData.first_name) {
      toast.error('Please complete required fields')
      return
    }

    try {
      setSubmitting(true)
      await api.post('/admin/users/', {
        ...formData,
        username: formData.username || formData.email
      })
      toast.success('User account provisioned successfully')
      setIsAddModalOpen(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        role: 'doctor',
        password: '',
        phone: ''
      })
      fetchUsers()
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create user'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Open Link Patient Modal
  const openLinkModal = async (targetUser = null) => {
    try {
      setLoadingPatients(true)
      setIsLinkModalOpen(true)
      setLinkingMode('existing')

      // Pre-select user if passed, or default to first patient user without a profile
      if (targetUser) {
        setSelectedUserId(String(targetUser.id))
      } else {
        const firstUnlinked = users.find(u => u.role === 'patient' && !u.patient_profile_id)
        const firstPatient = users.find(u => u.role === 'patient')
        setSelectedUserId(firstUnlinked ? String(firstUnlinked.id) : (firstPatient ? String(firstPatient.id) : ''))
      }

      // Fetch all existing patients
      const res = await api.get('/patients/link-account/')
      const patientsList = res.data?.patients || []
      setAllPatients(patientsList)
      if (patientsList.length > 0) {
        setSelectedPatientId(String(patientsList[0].id))
      }
    } catch (err) {
      toast.error('Failed to load patient records for linking')
    } finally {
      setLoadingPatients(false)
    }
  }

  const handleLinkPatient = async (e) => {
    e.preventDefault()
    if (!selectedUserId) {
      toast.error('Please select a user account to link.')
      return
    }

    if (linkingMode === 'existing' && !selectedPatientId) {
      toast.error('Please select an existing patient medical record.')
      return
    }

    try {
      setIsLinking(true)
      const payload = {
        user_id: parseInt(selectedUserId, 10),
        patient_id: linkingMode === 'existing' ? selectedPatientId : null,
        create_new: linkingMode === 'new',
        surgery_type: linkingMode === 'new' ? newSurgeryType : undefined
      }

      const res = await api.post('/patients/link-account/', payload)
      toast.success(res.data?.message || 'Patient profile linked successfully.')
      setIsLinkModalOpen(false)
      fetchUsers()
    } catch (err) {
      console.error('LINK ERROR:', err)
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to link patient record.'
      toast.error(errMsg)
    } finally {
      setIsLinking(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''} ${u.username || ''}`.toLowerCase()
    const email = (u.email || '').toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const selectedUserObj = users.find(u => String(u.id) === String(selectedUserId))
  const selectedPatientObj = allPatients.find(p => String(p.id) === String(selectedPatientId))
  const patientUsers = users.filter(u => u.role === 'patient')

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Identity & Role Governance"
        description="Provision, activate, deactivate, audit credentials, and manage patient-account associations"
        action={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => openLinkModal(null)}
              className="h-9 px-3.5 bg-white border border-border text-text hover:bg-surface-muted text-xs font-semibold rounded transition-colors flex items-center gap-1.5 shadow-xs"
              title="Link or reassign patient records to user accounts"
            >
              <Link2 size={14} className="text-primary" /> Link Patient Profile
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} /> Add User Account
            </button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by user name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border rounded focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-surface border border-border rounded px-2.5 py-1.5 text-text focus:outline-none focus:border-primary"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="patient">Patients</option>
            <option value="caregiver">Caregivers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Patient Record</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3">Joined Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-text-muted">Loading user directory...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-text-muted">No user accounts found matching query.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="p-3 font-semibold text-text">
                        {u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}
                      </td>
                      <td className="p-3 text-text-secondary font-mono text-2xs">{u.email}</td>
                      <td className="p-3"><StatusBadge status={u.role} /></td>
                      <td className="p-3">
                        {u.role === 'patient' ? (
                          u.patient_profile_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-primary-tint text-primary border border-primary/20">
                              <UserCheck size={11} /> {u.patient_id || `ID #${u.patient_profile_id}`}
                            </span>
                          ) : (
                            <button
                              onClick={() => openLinkModal(u)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
                              title="Click to link this user account to a patient medical record"
                            >
                              <AlertTriangle size={11} className="text-amber-600" /> Missing Profile
                            </button>
                          )
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${u.is_active ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted">
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role === 'patient' && (
                            <button
                              onClick={() => openLinkModal(u)}
                              className="px-2.5 py-1 text-xs font-medium rounded text-primary border border-primary/30 hover:bg-primary-tint transition-colors flex items-center gap-1"
                              title="Link or reassign patient medical record"
                            >
                              <Link2 size={12} /> {u.patient_profile_id ? 'Reassign' : 'Link Profile'}
                            </button>
                          )}
                          <button
                            onClick={() => toggleStatus(u)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                              u.is_active
                                ? 'text-danger border border-danger/30 hover:bg-danger-tint'
                                : 'text-success border border-success/30 hover:bg-success-tint'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Link Patient Profile Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Patient-Account Association Governance"
      >
        <form onSubmit={handleLinkPatient} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary font-semibold mb-1">
              Select Patient User Account *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-text font-medium"
              required
            >
              <option value="" disabled>-- Select a patient account --</option>
              {patientUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username} ({u.email}) — User #{u.id} {u.patient_profile_id ? `[Linked: ${u.patient_id}]` : '[UNLINKED PROFILE]'}
                </option>
              ))}
            </select>
          </div>

          {/* User Details Preview Card */}
          {selectedUserObj && (
            <div className="p-3 bg-surface-muted/60 rounded-lg border border-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text">
                  {selectedUserObj.first_name ? `${selectedUserObj.first_name} ${selectedUserObj.last_name || ''}` : selectedUserObj.username}
                </span>
                <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${selectedUserObj.patient_profile_id ? 'bg-primary-tint text-primary' : 'bg-amber-500/10 text-amber-800 border border-amber-500/30'}`}>
                  {selectedUserObj.patient_profile_id ? `Currently Linked: ${selectedUserObj.patient_id}` : 'Profile Missing (Unlinked)'}
                </span>
              </div>
              <p className="text-text-secondary font-mono text-2xs">Email: {selectedUserObj.email} · Role: {selectedUserObj.role}</p>
            </div>
          )}

          {/* Linking Mode Selector */}
          <div>
            <label className="block text-text-secondary font-semibold mb-1.5">Association Action</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLinkingMode('existing')}
                className={`p-2.5 rounded border text-left transition-colors ${
                  linkingMode === 'existing'
                    ? 'border-primary bg-primary-tint/30 text-primary font-bold'
                    : 'border-border bg-surface text-text-secondary hover:bg-surface-muted'
                }`}
              >
                <div className="text-xs">Link to Existing Patient Record</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">Attach to clinical history & wound images</div>
              </button>

              <button
                type="button"
                onClick={() => setLinkingMode('new')}
                className={`p-2.5 rounded border text-left transition-colors ${
                  linkingMode === 'new'
                    ? 'border-primary bg-primary-tint/30 text-primary font-bold'
                    : 'border-border bg-surface text-text-secondary hover:bg-surface-muted'
                }`}
              >
                <div className="text-xs">Provision New Patient Profile</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">Generate fresh UHID for this user</div>
              </button>
            </div>
          </div>

          {/* Mode 1: Select Existing Patient Record */}
          {linkingMode === 'existing' && (
            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary font-semibold mb-1">
                  Select Existing Patient Medical Record *
                </label>
                {loadingPatients ? (
                  <div className="py-4 text-center text-text-muted text-xs">Loading patient registry...</div>
                ) : allPatients.length === 0 ? (
                  <div className="p-3 text-center text-text-muted bg-surface-muted rounded border border-dashed border-border">
                    No existing patient medical records found in registry.
                  </div>
                ) : (
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-text font-medium"
                    required
                  >
                    {allPatients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.patient_id} — {p.user ? `${p.user.first_name} ${p.user.last_name || ''}` : 'No Name'} ({p.user?.email || 'No email'}) — {p.surgery_type || 'General Surgery'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Patient Details Summary Card */}
              {selectedPatientObj && (
                <div className="p-3 bg-surface-muted/40 rounded-lg border border-border text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text">Medical Record: {selectedPatientObj.patient_id}</span>
                    <span className="text-2xs text-text-muted">Primary Dr: {selectedPatientObj.primary_doctor_name || 'Assigned Physician'}</span>
                  </div>
                  <div className="text-2xs text-text-secondary space-y-0.5">
                    <p>Procedure: <strong>{selectedPatientObj.surgery_type || 'General Surgery'}</strong></p>
                    <p>Current Associated Account: <strong>{selectedPatientObj.user?.email || 'None'}</strong></p>
                  </div>
                  <div className="p-2 rounded bg-primary-tint/30 border border-primary/20 text-primary text-2xs flex items-start gap-1.5">
                    <ShieldCheck size={13} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>Clinical Continuity Guarantee:</strong> All historical wound images, recovery check-ins, discharge plans, appointments, and messages under this patient record will be preserved and accessible to the newly linked account.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Provision New Record */}
          {linkingMode === 'new' && (
            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary font-semibold mb-1">
                  Surgical / Clinical Procedure Type
                </label>
                <input
                  type="text"
                  value={newSurgeryType}
                  onChange={(e) => setNewSurgeryType(e.target.value)}
                  className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-text"
                  placeholder="E.g. Total Knee Replacement, General Post-Operative Recovery"
                />
              </div>
              <p className="text-2xs text-text-muted">
                A new unique patient identifier (UHID) will be generated and associated with <strong>{selectedUserObj?.email || 'this account'}</strong>.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(false)}
              className="px-3 py-1.5 rounded border border-border text-text hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLinking || (linkingMode === 'existing' && !selectedPatientId)}
              className="px-4 py-1.5 rounded bg-primary text-white font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isLinking ? (
                <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Associating...</>
              ) : (
                <><Link2 size={14} /> Confirm Association</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Provision New Hospital User Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary font-medium mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary"
              placeholder="user@hospital.demo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary"
              >
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="patient">Patient</option>
                <option value="caregiver">Caregiver</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">Initial Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary font-medium mb-1">Contact Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2 bg-surface border border-border rounded focus:outline-none focus:border-primary"
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 rounded border border-border text-text hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded bg-primary text-white font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
