import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  LayoutDashboard, Users, FileText, Pill, Calendar, Activity, AlertTriangle,
  MessageSquare, BarChart2, User, Settings, ChevronLeft, ChevronRight,
  Bell, Search, LogOut, Menu, X, Brain, Network, Shield, Home, CheckCheck, Info
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const cn = (...a) => twMerge(clsx(...a))

function Logo({ compact = false }) {
  return (
    <div className={cn('flex items-center gap-2', compact && 'justify-center')}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#1D5FD1" />
        <path d="M16 6v20M6 16h20" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <path d="M22 10 C26 10 28 13 28 16" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="28" cy="14" r="2" fill="#93C5FD" />
      </svg>
      {!compact && (
        <div>
          <div className="text-sm font-bold text-text leading-none">PostCare AI</div>
          <div className="text-2xs text-text-muted leading-none mt-0.5">Recovery Management</div>
        </div>
      )}
    </div>
  )
}

function getNavItems(role) {
  const common = { dashboard: { icon: LayoutDashboard, label: 'Dashboard' } }
  const navMap = {
    patient: [
      { section: 'My Care', items: [
        { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/patient/recovery', icon: Activity, label: 'Recovery' },
        { to: '/patient/discharge-plan', icon: FileText, label: 'Discharge Plan' },
        { to: '/patient/medications', icon: Pill, label: 'Medications' },
        { to: '/patient/follow-ups', icon: Calendar, label: 'Follow-ups' },
      ]},
      { section: 'Communication', items: [
        { to: '/patient/messages', icon: MessageSquare, label: 'Messages' },
        { to: '/patient/notifications', icon: Bell, label: 'Notifications' },
      ]},
      { section: 'Account', items: [
        { to: '/patient/profile', icon: User, label: 'Profile' },
      ]},
    ],
    doctor: [
      { section: 'Care', items: [
        { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/doctor/patients', icon: Users, label: 'Patients' },
        { to: '/doctor/discharge-plans', icon: FileText, label: 'Discharge Plans' },
        { to: '/doctor/follow-ups', icon: Calendar, label: 'Follow-ups' },
      ]},
      { section: 'Monitoring & Alerts', items: [
        { to: '/doctor/risk-predictions', icon: Brain, label: 'Risk Predictions' },
        { to: '/doctor/alerts', icon: AlertTriangle, label: 'Alerts' },
        { to: '/doctor/notifications', icon: Bell, label: 'Notifications' },
      ]},
      { section: 'Communication', items: [
        { to: '/doctor/messages', icon: MessageSquare, label: 'Messages' },
        { to: '/doctor/reports', icon: BarChart2, label: 'Reports' },
      ]},
    ],
    nurse: [
      { section: 'Care', items: [
        { to: '/nurse/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/nurse/patients', icon: Users, label: 'Patients' },
        { to: '/nurse/recovery', icon: Activity, label: 'Recovery' },
        { to: '/nurse/follow-ups', icon: Calendar, label: 'Follow-ups' },
        { to: '/nurse/alerts', icon: AlertTriangle, label: 'Alerts' },
      ]},
    ],
    admin: [
      { section: 'Overview', items: [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
      ]},
      { section: 'Administration', items: [
        { to: '/admin/users', icon: Users, label: 'Users' },
        { to: '/admin/doctors', icon: User, label: 'Doctors' },
        { to: '/admin/nurses', icon: User, label: 'Nurses' },
        { to: '/admin/departments', icon: Shield, label: 'Departments' },
        { to: '/admin/settings', icon: Settings, label: 'Settings' },
      ]},
      { section: 'AI & System', items: [
        { to: '/admin/ml-evaluation', icon: Brain, label: 'ML Evaluation' },
        { to: '/admin/architecture', icon: Network, label: 'Architecture' },
      ]},
    ],
    caregiver: [
      { section: 'My Dashboard', items: [
        { to: '/caregiver/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/caregiver/notifications', icon: Bell, label: 'Notifications' },
      ]},
    ],
  }
  return navMap[role] || []
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const navSections = getNavItems(user?.role)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.get('/notifications/')
      if (Array.isArray(res.data)) {
        setNotifications(res.data)
      }
    } catch (err) {
      // Silently catch
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notifOpen])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read/`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (e) {}
  }

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all/')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (e) {}
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      'flex flex-col bg-white border-r border-border h-full transition-all duration-200',
      mobile ? 'w-64' : collapsed ? 'w-18' : 'w-sidebar'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <Logo compact={collapsed && !mobile} />
        </Link>
        {!mobile && (
          <button onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted ml-1">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Main navigation">
        {navSections.map(section => (
          <div key={section.section} className="mb-4">
            {(!collapsed || mobile) && (
              <p className="px-2 pb-1 text-2xs font-medium text-text-muted uppercase tracking-wider">{section.section}</p>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.to} to={item.to}
                aria-current={({ isActive }) => isActive ? 'page' : undefined}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors mb-0.5',
                  'relative overflow-hidden',
                  isActive
                    ? 'bg-primary-tint text-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-primary'
                    : 'text-text-secondary hover:bg-surface-muted hover:text-text'
                )}
              >
                <item.icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
                {(!collapsed || mobile) && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {(!collapsed || mobile) && (
        <div className="p-3 border-t border-border">
          <p className="text-2xs text-text-muted text-center">PostCare AI Platform</p>
        </div>
      )}
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0" style={{ width: collapsed ? 72 : 248 }}>
        <div className="fixed h-full" style={{ width: collapsed ? 72 : 248 }}>
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 h-full"><Sidebar mobile /></div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-topbar bg-white border-b border-border flex items-center px-4 md:px-6 gap-4 flex-shrink-0 sticky top-0 z-30">
          <button className="md:hidden p-2 text-text-muted hover:text-text" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search… (/ to focus)" className="w-full h-9 pl-8 pr-3 text-sm bg-surface-muted border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notification Bell with interactive Popover */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label={`Notifications (${unreadCount} unread)`}
                className={cn(
                  'relative p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                  notifOpen && 'bg-surface-muted text-text'
                )}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Popover */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fadeIn">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-muted/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text">Clinical Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-danger-tint text-danger rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-primary hover:text-primary-hover font-semibold transition-colors flex items-center gap-1"
                      >
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-text-muted">
                        No notifications currently active
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isHighRisk = n.type === 'high_risk_alert'
                        const isMed = n.type === 'medication_reminder'
                        const isFollowup = n.type === 'followup_reminder'
                        const isCheckin = n.type === 'checkin_reminder'

                        return (
                          <div
                            key={n.id}
                            onClick={() => !n.is_read && handleMarkRead(n.id)}
                            className={cn(
                              'p-3.5 flex items-start gap-3 hover:bg-surface-muted/50 transition-colors cursor-pointer text-left',
                              !n.is_read && 'bg-primary-tint/20'
                            )}
                          >
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                                isHighRisk ? 'bg-danger-tint text-danger' :
                                isMed ? 'bg-primary-tint text-primary' :
                                isFollowup ? 'bg-secondary-tint text-secondary' :
                                isCheckin ? 'bg-success-tint text-success' :
                                'bg-surface-muted text-text-muted'
                              )}
                            >
                              {isHighRisk ? <AlertTriangle size={15} /> :
                               isMed ? <Pill size={15} /> :
                               isFollowup ? <Calendar size={15} /> :
                               isCheckin ? <Activity size={15} /> :
                               <Info size={15} />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-1">
                                <p className={cn('text-xs line-clamp-1', !n.is_read ? 'font-bold text-text' : 'font-medium text-text-secondary')}>
                                  {n.title}
                                </p>
                                {!n.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-text-muted/80 block mt-1">
                                {new Date(n.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="p-2.5 border-t border-border text-center bg-surface-muted/20">
                    <Link
                      to={user?.role === 'doctor' ? '/doctor/notifications' : user?.role === 'patient' ? '/patient/notifications' : '/doctor/alerts'}
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-primary hover:text-primary-hover block py-0.5"
                    >
                      View All Notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-text leading-none">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-text-muted capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-text-muted hover:text-danger transition-colors" title="Log out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="max-w-content mx-auto px-4 md:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
