import React, { useState } from 'react'
import { PageHeader, Avatar } from '../../components/ui/index.jsx'
import { Send, Search, Check, CheckCheck, Paperclip, PhoneCall, Video } from 'lucide-react'

export default function Messages() {
  const [activeConv, setActiveConv] = useState(1)
  const [inputMsg, setInputMsg] = useState('')
  const [messages, setMessages] = useState([
    { id: 1, sender: 'doc', text: 'Hello Rahul, I noticed your Day 14 check-in score improved to 88. How is the knee flexion feeling during home exercises?', time: '09:15 AM', read: true },
    { id: 2, sender: 'me', text: 'Good morning Dr. Varma! It feels much better, minimal stiffness and no pain when doing the ankle pumps.', time: '09:22 AM', read: true },
    { id: 3, sender: 'doc', text: 'Excellent progress. Keep the incision area dry until our staple removal appointment on the 24th.', time: '09:25 AM', read: true },
  ])

  const contacts = [
    { id: 1, name: 'Dr. Rajesh Varma', role: 'Primary Orthopedic Surgeon', lastMsg: 'Keep the incision area dry...', time: '09:25 AM', unread: 0, online: true },
    { id: 2, name: 'Nurse Priya Nair', role: 'Post-Op Care Coordinator', lastMsg: 'Remember to log your evening temp.', time: 'Yesterday', unread: 1, online: false },
    { id: 3, name: 'Dr. Ananya Iyer', role: 'Physiotherapist', lastMsg: 'Session scheduled for Oct 2nd.', time: '16 Sep', unread: 0, online: true },
  ]

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputMsg.trim()) return
    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: inputMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    }
    setMessages([...messages, newMsg])
    setInputMsg('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Secure Clinical Messaging"
        description="Direct encrypted communication with your post-operative surgical and nursing care team"
      />

      <div className="bg-white border border-border rounded-lg shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
        {/* Contacts Pane (4 cols) */}
        <div className="md:col-span-4 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                placeholder="Search conversations..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-surface-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {contacts.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConv(c.id)}
                className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                  activeConv === c.id ? 'bg-primary-tint/60' : 'hover:bg-surface-muted'
                }`}
              >
                <div className="relative">
                  <Avatar name={c.name} size="md" />
                  {c.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-text truncate">{c.name}</h4>
                    <span className="text-2xs text-text-muted">{c.time}</span>
                  </div>
                  <p className="text-2xs text-primary font-medium">{c.role}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{c.lastMsg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Thread Pane (8 cols) */}
        <div className="md:col-span-8 flex flex-col justify-between bg-bg/40">
          {/* Thread Header */}
          <div className="p-3.5 bg-white border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name="Dr. Rajesh Varma" size="sm" />
              <div>
                <h3 className="text-xs font-bold text-text">Dr. Rajesh Varma</h3>
                <p className="text-2xs text-text-muted">Primary Orthopedic Surgeon · Active now</p>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((m) => {
              const isMe = m.sender === 'me'
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-[10px] text-xs leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-white text-text border border-border rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-2xs text-text-muted mt-1 flex items-center gap-1">
                    {m.time} {isMe && <CheckCheck size={12} className="text-primary" />}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Composer Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-border flex items-center gap-2">
            <input
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type your message to the clinical team..."
              className="flex-1 h-9 px-3 text-xs bg-surface-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim()}
              className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              Send <Send size={13} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
