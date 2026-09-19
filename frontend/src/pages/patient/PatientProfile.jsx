import React, { useState } from 'react'
import { PageHeader, Card, CardHeader, CardBody, Avatar } from '../../components/ui/index.jsx'
import { RiskBadge } from '../../components/ui/Badge.jsx'
import { User, Phone, Mail, MapPin, Calendar, Heart, ShieldAlert, Edit2, Check, Lock } from 'lucide-react'

export default function PatientProfile() {
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('+91 98765 43210')
  const [address, setAddress] = useState('Flat 402, Green Glen Heights, Outer Ring Road, Bengaluru 560103')
  const [emergencyContact, setEmergencyContact] = useState('Sunita Kumar (Wife) - +91 98765 43211')

  return (
    <div className="max-w-form mx-auto space-y-6">
      <PageHeader
        title="Patient Identity & Clinical Profile"
        description="Personal demographics, emergency contacts, and surgical record details"
        action={
          <button
            onClick={() => setEditing(e => !e)}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-xs font-medium rounded-sm hover:bg-primary-hover shadow-xs transition-colors"
          >
            {editing ? <><Check size={14} /> Save Changes</> : <><Edit2 size={14} /> Edit Profile</>}
          </button>
        }
      />

      {/* Identity Card */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <Avatar name="Rahul Kumar" size="xl" />
            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <h2 className="text-xl font-bold text-text">Rahul Kumar</h2>
                <RiskBadge level="low" />
              </div>
              <p className="text-xs text-text-muted">Patient ID: <strong className="text-text">P-2026-8941</strong> · Age: 54 Yrs · Gender: Male</p>
              <p className="text-xs text-text-secondary">Blood Group: <strong>O+ Positive</strong></p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Grouped Information Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader title="Contact & Residence" />
          <CardBody>
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-text-muted block mb-1">Email Address (Account ID)</label>
                <div className="flex items-center gap-2 p-2 bg-surface-muted rounded border border-border text-text">
                  <Mail size={14} className="text-text-muted" /> patient@postcare.demo
                </div>
              </div>
              <div>
                <label className="text-text-muted block mb-1">Phone Number</label>
                {editing ? (
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 text-xs border border-border-strong rounded focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-surface-muted rounded border border-border text-text">
                    <Phone size={14} className="text-text-muted" /> {phone}
                  </div>
                )}
              </div>
              <div>
                <label className="text-text-muted block mb-1">Residential Address</label>
                {editing ? (
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2 text-xs border border-border-strong rounded focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="flex items-start gap-2 p-2 bg-surface-muted rounded border border-border text-text">
                    <MapPin size={14} className="text-text-muted mt-0.5" /> {address}
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Emergency & Surgical Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Emergency Contact" />
            <CardBody>
              <div>
                <label className="text-text-muted text-xs block mb-1">Primary Next of Kin</label>
                {editing ? (
                  <input
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full p-2 text-xs border border-border-strong rounded focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="p-2.5 bg-danger-tint/30 border border-danger/20 rounded text-xs text-text font-medium">
                    {emergencyContact}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Locked Surgical Record"
              action={<span className="text-2xs text-text-muted flex items-center gap-1"><Lock size={11} /> Admin locked</span>}
            />
            <CardBody>
              <div className="space-y-2 text-xs text-text-secondary">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-muted">Procedure:</span>
                  <strong className="text-text">Total Knee Arthroplasty (L)</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-muted">Surgery Date:</span>
                  <strong className="text-text">04 Sep 2026</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-muted">Discharge Date:</span>
                  <strong className="text-text">06 Sep 2026</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Primary Surgeon:</span>
                  <strong className="text-text">Dr. Rajesh Varma (Ortho)</strong>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
