import React from 'react'
import { PageHeader, Card, CardBody } from '../../components/ui/index.jsx'
import { Plus, HeartPulse } from 'lucide-react'

export default function AdminNurses() {
  const nurses = [
    { id: 'NUR-01', name: 'Nurse Priya Nair', dept: 'Orthopedics & Post-Op Ward 3', license: 'KNC-84920-A', patients: 12 },
    { id: 'NUR-02', name: 'Nurse Anitha Joseph', dept: 'Cardiothoracic Step-Down', license: 'KNC-10294-B', patients: 8 },
    { id: 'NUR-03', name: 'Nurse Kavita Pillai', dept: 'General Surgery Ward 2', license: 'KNC-49201-C', patients: 14 },
    { id: 'NUR-04', name: 'Nurse Deepa Mathews', dept: 'Neurology Intensive Monitoring', license: 'KNC-39102-D', patients: 6 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nursing & Triage Coordinators"
        description="Nursing staff roster, ward assignments, and post-op care triage coordination"
        action={
          <button className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs">
            <Plus size={14} /> Add Nurse Staff
          </button>
        }
      />

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Nurse Name</th>
                  <th className="p-3">Ward & Department</th>
                  <th className="p-3">Registration No.</th>
                  <th className="p-3">Assigned Patients</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {nurses.map((n) => (
                  <tr key={n.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3 font-semibold text-text">{n.name}</td>
                    <td className="p-3 text-text-secondary">{n.dept}</td>
                    <td className="p-3 font-mono text-2xs text-text-muted">{n.license}</td>
                    <td className="p-3 font-bold text-primary tabular-nums">{n.patients} active</td>
                    <td className="p-3 text-right">
                      <button className="px-2.5 py-1 text-xs text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors">
                        Edit
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
