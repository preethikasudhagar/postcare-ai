import React, { useState } from 'react'
import { PageHeader, Card, CardBody } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import { Plus, Search, Filter, ShieldCheck, Check, X } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Rahul Kumar', email: 'patient@postcare.demo', role: 'patient', active: true, joined: '04 Sep 2026' },
    { id: 2, name: 'Dr. Rajesh Varma', email: 'doctor@postcare.demo', role: 'doctor', active: true, joined: '01 Sep 2026' },
    { id: 3, name: 'Nurse Priya Nair', email: 'nurse1@postcare.demo', role: 'nurse', active: true, joined: '01 Sep 2026' },
    { id: 4, name: 'Sunita Kumar', email: 'caregiver@postcare.demo', role: 'caregiver', active: true, joined: '04 Sep 2026' },
    { id: 5, name: 'System Administrator', email: 'admin@postcare.demo', role: 'admin', active: true, joined: '01 Sep 2026' },
  ])

  const toggleStatus = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, active: !u.active } : u))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Identity & Role Governance"
        description="Provision, activate, deactivate, and audit access credentials across all hospital roles"
        action={
          <button className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs">
            <Plus size={14} /> Add User Account
          </button>
        }
      />

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
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3 font-semibold text-text">{u.name}</td>
                    <td className="p-3 text-text-secondary font-mono text-2xs">{u.email}</td>
                    <td className="p-3"><StatusBadge status={u.role} /></td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${u.active ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'}`}>
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3 text-text-muted">{u.joined}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => toggleStatus(u.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          u.active
                            ? 'text-danger border border-danger/30 hover:bg-danger-tint'
                            : 'text-success border border-success/30 hover:bg-success-tint'
                        }`}
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
