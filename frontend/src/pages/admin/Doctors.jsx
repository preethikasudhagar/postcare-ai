import React from 'react'
import { PageHeader, Card, CardBody } from '../../components/ui/index.jsx'
import { Plus, User, Stethoscope } from 'lucide-react'

export default function AdminDoctors() {
  const doctors = [
    { id: 'DOC-01', name: 'Dr. Rajesh Varma', spec: 'Orthopedic Surgery', dept: 'Orthopedics', license: 'MCI-748291-K', activePatients: 28 },
    { id: 'DOC-02', name: 'Dr. Anand Deshmukh', spec: 'Cardiothoracic Surgery', dept: 'Cardiology', license: 'MCI-581934-M', activePatients: 19 },
    { id: 'DOC-03', name: 'Dr. Shalini Gupta', spec: 'General & Laparoscopic Surgery', dept: 'General Surgery', license: 'MCI-910283-D', activePatients: 34 },
    { id: 'DOC-04', name: 'Dr. Sanjay Kulkarni', spec: 'Neurosurgery & Spine', dept: 'Neurology', license: 'MCI-382910-B', activePatients: 15 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultant Surgical Faculty"
        description="Manage credentialed attending surgeons, departmental assignments, and patient loads"
        action={
          <button className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-xs">
            <Plus size={14} /> Add Surgeon
          </button>
        }
      />

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Doctor Name</th>
                  <th className="p-3">Specialization & Dept</th>
                  <th className="p-3">License Number</th>
                  <th className="p-3">Active Monitored Patients</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {doctors.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3 font-semibold text-text">{d.name}</td>
                    <td className="p-3 text-text-secondary">{d.spec} ({d.dept})</td>
                    <td className="p-3 font-mono text-2xs text-text-muted">{d.license}</td>
                    <td className="p-3 font-bold text-primary tabular-nums">{d.activePatients} patients</td>
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
