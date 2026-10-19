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
  ChevronLeft
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

export default function DoctorMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)

  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const activeConvIdRef = useRef(activeConvId)
  activeConvIdRef.current = activeConvId

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // 1. Fetch conversations accessible to the doctor
  const fetchConversations = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoadingConvs(true)
      const res = await api.get('/messages/conversations/')
      const convList = Array.isArray(res.data) ? res.data : []
      setConversations(convList)

      if (convList.length > 0 && !activeConvIdRef.current) {
        setActiveConvId(convList[0].id)
      }
    } catch (err) {
      console.error('Failed to load doctor conversations:', err)
      if (isInitial) {
        setError('Failed to load conversations inbox. Please refresh or check connection.')
      }
    } finally {
      if (isInitial) setLoadingConvs(false)
    }
  }, [])

  // 2. Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId, isInitial = false) => {
    if (!convId) return
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
        setError('Failed to load message history for this patient.')
      }
    } finally {
      if (isInitial) setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations(true)
  }, [fetchConversations])

  useEffect(() => {
    if (activeConvId) {
      setError(null)
      fetchMessages(activeConvId, true)
    } else {
      setMessages([])
    }
  }, [activeConvId, fetchMessages])

  // Polling for updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeConvIdRef.current) {
        fetchMessages(activeConvIdRef.current, false)
      }
      fetchConversations(false)
    }, 4000)

    return () => clearInterval(interval)
  }, [fetchMessages, fetchConversations])

  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      scrollToBottom('smooth')
    }
  }, [messages.length, loadingMessages])

  const activeConv = conversations.find((c) => c.id === activeConvId) || null
  const otherParticipant = activeConv?.other_participant || null

  // 3. Send clinical message / instructions
  const handleSend = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }

    const trimmed = inputMsg.trim()
    if (!trimmed || sending || !activeConvId) return

    setSending(true)
    setError(null)

    try {
      const res = await api.post(`/messages/conversations/${activeConvId}/messages/`, {
        content: trimmed
      })

      setInputMsg('')
      setMessages((prev) => [...prev, res.data])

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                latest_message: res.data,
                updated_at: res.data.sent_at
              }
            : c
        )
      )

      setTimeout(() => scrollToBottom('smooth'), 50)
    } catch (err) {
      console.error('Failed to send clinical reply:', err)
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const name = c.other_participant?.name?.toLowerCase() || ''
    const uhid = (c.other_participant?.uhid || c.patient_uhid || '').toLowerCase()
    const surgery = (c.other_participant?.surgery || c.patient_surgery || '').toLowerCase()
    const lastMsg = c.latest_message?.content?.toLowerCase() || ''
    return name.includes(q) || uhid.includes(q) || surgery.includes(q) || lastMsg.includes(q)
  })

  return (
    <div className="flex flex-col h-full space-y-4">
      <PageHeader
        title="Clinical Telehealth Inbox"
        description="Secure bidirectional direct communication with post-operative surgical patients"
      />

      {error && (
        <div className="bg-danger-tint border border-danger/30 rounded-lg p-3 text-xs text-danger flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-2xs font-semibold uppercase hover:underline ml-3"
          >
            Dismiss
          </button>
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
          {/* Search Box */}
          <div className="p-3 border-b border-border bg-white flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient or UHID..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Patient Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loadingConvs ? (
              <div className="p-8 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-2 h-40">
                <Loader2 size={18} className="animate-spin text-primary" />
                <span>Loading patient inbox...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                {searchQuery ? 'No patients match your search.' : 'No active patient conversations.'}
              </div>
            ) : (
              filteredConversations.map((c) => {
                const other = c.other_participant
                const isSelected = activeConvId === c.id
                const lastMsg = c.latest_message
                const uhid = other?.uhid || c.patient_uhid
                const surgery = other?.surgery || c.patient_surgery
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveConvId(c.id)
                      setShowMobileChat(true)
                    }}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-tint/60 border-l-4 border-primary'
                        : 'hover:bg-surface-muted/60'
                    }`}
                  >
                    <Avatar name={other?.name || 'Patient'} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-text truncate">
                          {other?.name || 'Patient'} {uhid ? `(${uhid})` : ''}
                        </h4>
                        <span className="text-2xs text-text-muted flex-shrink-0">
                          {formatConversationDate(lastMsg?.sent_at || c.updated_at)}
                        </span>
                      </div>
                      <p className="text-2xs text-primary font-medium truncate mt-0.5">
                        {surgery || 'Post-operative Care'}
                      </p>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {lastMsg ? lastMsg.content : 'No messages yet'}
                      </p>
                    </div>
                    {c.unread_count > 0 && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 text-2xs font-bold bg-primary text-white rounded-full">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Message Thread Pane (approx 68-70% on desktop, expands to fill available width) */}
        <div
          className={`flex-1 min-w-0 w-full md:w-[68%] lg:w-[70%] flex flex-col bg-surface-muted/20 h-full ${
            !showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Section A: Conversation Header (Pinned Top) */}
          <div className="flex-shrink-0 p-3.5 bg-white border-b border-border flex items-center justify-between shadow-xs z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="md:hidden p-1.5 -ml-1 text-text-muted hover:text-text rounded-md hover:bg-surface-muted transition-colors flex items-center gap-0.5 text-xs font-medium"
                aria-label="Back to conversations list"
              >
                <ChevronLeft size={18} />
                <span>Patients</span>
              </button>

              {otherParticipant ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={otherParticipant.name} size="sm" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-text truncate">
                      {otherParticipant.name}
                      {otherParticipant.uhid || activeConv?.patient_uhid
                        ? ` (${otherParticipant.uhid || activeConv?.patient_uhid})`
                        : ''}
                    </h3>
                    <p className="text-2xs text-text-muted truncate">
                      {otherParticipant.surgery || activeConv?.patient_surgery || 'Patient'}
                      {otherParticipant.online ? ' · Active now' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <MessageSquare size={16} />
                  <span>Select a patient conversation to begin</span>
                </div>
              )}
            </div>

            {activeConvId && (
              <button
                type="button"
                onClick={() => fetchMessages(activeConvId, true)}
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
                <span>Loading patient messages...</span>
              </div>
            ) : !activeConvId ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-text-muted py-12">
                <MessageSquare size={32} className="text-border mb-2" />
                <span>Choose a patient from the left pane to view consultation.</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-text-muted py-12 text-center max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-primary-tint flex items-center justify-center mb-3 text-primary">
                  <MessageSquare size={20} />
                </div>
                <p className="font-semibold text-text">No messages yet</p>
                <p className="text-2xs text-text-muted mt-1">
                  There are no previous messages with {otherParticipant?.name || 'this patient'}. Type clinical instructions below to initiate.
                </p>
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
                        {m.sender_name || otherParticipant?.name || 'Patient'}
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
                disabled={!activeConvId || sending}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeConvId
                    ? `Type clinical response or instructions for ${otherParticipant?.name || 'patient'}... (Enter to send, Shift+Enter for new line)`
                    : 'Select a patient conversation first...'
                }
                className="w-full min-h-[40px] max-h-36 py-2.5 px-3.5 text-xs bg-surface-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
              />
            </div>
            <button
              type="submit"
              disabled={!inputMsg.trim() || sending || !activeConvId}
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
