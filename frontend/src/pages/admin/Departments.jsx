import React from 'react'
import { PageHeader, Card, CardBody } from '../../components/ui/index.jsx'
import { Plus, Shield } from 'lucide-react'

export default function AdminDepartments() {
  const depts = [
    { id: 1, name: 'Orthopedic Surgery', head: 'Dr. Rajesh Varma', patients: 48, doctors: 4, nurses: 8 },
    { id: 2, name: 'Cardiology & CTVS', head: 'Dr. Anand Deshmukh', patients: 32, doctors: 3, nurses: 6 },
    { id: 3, name: 'General & GI Surgery', head: 'Dr. Shalini Gupta', patients: 54, doctors: 5, nurses: 10 },
    { id: 4, name: 'Neurosurgery & Spine', head: 'Dr. Sanjay Kulkarni', patients: 22, doctors: 2, nurses: 4 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Surgical Departments"
        description="Configure surgical departments, clinical directors, and ward bed allocations"
        action={
          <button className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs">
            <Plus size={14} /> Add Department
          </button>
        }
      />

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Department Name</th>
                  <th className="p-3">Department Head</th>
                  <th className="p-3">Active Patients</th>
                  <th className="p-3">Staffing (Docs / Nurses)</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {depts.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3 font-semibold text-primary">{d.name}</td>
                    <td className="p-3 text-text-secondary">{d.head}</td>
                    <td className="p-3 font-bold text-text tabular-nums">{d.patients}</td>
                    <td className="p-3 text-text-muted">{d.doctors} Doctors · {d.nurses} Nurses</td>
                    <td className="p-3 text-right">
                      <button className="px-2.5 py-1 text-xs text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors">
                        Configure
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
