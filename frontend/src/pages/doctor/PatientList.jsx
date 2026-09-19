import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Card, CardBody } from '../../components/ui/index.jsx'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, User } from 'lucide-react'

export default function PatientList() {
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')

  const patients = [
    { id: 'P-101', name: 'Vikram Mehta', age: 62, gender: 'M', surgery: 'Cardiac Bypass (CABG)', date: '08 Sep 2026', day: 11, risk: 'high', score: 38, status: 'Active' },
    { id: 'P-102', name: 'Rahul Kumar', age: 54, gender: 'M', surgery: 'Total Knee Arthroplasty (L)', date: '04 Sep 2026', day: 14, risk: 'low', score: 88, status: 'Active' },
    { id: 'P-103', name: 'Priya Sharma', age: 48, gender: 'F', surgery: 'Laparoscopic Cholecystectomy', date: '11 Sep 2026', day: 8, risk: 'low', score: 92, status: 'Active' },
    { id: 'P-104', name: 'Anil Sengupta', age: 59, gender: 'M', surgery: 'Spinal Lumbar Fusion (L4-L5)', date: '06 Sep 2026', day: 13, risk: 'high', score: 42, status: 'Active' },
    { id: 'P-105', name: 'Deepa Krishnan', age: 67, gender: 'F', surgery: 'Total Hip Replacement (R)', date: '02 Sep 2026', day: 17, risk: 'medium', score: 68, status: 'Active' },
    { id: 'P-106', name: 'Amit Verma', age: 39, gender: 'M', surgery: 'ACL Reconstruction', date: '12 Sep 2026', day: 7, risk: 'low', score: 84, status: 'Active' },
    { id: 'P-107', name: 'Ramesh Patel', age: 71, gender: 'M', surgery: 'Total Knee Arthroplasty (R)', date: '05 Sep 2026', day: 14, risk: 'medium', score: 72, status: 'Active' },
    { id: 'P-108', name: 'Sunita Rao', age: 45, gender: 'F', surgery: 'Appendectomy', date: '13 Sep 2026', day: 6, risk: 'high', score: 45, status: 'Active' },
  ]

  const filtered = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.surgery.toLowerCase().includes(search.toLowerCase())
    const matchesRisk = riskFilter === 'all' || p.risk === riskFilter
    return matchesSearch && matchesRisk
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Post-Operative Patients Directory"
        description="Comprehensive directory of monitored surgical patients with live AI risk indicators"
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or procedure..."
            className="w-full h-9 pl-8 pr-3 text-xs bg-surface-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-text-muted flex items-center gap-1"><Filter size={13} /> Filter Risk:</span>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="h-9 px-3 text-xs border border-border rounded bg-white text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Risk Categories</option>
            <option value="high">High Risk (Attention)</option>
            <option value="medium">Medium Risk (Monitoring)</option>
            <option value="low">Low Risk (Normal)</option>
          </select>
        </div>
      </div>

      {/* Patients Data Table */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary border-b border-border font-semibold">
                <tr>
                  <th className="p-3">Patient Name & ID</th>
                  <th className="p-3">Demographics</th>
                  <th className="p-3">Procedure</th>
                  <th className="p-3">Post-Op Timeline</th>
                  <th className="p-3">ML Risk Level</th>
                  <th className="p-3">Recovery Score</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted/60 transition-colors">
                    <td className="p-3">
                      <strong className="block text-text font-semibold">{p.name}</strong>
                      <span className="text-2xs text-text-muted">{p.id}</span>
                    </td>
                    <td className="p-3 text-text-secondary">{p.age} Yrs · {p.gender}</td>
                    <td className="p-3 font-medium text-text">{p.surgery}</td>
                    <td className="p-3">
                      <span className="font-semibold text-primary">Day {p.day}</span>
                      <span className="text-2xs text-text-muted block">{p.date}</span>
                    </td>
                    <td className="p-3"><RiskBadge level={p.risk} /></td>
                    <td className="p-3">
                      <strong className={`tabular-nums ${p.score < 50 ? 'text-danger' : p.score < 80 ? 'text-warning' : 'text-success'}`}>
                        {p.score} / 100
                      </strong>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        to={`/doctor/patients/${p.id}`}
                        className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-tint hover:bg-primary hover:text-white rounded transition-colors"
                      >
                        Open Record
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
