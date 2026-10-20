import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader, Card, CardHeader, CardBody, Modal } from '../../components/ui/index.jsx'
import { Plus, Search, Filter, HeartPulse, AlertCircle, RefreshCw, Edit2, CheckCircle, Shield } from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'

export default function AdminNurses() {
  const [nurses, setNurses] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNurse, setEditingNurse] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    license_number: '',
    password: '',
    is_active: true
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [nursesRes, deptsRes] = await Promise.all([
        api.get('/patients/nurses/'),
        api.get('/patients/departments/')
      ])
      setNurses(Array.isArray(nursesRes.data) ? nursesRes.data : nursesRes.data.results || [])
      setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : deptsRes.data.results || [])
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load nursing staff and departments'
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
    setEditingNurse(null)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: departments[0]?.id ? String(departments[0].id) : '',
      license_number: '',
      password: '',
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (nurse) => {
    setEditingNurse(nurse)
    setFormData({
      first_name: nurse.user?.first_name || '',
      last_name: nurse.user?.last_name || '',
      email: nurse.user?.email || '',
      phone: nurse.user?.phone || '',
      department: nurse.department ? String(nurse.department) : '',
      license_number: nurse.license_number || '',
      password: '',
      is_active: nurse.user?.is_active ?? true
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('First and last name are required')
      return
    }

    if (!editingNurse && !formData.email.trim()) {
      toast.error('Email address is required')
      return
    }

    try {
      setSubmitting(true)
      if (editingNurse) {
        // Update nurse profile
        const payload = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          department: formData.department ? parseInt(formData.department, 10) : null,
          license_number: formData.license_number.trim(),
          is_active: formData.is_active
        }
        await api.patch(`/patients/nurses/${editingNurse.id}/`, payload)
        toast.success(`Nurse ${formData.first_name} ${formData.last_name} updated successfully`)
      } else {
        // Create new nurse
        const payload = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          department: formData.department ? parseInt(formData.department, 10) : null,
          license_number: formData.license_number.trim(),
          password: formData.password || undefined
        }
        await api.post('/patients/nurses/', payload)
        toast.success(`Nurse ${formData.first_name} ${formData.last_name} provisioned successfully`)
      }

      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const errorMsg = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ')
        toast.error(errorMsg || 'Failed to save nursing staff')
      } else {
        toast.error(err.message || 'Network error occurred while saving nurse')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredNurses = useMemo(() => {
    return nurses.filter((n) => {
      const fullName = n.full_name || `${n.user?.first_name || ''} ${n.user?.last_name || ''}`
      const matchesSearch =
        fullName.toLowerCase().includes(search.toLowerCase()) ||
        n.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        n.license_number?.toLowerCase().includes(search.toLowerCase()) ||
        n.department_name?.toLowerCase().includes(search.toLowerCase())

      const matchesDept =
        selectedDeptFilter === 'all' ||
        String(n.department) === selectedDeptFilter

      return matchesSearch && matchesDept
    })
  }, [nurses, search, selectedDeptFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nursing & Triage Coordinators"
        description="Nursing staff roster, ward assignments, and post-op care triage coordination"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="h-9 px-3 border border-border bg-surface text-text hover:bg-surface-muted rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Refresh Roster"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={openAddModal}
              className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} /> Add Nurse Staff
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-status-danger/10 border border-status-danger/20 rounded-lg flex items-center justify-between text-xs text-status-danger">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="underline font-semibold hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search nurse by name, email, ward, or registration no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-surface border border-border text-text rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Departments / Wards</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Nurses Roster Card */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Nurse Name</th>
                  <th className="p-3">Ward & Department</th>
                  <th className="p-3">Registration No.</th>
                  <th className="p-3">Contact Email</th>
                  <th className="p-3">Assigned Patients</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-primary" />
                        <span>Loading nursing roster from clinical database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredNurses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-text-muted">
                      <HeartPulse size={36} className="mx-auto mb-2 text-text-muted/40" />
                      <p className="font-semibold text-text">No nursing staff found</p>
                      <p className="text-2xs text-text-muted mt-1">
                        {search || selectedDeptFilter !== 'all'
                          ? 'Try adjusting your search criteria or department filter.'
                          : 'Provision your first registered nurse to coordinate post-op patient triage.'}
                      </p>
                      {!search && selectedDeptFilter === 'all' && (
                        <button
                          onClick={openAddModal}
                          className="mt-3 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary-hover inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus size={13} /> Add Nurse Staff
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredNurses.map((n) => {
                    const fullName = n.full_name || `${n.user?.first_name || ''} ${n.user?.last_name || ''}`.trim() || 'Nurse'
                    const isActive = n.user?.is_active ?? true
                    return (
                      <tr key={n.id} className="hover:bg-surface-muted/50 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-text flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xs">
                              {n.user?.first_name?.[0] || 'N'}
                            </span>
                            <span>{fullName}</span>
                          </div>
                        </td>
                        <td className="p-3 text-text-secondary">
                          {n.department_name ? (
                            <span className="inline-flex items-center gap-1 text-primary font-medium">
                              <Shield size={12} className="text-primary" />
                              {n.department_name}
                            </span>
                          ) : (
                            <span className="text-text-muted italic">Unassigned Ward</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-2xs text-text-muted">
                          {n.license_number || 'KNC-PENDING'}
                        </td>
                        <td className="p-3 text-text-muted">{n.user?.email || '—'}</td>
                        <td className="p-3 font-bold text-primary tabular-nums">
                          {n.assigned_patients_count || 0} active
                        </td>
                        <td className="p-3">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle size={10} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditModal(n)}
                            className="px-2.5 py-1 text-xs text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors inline-flex items-center gap-1"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
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

      {/* Add / Edit Nurse Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingNurse ? 'Edit Nursing Coordinator Profile' : 'Add New Nursing Staff'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-text mb-1">
                First Name <span className="text-status-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="e.g. Priya"
                className="w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-text mb-1">
                Last Name <span className="text-status-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="e.g. Nair"
                className="w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-text mb-1">
                Email Address {!editingNurse && <span className="text-status-danger">*</span>}
              </label>
              <input
                type="email"
                required={!editingNurse}
                disabled={!!editingNurse}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="priya.nair@hospital.org"
                className={`w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary ${
                  editingNurse ? 'bg-surface-muted opacity-70 cursor-not-allowed' : ''
                }`}
              />
            </div>
            <div>
              <label className="block font-medium text-text mb-1">Contact Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98450 12345"
                className="w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-text mb-1">Ward / Surgical Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Unassigned Ward —</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-text mb-1">Nursing Registration No.</label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="e.g. KNC-84920-A"
                className="w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <p className="text-2xs text-text-muted mt-0.5">Leave blank to auto-generate state registry ID.</p>
            </div>
          </div>

          {!editingNurse && (
            <div>
              <label className="block font-medium text-text mb-1">Initial Temporary Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Default: Nurse@123"
                className="w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-2xs text-text-muted mt-0.5">Staff member can reset on first clinical sign-in.</p>
            </div>
          )}

          {editingNurse && (
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <div>
                <span className="font-medium text-text block">Clinical Roster Status</span>
                <span className="text-2xs text-text-muted">Allow nurse to triage patients and coordinate check-ins</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 border border-border text-text rounded hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-primary text-white font-medium rounded hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>{editingNurse ? 'Save Changes' : 'Provision Nurse'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
