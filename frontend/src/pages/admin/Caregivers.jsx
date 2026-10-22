import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader, Card, CardBody, Modal } from '../../components/ui/index.jsx'
import { Plus, Search, HeartHandshake, AlertCircle, RefreshCw, Edit2, CheckCircle, Shield } from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'

const RELATIONSHIP_OPTIONS = [
  'Primary Caregiver',
  'Spouse',
  'Parent',
  'Child / Adult Dependent',
  'Sibling',
  'Legal Guardian',
  'Relative',
  'Friend',
  'Professional Care Aide'
]

export default function AdminCaregivers() {
  const [caregivers, setCaregivers] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCaregiver, setEditingCaregiver] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    patient: '',
    relationship: 'Primary Caregiver',
    password: '',
    is_primary: true,
    is_active: true
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [caregiversRes, patientsRes] = await Promise.all([
        api.get('/patients/caregivers/'),
        api.get('/patients/')
      ])
      setCaregivers(Array.isArray(caregiversRes.data) ? caregiversRes.data : caregiversRes.data.results || [])
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : patientsRes.data.results || [])
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load caregivers and patient directory'
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
    setEditingCaregiver(null)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      patient: patients[0]?.id ? String(patients[0].id) : '',
      relationship: 'Primary Caregiver',
      password: '',
      is_primary: true,
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (cg) => {
    setEditingCaregiver(cg)
    const [firstName = '', ...lastParts] = (cg.full_name || '').split(' ')
    const lastName = lastParts.join(' ')

    setFormData({
      first_name: firstName,
      last_name: lastName,
      email: cg.email || '',
      phone: cg.phone || '',
      patient: cg.patient ? String(cg.patient) : '',
      relationship: cg.relationship || 'Primary Caregiver',
      password: '',
      is_primary: cg.is_primary ?? true,
      is_active: cg.is_active ?? true
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('First and last name are required')
      return
    }

    if (!editingCaregiver && !formData.email.trim()) {
      toast.error('Email address is required')
      return
    }

    try {
      setSubmitting(true)
      if (editingCaregiver) {
        // Update caregiver profile
        const payload = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          relationship: formData.relationship.trim(),
          patient: formData.patient ? parseInt(formData.patient, 10) : null,
          is_primary: formData.is_primary,
          is_active: formData.is_active
        }
        await api.patch(`/patients/caregivers/${editingCaregiver.id}/`, payload)
        toast.success(`Caregiver ${formData.first_name} ${formData.last_name} updated successfully`)
      } else {
        // Create new caregiver
        const payload = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          relationship: formData.relationship.trim(),
          patient: formData.patient ? parseInt(formData.patient, 10) : null,
          password: formData.password || undefined
        }
        await api.post('/patients/caregivers/', payload)
        toast.success(`Caregiver ${formData.first_name} ${formData.last_name} provisioned successfully`)
      }

      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const errorMsg = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ')
        toast.error(errorMsg || 'Failed to save caregiver')
      } else {
        toast.error(err.message || 'Network error occurred while saving caregiver')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCaregivers = useMemo(() => {
    return caregivers.filter((c) => {
      const fullName = (c.full_name || '').toLowerCase()
      const email = (c.email || '').toLowerCase()
      const relationship = (c.relationship || '').toLowerCase()
      const patientName = (c.patient_name || '').toLowerCase()
      const patientUhid = (c.patient_uhid || '').toLowerCase()
      const q = search.toLowerCase()

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        relationship.includes(q) ||
        patientName.includes(q) ||
        patientUhid.includes(q)
      )
    })
  }, [caregivers, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caregivers"
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
              <Plus size={14} /> Add Caregiver
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
            placeholder="Search caregiver by name, email, relationship, or patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Caregivers Roster Card */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Caregiver Name</th>
                  <th className="p-3">Relationship</th>
                  <th className="p-3">Assigned Patient</th>
                  <th className="p-3">Contact Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-primary" />
                        <span>Loading caregivers...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCaregivers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <HeartHandshake size={24} className="text-text-muted opacity-40 mb-1" />
                        <span className="font-medium text-text">No caregivers found</span>
                        <span className="text-2xs">
                          {search
                            ? 'Try adjusting your search criteria.'
                            : 'Click "Add Caregiver" to register a family member or caregiver.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCaregivers.map((cg) => (
                    <tr key={cg.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {(cg.full_name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-text">{cg.full_name}</div>
                            <div className="text-2xs text-text-muted">{cg.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-surface-muted border border-border text-text">
                          {cg.relationship || 'Primary Caregiver'}
                        </span>
                      </td>

                      <td className="p-3">
                        {cg.patient_name ? (
                          <div>
                            <span className="font-medium text-text">{cg.patient_name}</span>
                            {cg.patient_uhid && (
                              <span className="text-2xs text-text-muted block">({cg.patient_uhid})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted italic">Unassigned</span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-2xs text-text-muted">
                        {cg.phone || '—'}
                      </td>

                      <td className="p-3">
                        {cg.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-status-success/10 text-status-success">
                            <CheckCircle size={10} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-surface-muted text-text-muted">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => openEditModal(cg)}
                          className="p-1.5 hover:bg-surface-muted rounded border border-border text-text-secondary hover:text-text transition-colors"
                          title="Edit Caregiver"
                        >
                          <Edit2 size={13} />
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

      {/* Add / Edit Caregiver Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCaregiver ? 'Edit Caregiver Profile' : 'Add Caregiver'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-text mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Sunita"
              />
            </div>
            <div>
              <label className="block font-medium text-text mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Kumar"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-text mb-1">Email Address *</label>
              <input
                type="email"
                required
                disabled={!!editingCaregiver}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                placeholder="caregiver@example.com"
              />
            </div>
            <div>
              <label className="block font-medium text-text mb-1">Contact Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-text mb-1">Assigned Patient</label>
              <select
                value={formData.patient}
                onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Unassigned —</option>
                {patients.map((p) => {
                  const pName = p.full_name || `${p.user?.first_name || ''} ${p.user?.last_name || ''}`.trim() || p.patient_id
                  return (
                    <option key={p.id} value={String(p.id)}>
                      {pName} ({p.patient_id})
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block font-medium text-text mb-1">Relationship to Patient</label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!editingCaregiver && (
            <div>
              <label className="block font-medium text-text mb-1">Initial Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2 bg-surface border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Temporary login password"
              />
            </div>
          )}

          {editingCaregiver && (
            <div className="pt-2 flex items-center justify-between border-t border-border">
              <label className="font-medium text-text">Account Active Status</label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary rounded border-border"
              />
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 border border-border rounded text-text hover:bg-surface-muted transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-primary text-white rounded font-semibold hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingCaregiver ? 'Save Changes' : 'Provision Caregiver'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
