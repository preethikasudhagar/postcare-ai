import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Activity, Brain, Pill, Calendar, Bell,
  Shield, Lock, Server, Database, ChevronRight, Menu, X,
  User, Stethoscope, HeartPulse, UserCheck, ArrowRight
} from 'lucide-react'

function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1D5FD1" />
            <path d="M16 6v20M6 16h20" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <path d="M22 10 C26 10 28 13 28 16" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="28" cy="14" r="2" fill="#93C5FD" />
          </svg>
          <span className="text-base font-bold text-text">PostCare AI</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {['Features','How It Works','About'].map(s => (
            <a key={s} href={`#${s.toLowerCase().replace(' ','-')}`}
              className="text-sm text-text-secondary hover:text-primary transition-colors">{s}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="h-9 px-4 text-sm font-medium text-text border border-border-strong rounded-sm hover:bg-surface-muted transition-colors">Log in</Link>
          <Link to="/register" className="h-9 px-4 text-sm font-medium text-white bg-primary rounded-sm hover:bg-primary-hover transition-colors">Get started</Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(o => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-white px-4 py-4 space-y-2">
          {['Features','How It Works','About'].map(s => (
            <a key={s} href={`#${s.toLowerCase().replace(' ','-')}`}
              className="block py-2 text-sm text-text-secondary" onClick={() => setOpen(false)}>{s}</a>
          ))}
          <Link to="/login" className="block py-2 text-sm font-medium text-primary">Log in</Link>
          <Link to="/register" className="block w-full h-10 bg-primary text-white text-sm font-medium rounded-sm text-center leading-10">Get started</Link>
        </div>
      )}
    </nav>
  )
}

const features = [
  { icon: FileText, title: 'Personalized Discharge Planning', desc: 'Doctors create detailed post-operative discharge plans with medications, activity restrictions, and wound care instructions.' },
  { icon: Activity, title: 'Daily Recovery Tracking', desc: 'Patients submit daily check-ins covering pain levels, temperature, wound condition, and symptoms through a guided form.' },
  { icon: Brain, title: 'ML-Based Risk Classification', desc: 'A Random Forest classifier processes recovery parameters to classify risk as Low, Medium, or High — decision support only.' },
  { icon: Pill, title: 'Medication Management', desc: 'Track prescribed medications, mark doses as taken or missed, and monitor weekly adherence rates.' },
  { icon: Calendar, title: 'Smart Follow-Up Tracking', desc: 'Schedule, reschedule, and manage follow-up appointments. Calendar and list views with status tracking.' },
  { icon: Bell, title: 'Automated Alerts', desc: 'High-risk classifications instantly alert the care team with patient details, reason, and a direct action link.' },
]

const steps = [
  { n: 1, label: 'Discharge Plan', desc: 'Doctor creates a personalized plan at discharge.' },
  { n: 2, label: 'Daily Check-in', desc: 'Patient submits daily recovery information.' },
  { n: 3, label: 'ML Processing', desc: 'Random Forest model analyzes 7 key features.' },
  { n: 4, label: 'Risk Classification', desc: 'Output: Low, Medium, or High risk level.' },
  { n: 5, label: 'Alert Generated', desc: 'High-risk cases trigger an immediate alert.' },
  { n: 6, label: 'Follow-Up Action', desc: 'Doctor reviews and schedules follow-up care.' },
]

const roles = [
  { icon: User, title: 'Patient', color: 'text-secondary bg-secondary-tint', items: ['View discharge plan','Submit daily check-ins','Track medications','View risk classification','Message care team'] },
  { icon: Stethoscope, title: 'Doctor', color: 'text-primary bg-primary-tint', items: ['Create discharge plans','Monitor all patients','Review risk alerts','Schedule follow-ups','Add clinical notes'] },
  { icon: HeartPulse, title: 'Nurse', color: 'text-warning bg-warning-tint', items: ['Monitor assigned patients','Track check-in status','View high-risk alerts','Send reminders','Escalate to doctor'] },
  { icon: UserCheck, title: 'Caregiver', color: 'text-success bg-success-tint', items: ['View patient summary','Receive medication reminders','Get appointment alerts','View permitted risk info'] },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-tint text-primary text-xs font-medium rounded-full mb-6">
              <Brain size={12} /> Academic Healthcare Prototype
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-text leading-tight mb-4">
              Smarter Post-Operative Recovery,<br className="hidden md:block" /> From Discharge to Follow-Up
            </h1>
            <p className="text-lg text-text-secondary mb-8 leading-relaxed">
              An intelligent digital platform for personalized discharge planning, daily recovery tracking, ML-based risk classification, alerts, and follow-up management.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 h-11 px-6 bg-primary text-white font-medium rounded-sm hover:bg-primary-hover transition-colors">
                Get started <ArrowRight size={16} />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 h-11 px-6 border border-border-strong text-text font-medium rounded-sm hover:bg-surface-muted transition-colors">
                Explore platform
              </a>
            </div>
            <p className="mt-4 text-xs text-text-muted">Academic prototype with synthetic demo data.</p>
          </div>

          {/* Product preview */}
          <div className="bg-bg rounded-lg border border-border p-4 shadow-sm">
            <div className="bg-white rounded border border-border p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text">Recovery Risk Overview</span>
                <span className="text-2xs text-text-muted">Today</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3.2" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1D5FD1" strokeWidth="3.2"
                      strokeDasharray="60 100" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-text tabular-nums">7</span>
                    <span className="text-2xs text-text-muted">High risk</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[{l:'Low risk',v:94,c:'bg-success'},{l:'Medium risk',v:27,c:'bg-warning'},{l:'High risk',v:7,c:'bg-danger'}].map(r => (
                    <div key={r.l}>
                      <div className="flex justify-between text-xs mb-0.5"><span className="text-text-muted">{r.l}</span><span className="font-medium tabular-nums">{r.v}</span></div>
                      <div className="h-1.5 bg-border rounded-full"><div className={`h-1.5 ${r.c} rounded-full`} style={{width:`${r.v/(94+27+7)*100}%`}} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-danger-tint border border-danger/20 rounded p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-danger">High-Risk Alert</p>
                  <p className="text-xs text-text-secondary">Rahul Kumar · Knee Surgery · Score: 38</p>
                </div>
                <button className="text-xs text-white bg-danger px-2 py-1 rounded-sm">Review</button>
              </div>
            </div>
            <div className="bg-white border border-border rounded p-3">
              <p className="text-xs font-medium text-text mb-2">Recovery Timeline (13 days)</p>
              <div className="flex items-center gap-0.5">
                {['low','low','low','medium','low','high','medium','low','low','low','medium','low','low'].map((r,i) => (
                  <div key={i} className={`flex-1 h-3 rounded-sm ${r==='low'?'bg-chart-low/70':r==='medium'?'bg-chart-medium/70':'bg-chart-high/70'}`} title={`Day ${i+1}: ${r} risk`} />
                ))}
              </div>
              <div className="flex justify-between text-2xs text-text-muted mt-1"><span>Day 1</span><span>Today</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-bg py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text mb-3">Everything your care team needs</h2>
            <p className="text-text-secondary">Comprehensive post-operative management in one platform</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white border border-border rounded-[10px] p-5 shadow-xs hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 bg-primary-tint rounded-[8px] flex items-center justify-center mb-3">
                  <f.icon size={20} className="text-primary" strokeWidth={1.75} />
                </div>
                <h3 className="text-md font-semibold text-text mb-1">{f.title}</h3>
                <p className="text-sm text-text-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text mb-3">How it works</h2>
            <p className="text-text-secondary">Six steps from discharge to recovery</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-border" />
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {steps.map((s, i) => (
                <div key={s.n} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-white font-bold text-lg flex items-center justify-center z-10 relative shadow-sm mb-3">
                    {s.n}
                  </div>
                  <p className="text-sm font-semibold text-text">{s.label}</p>
                  <p className="text-xs text-text-muted mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ML Section */}
      <section className="bg-bg py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-text mb-4">ML-Based Risk Classification</h2>
              <p className="text-text-secondary mb-4">The system uses a Random Forest Classifier trained on synthetic recovery data. Input features include:</p>
              <ul className="space-y-2 mb-6">
                {['Pain level (0–10)','Body temperature (°C)','Wound condition','Reported symptoms','Medication adherence','Surgery type','Days since surgery'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="p-3 bg-warning-tint border border-warning/20 rounded-[10px]">
                <p className="text-xs text-warning font-medium">Decision-support information only. Not a medical diagnosis.</p>
              </div>
            </div>
            <div className="bg-white border border-border rounded-[10px] p-6 shadow-xs">
              <p className="text-xs font-medium text-text-muted mb-4">ML Pipeline</p>
              {['Recovery data collected','Data preprocessing','Feature extraction','Random Forest Classifier','Risk classification output'].map((step, i, arr) => (
                <div key={step}>
                  <div className={`flex items-center gap-3 p-3 rounded ${i === 3 ? 'bg-primary text-white' : 'bg-surface-muted'}`}>
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${i===3?'bg-white text-primary':'bg-white text-text-muted'}`}>{i+1}</span>
                    <span className={`text-sm font-medium ${i===3?'text-white':'text-text'}`}>{step}</span>
                  </div>
                  {i < arr.length - 1 && <div className="ml-5 w-0.5 h-3 bg-border mx-auto" />}
                </div>
              ))}
              <div className="flex justify-around mt-4">
                {[{l:'Low risk',c:'bg-success-tint text-success'},{l:'Medium risk',c:'bg-warning-tint text-warning'},{l:'High risk',c:'bg-danger-tint text-danger'}].map(r => (
                  <span key={r.l} className={`px-2 py-1 rounded-full text-xs font-medium ${r.c}`}>{r.l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-text mb-3">Secure by design</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, label: 'JWT Authentication', desc: 'Token-based secure auth' },
              { icon: Lock, label: 'Role-based access', desc: 'Granular permissions per role' },
              { icon: Server, label: 'Secure API', desc: 'DRF with CORS protection' },
              { icon: Database, label: 'Protected data', desc: 'Encrypted passwords, no plain-text' },
            ].map(i => (
              <div key={i.label} className="text-center p-4">
                <div className="w-12 h-12 bg-primary-tint rounded-full flex items-center justify-center mx-auto mb-3">
                  <i.icon size={22} className="text-primary" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-semibold text-text">{i.label}</p>
                <p className="text-xs text-text-muted mt-1">{i.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="bg-bg py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-text mb-3">Built for every role</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map(r => (
              <div key={r.title} className="bg-white border border-border rounded-[10px] p-5 shadow-xs">
                <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center mb-3 ${r.color}`}>
                  <r.icon size={20} strokeWidth={1.75} />
                </div>
                <h3 className="text-md font-semibold text-text mb-2">{r.title}</h3>
                <ul className="space-y-1">
                  {r.items.map(i => (
                    <li key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                      <ChevronRight size={10} className="text-text-muted flex-shrink-0" />{i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to explore PostCare AI?</h2>
          <p className="text-white/80 mb-8">Sign in with a demo account to explore all features instantly.</p>
          <Link to="/login" className="inline-flex items-center gap-2 h-11 px-8 bg-white text-primary font-semibold rounded-sm hover:bg-surface-muted transition-colors">
            Try demo accounts <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text text-white py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.15)"/><path d="M16 6v20M6 16h20" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
              <span className="font-bold">PostCare AI</span>
            </div>
            <div className="flex gap-6">
              {['Features','How It Works','Login'].map(l => (
                <a key={l} href={l==='Login'?'/login':`#${l.toLowerCase().replace(' ','-')}`}
                  className="text-sm text-white/60 hover:text-white transition-colors">{l}</a>
              ))}
            </div>
            <p className="text-xs text-white/40">Academic Healthcare Prototype © 2026. Synthetic data only.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
