import React, { useState, useEffect } from 'react'
import { PageHeader, Card, CardBody, Modal } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import { Plus, Search, Filter, ShieldCheck, Check, X, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import { toast } from 'sonner'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  const filteredUsers = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''} ${u.username || ''}`.toLowerCase()
    const email = (u.email || '').toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Identity & Role Governance"
        description="Provision, activate, deactivate, and audit access credentials across all hospital roles"
        action={
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} /> Add User Account
          </button>
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
                  <th className="p-3">Account Status</th>
                  <th className="p-3">Joined Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-text-muted">Loading user directory...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-text-muted">No user accounts found matching query.</td>
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
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${u.is_active ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted">
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="p-3 text-right">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

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
