import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader, Card, CardBody, Modal } from '../../components/ui/index.jsx'
import { Plus, Search, Shield, AlertCircle, RefreshCw, Edit2, Users, Building2 } from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/patients/departments/')
      setDepartments(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load surgical departments'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  const openAddModal = () => {
    setEditingDept(null)
    setFormData({
      name: '',
      description: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (dept) => {
    setEditingDept(dept)
    setFormData({
      name: dept.name || '',
      description: dept.description || '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Department name is required')
      return
    }

    try {
      setSubmitting(true)
      if (editingDept) {
        // Update department
        const payload = {
          name: formData.name.trim(),
          description: formData.description.trim(),
        }
        await api.patch(`/patients/departments/${editingDept.id}/`, payload)
        toast.success(`Department "${formData.name}" updated successfully`)
      } else {
        // Create new department
        const payload = {
          name: formData.name.trim(),
          description: formData.description.trim(),
        }
        await api.post('/patients/departments/', payload)
        toast.success(`Department "${formData.name}" established successfully`)
      }

      setIsModalOpen(false)
      fetchDepartments()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const errorMsg = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ')
        toast.error(errorMsg || 'Failed to save department')
      } else {
        toast.error(err.message || 'Network error occurred while saving department')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredDepts = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.description?.toLowerCase().includes(search.toLowerCase()) ||
        d.head_name?.toLowerCase().includes(search.toLowerCase())
      return matchesSearch
    })
  }, [departments, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDepartments}
              disabled={loading}
              className="h-9 px-3 border border-border bg-surface text-text hover:bg-surface-muted rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Refresh Departments"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={openAddModal}
              className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} /> Add Department
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
            onClick={fetchDepartments}
            className="underline font-semibold hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search department by specialty, director, or ward..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Department Name</th>
                  <th className="p-3">Clinical Director / Lead</th>
                  <th className="p-3">Active Patients</th>
                  <th className="p-3">Staffing (Doctors / Caregivers)</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-primary" />
                        <span>Loading surgical departments from clinical database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDepts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-text-muted">
                      <Building2 size={36} className="mx-auto mb-2 text-text-muted/40" />
                      <p className="font-semibold text-text">No departments found</p>
                      <p className="text-2xs text-text-muted mt-1">
                        {search
                          ? 'Try adjusting your search criteria.'
                          : 'Configure your first surgical department or clinical division.'}
                      </p>
                      {!search && (
                        <button
                          onClick={openAddModal}
                          className="mt-3 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary-hover inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus size={13} /> Add Department
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDepts.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-primary flex items-center gap-1.5">
                          <Shield size={14} className="text-primary flex-shrink-0" />
                          <span>{d.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-text-secondary">
                        {d.head_name || 'Not assigned'}
                      </td>
                      <td className="p-3 font-bold text-text tabular-nums">
                        {d.patients_count ?? 0}
                      </td>
                      <td className="p-3 text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} />
                          <span>
                            {d.doctors_count ?? 0} Doctors · {d.caregivers_count ?? d.nurses_count ?? 0} Caregivers
                          </span>
                        </span>
                      </td>
                      <td className="p-3 text-text-muted max-w-xs truncate">
                        {d.description || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => openEditModal(d)}
                          className="px-2.5 py-1 text-xs text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Configure
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingDept ? 'Configure Surgical Department' : 'Establish New Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-text mb-1">
              Department Specialty Name <span className="text-status-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Orthopedic Surgery & Traumatology"
              className="w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium text-text mb-1">Clinical Scope & Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Inpatient arthroplasty, joint restoration, fracture management, and outpatient follow-up care."
              className="w-full p-2 bg-surface border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

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
              <span>{editingDept ? 'Save Configuration' : 'Create Department'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
