import React, { useState, useEffect, useRef, useCallback } from 'react'
import { PageHeader, Avatar } from '../../components/ui/index.jsx'
import {
  Send,
  Search,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  ChevronLeft,
  UserCheck,
  ShieldAlert,
  Sparkles
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

function formatMessageTime(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatConversationDate(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    const now = new Date()
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function PatientMessages() {
  const { user } = useAuth()
  
  // Data states
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)

  // Status flags
  const [hasPatientProfile, setHasPatientProfile] = useState(true)
  const [hasCareTeam, setHasCareTeam] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  // Loading & error states
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const activeConvIdRef = useRef(activeConvId)
  activeConvIdRef.current = activeConvId
  const selectedContactRef = useRef(selectedContact)
  selectedContactRef.current = selectedContact

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // 1. Fetch patient's authorized care-team contacts & existing conversations
  const fetchCareTeamAndConversations = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      setError(null)

      const [careTeamRes, convRes] = await Promise.allSettled([
        api.get('/messages/care-team/'),
        api.get('/messages/conversations/')
      ])

      let contactList = []
      let convList = []

      if (careTeamRes.status === 'fulfilled' && careTeamRes.value.data) {
        const ctData = careTeamRes.value.data
        setHasPatientProfile(ctData.has_patient_profile !== false)
        setHasCareTeam(ctData.has_care_team !== false)
        setStatusMessage(ctData.message || '')
        contactList = Array.isArray(ctData.contacts) ? ctData.contacts : []
      }

      if (convRes.status === 'fulfilled' && Array.isArray(convRes.value.data)) {
        convList = convRes.value.data
      }

      // Merge: match conversations with care-team contacts
      const mergedMap = new Map()

      // First add all care team contacts
      contactList.forEach((c) => {
        mergedMap.set(c.user_id, {
          id: c.user_id,
          user_id: c.user_id,
          name: c.name,
          email: c.email,
          role: c.role,
          title: c.title,
          department: c.department,
          specialty: c.specialty,
          online: c.online,
          is_primary: c.is_primary,
          conversation_id: c.conversation_id,
          latest_message: c.latest_message,
          unread_count: c.unread_count || 0
        })
      })

      // Also merge any existing conversation whose participant wasn't in careTeamRes
      convList.forEach((conv) => {
        const other = conv.other_participant
        if (!other) return
        if (mergedMap.has(other.id)) {
          // Update conversation_id and latest message if newer
          const existing = mergedMap.get(other.id)
          existing.conversation_id = conv.id
          if (conv.latest_message) {
            existing.latest_message = conv.latest_message
          }
          existing.unread_count = conv.unread_count || existing.unread_count
        } else {
          mergedMap.set(other.id, {
            id: other.id,
            user_id: other.id,
            name: other.name,
            email: other.email,
            role: other.role,
            title: other.title || other.role,
            department: other.department,
            specialty: other.specialty,
            online: other.online,
            is_primary: false,
            conversation_id: conv.id,
            latest_message: conv.latest_message,
            unread_count: conv.unread_count || 0
          })
        }
      })

      const mergedList = Array.from(mergedMap.values())
      // Sort: primary care team first, then those with conversations, then latest message time
      mergedList.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        if (a.conversation_id && !b.conversation_id) return -1
        if (!a.conversation_id && b.conversation_id) return 1
        const timeA = new Date(a.latest_message?.sent_at || 0).getTime()
        const timeB = new Date(b.latest_message?.sent_at || 0).getTime()
        return timeB - timeA
      })

      setContacts(mergedList)

      // Auto-select initial contact if none selected
      if (mergedList.length > 0 && !selectedContactRef.current) {
        const initial = mergedList[0]
        setSelectedContact(initial)
        if (initial.conversation_id) {
          setActiveConvId(initial.conversation_id)
        }
      }
    } catch (err) {
      console.error('Failed to load care team contacts:', err)
      if (isInitial) {
        setError('Failed to load care team contacts. Please verify your connection and try again.')
      }
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  // 2. Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId, isInitial = false) => {
    if (!convId) {
      setMessages([])
      return
    }
    try {
      if (isInitial) setLoadingMessages(true)
      const res = await api.get(`/messages/conversations/${convId}/messages/`)
      const msgList = Array.isArray(res.data) ? res.data : []
      setMessages(msgList)
      if (isInitial) {
        setTimeout(() => scrollToBottom('auto'), 50)
      }
    } catch (err) {
      console.error(`Failed to load messages for conversation #${convId}:`, err)
      if (isInitial) {
        setError('Failed to load message history. Please try again.')
      }
    } finally {
      if (isInitial) setLoadingMessages(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchCareTeamAndConversations(true)
  }, [fetchCareTeamAndConversations])

  // Load messages whenever activeConvId changes
  useEffect(() => {
    if (activeConvId) {
      setError(null)
      fetchMessages(activeConvId, true)
    } else {
      setMessages([])
    }
  }, [activeConvId, fetchMessages])

  // Polling for incoming doctor/nurse replies and conversation updates every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeConvIdRef.current) {
        fetchMessages(activeConvIdRef.current, false)
      }
      fetchCareTeamAndConversations(false)
    }, 4000)

    return () => clearInterval(interval)
  }, [fetchMessages, fetchCareTeamAndConversations])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      scrollToBottom('smooth')
    }
  }, [messages.length, loadingMessages])

  // 3. Contact selection handler
  const handleSelectContact = async (contact) => {
    setSelectedContact(contact)
    setError(null)
    setShowMobileChat(true)

    if (contact.conversation_id) {
      setActiveConvId(contact.conversation_id)
    } else {
      // Proactively establish conversation on contact selection so composer is immediately ready
      setActiveConvId(null)
      setMessages([])
      try {
        const res = await api.post('/messages/conversations/', { recipient_id: contact.user_id })
        if (res.data?.id) {
          const convId = res.data.id
          setActiveConvId(convId)
          contact.conversation_id = convId
          // Update in contacts list
          setContacts((prev) =>
            prev.map((c) => (c.user_id === contact.user_id ? { ...c, conversation_id: convId } : c))
          )
        }
      } catch (err) {
        console.error('Failed to initialize conversation with contact:', err)
        // Non-blocking: conversation will also be created on send
      }
    }
  }

  // 4. Send Message Handler
  const handleSend = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }

    const trimmed = inputMsg.trim()
    if (!trimmed || sending || !selectedContact) {
      return
    }

    setSending(true)
    setError(null)
    const draftText = trimmed

    try {
      let convId = activeConvId

      // If no conversation exists yet, create it first
      if (!convId) {
        const convRes = await api.post('/messages/conversations/', {
          recipient_id: selectedContact.user_id
        })
        convId = convRes.data.id
        setActiveConvId(convId)
        setSelectedContact((prev) => ({ ...prev, conversation_id: convId }))
      }

      // Optimistic message append
      const tempId = `temp-${Date.now()}`
      const optimisticMsg = {
        id: tempId,
        content: trimmed,
        sender: user?.id,
        sender_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'You' : 'You',
        is_me: true,
        sent_at: new Date().toISOString(),
        delivery_status: 'delivered',
        is_read: false
      }

      setMessages((prev) => [...prev, optimisticMsg])
      setInputMsg('')

      // POST to backend
      const res = await api.post(`/messages/conversations/${convId}/messages/`, {
        content: trimmed
      })

      // Backend confirmed save: replace optimistic message with verified server response
      const serverMsg = res.data
      setMessages((prev) => prev.map((m) => (m.id === tempId ? serverMsg : m)))

      // Update latest message in contacts sidebar
      setContacts((prev) =>
        prev.map((c) =>
          c.user_id === selectedContact.user_id
            ? {
                ...c,
                conversation_id: convId,
                latest_message: serverMsg
              }
            : c
        )
      )

      setTimeout(() => scrollToBottom('smooth'), 50)
    } catch (err) {
      console.error('Failed to send message:', err)
      // Rollback: restore draft in input so patient does not lose text
      setInputMsg(draftText)
      // Remove optimistic temporary message
      setMessages((prev) => prev.filter((m) => !String(m.id).startsWith('temp-')))
      const errorMsg =
        err.response?.data?.content?.[0] ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to deliver message. Your draft has been preserved. Please try again.'
      setError(errorMsg)
    } finally {
      setSending(false)
    }
  }

  // Keyboard shortcut: Enter sends message, Shift+Enter inserts newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  // Search filter
  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const name = (c.name || '').toLowerCase()
    const title = (c.title || '').toLowerCase()
    const dept = (c.department || '').toLowerCase()
    const lastMsg = (c.latest_message?.content || '').toLowerCase()
    return name.includes(q) || title.includes(q) || dept.includes(q) || lastMsg.includes(q)
  })

  return (
    <div className="flex flex-col h-full space-y-4">
      <PageHeader
        title="Secure Clinical Messaging"
        description="Direct encrypted communication with your post-operative surgical and nursing care team"
      />

      {/* Global Error Banner with Actionable Dismiss / Retry */}
      {error && (
        <div className="bg-danger-tint border border-danger/30 rounded-lg p-3 text-xs text-danger flex items-center justify-between flex-shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-3 ml-3">
            <button
              onClick={() => {
                if (activeConvId) fetchMessages(activeConvId, true)
                else fetchCareTeamAndConversations(true)
              }}
              className="text-2xs font-bold uppercase underline hover:opacity-80"
            >
              Retry
            </button>
            <button
              onClick={() => setError(null)}
              className="text-2xs font-semibold uppercase hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Card Container */}
      <div className="w-full flex-1 bg-white border border-border rounded-xl shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[540px] h-[calc(100vh-210px)]">
        
        {/* Left Contacts Pane (approx 30-32% on desktop, full on mobile when active) */}
        <div
          className={`w-full md:w-[32%] lg:w-[30%] min-w-[280px] max-w-full md:max-w-[360px] border-r border-border flex flex-col bg-white h-full flex-shrink-0 ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Contacts Search Box */}
          <div className="p-3 border-b border-border bg-white flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search care team members..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-2 h-40">
                <Loader2 size={18} className="animate-spin text-primary" />
                <span>Loading clinical contacts...</span>
              </div>
            ) : !hasPatientProfile ? (
              <div className="p-6 text-center text-xs text-text-muted flex flex-col items-center justify-center h-full">
                <ShieldAlert size={28} className="text-warning mb-2" />
                <h4 className="font-semibold text-text mb-1">No Linked Profile</h4>
                <p className="text-2xs text-text-muted leading-relaxed">
                  {statusMessage || 'Your account is not yet linked to a verified patient medical record.'}
                </p>
              </div>
            ) : !hasCareTeam || contacts.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted flex flex-col items-center justify-center h-full">
                <UserCheck size={28} className="text-text-muted mb-2 opacity-60" />
                <h4 className="font-semibold text-text mb-1">Care Team Assignment Pending</h4>
                <p className="text-2xs text-text-muted leading-relaxed mb-3">
                  {statusMessage || 'No care team members have been assigned to your patient profile yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => fetchCareTeamAndConversations(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted border border-border hover:bg-border text-text rounded text-xs font-medium transition-colors"
                >
                  <RefreshCw size={12} /> Check for updates
                </button>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No care team contacts match your search.
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedContact?.user_id === contact.user_id
                const lastMsg = contact.latest_message
                return (
                  <div
                    key={contact.user_id}
                    onClick={() => handleSelectContact(contact)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-tint/60 border-l-4 border-primary'
                        : 'hover:bg-surface-muted/60'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar name={contact.name} size="md" />
                      {contact.online && (
                        <span
                          title="Online"
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-white"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-text truncate">
                          {contact.name}
                        </h4>
                        <span className="text-2xs text-text-muted flex-shrink-0">
                          {formatConversationDate(lastMsg?.sent_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-2xs text-primary font-medium truncate">
                          {contact.title || (contact.role === 'doctor' ? 'Attending Physician' : 'Care Coordinator')}
                        </span>
                        {contact.is_primary && (
                          <span className="text-[9px] px-1 py-0.2 bg-primary/10 text-primary font-bold rounded flex-shrink-0">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted truncate mt-1">
                        {lastMsg ? lastMsg.content : (
                          <span className="text-primary/80 font-medium flex items-center gap-1">
                            <Sparkles size={11} /> Start a conversation
                          </span>
                        )}
                      </p>
                    </div>
                    {contact.unread_count > 0 && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 text-2xs font-bold bg-primary text-white rounded-full">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Message Thread Pane (approx 68-70% on desktop, expands to available width) */}
        <div
          className={`flex-1 min-w-0 w-full md:w-[68%] lg:w-[70%] flex flex-col bg-surface-muted/20 h-full ${
            !showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Section A: Conversation Header (Pinned Top) */}
          <div className="flex-shrink-0 p-3.5 bg-white border-b border-border flex items-center justify-between shadow-xs z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Back Button to Contacts */}
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="md:hidden p-1.5 -ml-1 text-text-muted hover:text-text rounded-md hover:bg-surface-muted transition-colors flex items-center gap-0.5 text-xs font-medium"
                aria-label="Back to contacts list"
              >
                <ChevronLeft size={18} />
                <span>Contacts</span>
              </button>

              {selectedContact ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Avatar name={selectedContact.name} size="sm" />
                    {selectedContact.online && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-success rounded-full border border-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-text truncate">{selectedContact.name}</h3>
                      {selectedContact.is_primary && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-primary-tint text-primary font-bold rounded-full">
                          Assigned Care Lead
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-text-muted truncate">
                      {selectedContact.title || selectedContact.role}
                      {selectedContact.department ? ` · ${selectedContact.department}` : ''}
                      {selectedContact.online ? ' · Active now' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <MessageSquare size={16} />
                  <span>Select a care team contact on the left</span>
                </div>
              )}
            </div>

            {selectedContact && (
              <button
                type="button"
                onClick={() => {
                  if (activeConvId) fetchMessages(activeConvId, true)
                  else fetchCareTeamAndConversations(true)
                }}
                title="Refresh messages"
                className="p-1.5 rounded-md hover:bg-surface-muted text-text-muted hover:text-text transition-colors flex-shrink-0 ml-2"
              >
                <RefreshCw size={13} className={loadingMessages ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          {/* Section B: Message History (Independent Scroll) */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-3.5 min-h-0">
            {loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-text-muted py-12 gap-2">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span>Loading clinical message history...</span>
              </div>
            ) : !selectedContact ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-text-muted py-12">
                <MessageSquare size={32} className="text-border mb-2" />
                <span>Choose a contact on the left to start clinical messaging.</span>
              </div>
            ) : !hasCareTeam ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-text-muted py-12 text-center max-w-sm mx-auto">
                <UserCheck size={36} className="text-border mb-3" />
                <h4 className="font-semibold text-text text-sm">No Care Team Assigned</h4>
                <p className="text-2xs text-text-muted mt-1 leading-relaxed">
                  Your attending physician or surgical department coordinator has not been linked to your patient profile yet. Please reach out to hospital reception or clinical administration.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-text-muted py-12 text-center max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-primary-tint flex items-center justify-center mb-3 text-primary">
                  <MessageSquare size={20} />
                </div>
                <p className="font-semibold text-text text-sm">Start Consultation</p>
                <p className="text-2xs text-text-muted mt-1 leading-relaxed">
                  Send your questions, symptom updates, or recovery concerns directly to{' '}
                  <strong className="text-text">{selectedContact.name}</strong> below.
                </p>
                <span className="inline-flex items-center gap-1.5 text-2xs text-primary font-medium mt-3 bg-primary-tint/50 px-2.5 py-1 rounded-full">
                  <Check size={12} /> Encrypted clinical channel
                </span>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.is_me || m.sender === user?.id
                const isRead = m.is_read || m.delivery_status === 'read'
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && (
                      <span className="text-2xs font-semibold text-text-secondary mb-1 px-1">
                        {m.sender_name || selectedContact?.name || 'Care Team'}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] p-3 rounded-xl text-xs leading-relaxed shadow-xs break-words ${
                        isMe
                          ? 'bg-primary text-white rounded-br-none'
                          : 'bg-white text-text border border-border rounded-bl-none'
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-2xs text-text-muted mt-1 flex items-center gap-1 px-1">
                      {formatMessageTime(m.sent_at)}
                      {isMe && (
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          {isRead ? (
                            <>
                              <CheckCheck size={12} className="text-primary font-bold" />
                              <span className="text-2xs text-text-muted">Read</span>
                            </>
                          ) : (
                            <>
                              <Check size={12} className="text-text-muted" />
                              <span className="text-2xs text-text-muted">Delivered</span>
                            </>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Section C: Message Composer (Anchored Bottom) */}
          <form
            onSubmit={handleSend}
            className="flex-shrink-0 p-3 md:p-4 bg-white border-t border-border flex items-end gap-2.5 z-10"
          >
            <div className="flex-1 relative min-w-0">
              <textarea
                rows={1}
                value={inputMsg}
                disabled={!selectedContact || sending || !hasCareTeam}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !hasCareTeam
                    ? 'Care team assignment pending...'
                    : selectedContact
                    ? `Message ${selectedContact.name}... (Enter to send, Shift+Enter for new line)`
                    : 'Choose a care team contact on the left to start messaging...'
                }
                className="w-full min-h-[40px] max-h-36 py-2.5 px-3.5 text-xs bg-surface-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed placeholder:text-text-muted/70"
              />
            </div>
            <button
              type="submit"
              disabled={!inputMsg.trim() || sending || !selectedContact || !hasCareTeam}
              className="h-[40px] px-4 md:px-5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-xs"
            >
              {sending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send size={13} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
