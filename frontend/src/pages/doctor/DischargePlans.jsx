import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardBody } from '../../components/ui/index.jsx'
import { StatusBadge } from '../../components/ui/Badge.jsx'
import { FileText, Plus, Search, Printer, Edit3 } from 'lucide-react'

export default function DischargePlans() {
  const [plans, setPlans] = useState([
    { id: 'DP-801', patient: 'Rahul Kumar', uhid: 'P-102', surgery: 'Total Knee Arthroplasty (L)', date: '06 Sep 2026', version: 1.2, status: 'published' },
    { id: 'DP-802', patient: 'Vikram Mehta', uhid: 'P-101', surgery: 'Cardiac Bypass (CABG)', date: '08 Sep 2026', version: 1.0, status: 'published' },
    { id: 'DP-803', patient: 'Anil Sengupta', uhid: 'P-104', surgery: 'Spinal Lumbar Fusion', date: '06 Sep 2026', version: 1.1, status: 'published' },
    { id: 'DP-804', patient: 'Meera Nambiar', uhid: 'P-109', surgery: 'Cholecystectomy', date: 'Today', version: 0.9, status: 'draft' },
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Post-Operative Discharge Plans Repository"
        description="Create, review, edit, and digitally sign multi-disciplinary surgical discharge plans"
        action={
          <Link
            to="/doctor/discharge-plans/new"
            className="inline-flex items-center gap-1.5 h-10 px-4 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-hover shadow-xs transition-colors"
          >
            <Plus size={14} /> Create New Plan
          </Link>
        }
      />

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Plan Reference & ID</th>
                  <th className="p-3">Patient Name & UHID</th>
                  <th className="p-3">Surgical Procedure</th>
                  <th className="p-3">Discharge Date</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted/60 transition-colors">
                    <td className="p-3 font-semibold text-primary">{p.id}</td>
                    <td className="p-3">
                      <strong className="block text-text">{p.patient}</strong>
                      <span className="text-2xs text-text-muted">{p.uhid}</span>
                    </td>
                    <td className="p-3 font-medium text-text">{p.surgery}</td>
                    <td className="p-3 text-text-secondary">{p.date}</td>
                    <td className="p-3 font-mono text-2xs">v{p.version}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    <td className="p-3 text-right space-x-2">
                      <Link
                        to="/patient/discharge-plan"
                        className="inline-block px-2.5 py-1 text-xs font-medium text-text border border-border rounded hover:bg-surface-muted transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        to={`/doctor/discharge-plans/${p.id}/edit`}
                        className="inline-block px-2.5 py-1 text-xs font-medium text-primary bg-primary-tint rounded hover:bg-primary hover:text-white transition-colors"
                      >
                        Edit
                      </Link>
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
