'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import Image from 'next/image'

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [ticket, setTicket] = useState<any>(null)
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('in-progress')

  useEffect(() => {
    if (ticketId) {
      loadTicket()
    }
  }, [ticketId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [responses])

  const loadTicket = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/support/${ticketId}`)
      setTicket(data.data)
      setResponses(data.data?.responses || [])
      setSelectedStatus(data.data?.status || 'in-progress')
    } catch (error) {
      console.error('Error loading ticket:', error)
      // Mock data for development
      setTicket({
        id: ticketId,
        userId: 'user-123',
        user: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          avatar: 'https://i.pravatar.cc/150?img=1',
        },
        subject: 'Need help with property search',
        message: 'I need assistance with finding properties in Dubai Marina area. The search filters are not working properly.',
        status: 'in-progress',
        createdAt: '2024-01-15T10:30:00Z',
        priority: 'high',
      })
      setResponses([
        {
          id: '1',
          message: 'Thank you for contacting us. We have received your request and our team is looking into it. We will get back to you within 24 hours.',
          isFromAdmin: true,
          createdAt: '2024-01-15T10:45:00Z',
        },
      ])
      setSelectedStatus('in-progress')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!replyMessage.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const { data } = await api.post(`/support/${ticketId}/responses`, {
        message: replyMessage,
        isFromAdmin: true,
      })
      
      setResponses([...responses, data.data])
      setReplyMessage('')
      await loadTicket()
      
      // Update status if needed
      if (selectedStatus !== ticket?.status) {
        await api.patch(`/support/${ticketId}/status`, { status: selectedStatus })
        await loadTicket()
      }
    } catch (err: any) {
      console.error('Error submitting reply:', err)
      setError(err.response?.data?.message || 'Failed to submit reply. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hrs ago`
    if (diffInDays === 1) return '1 day ago'
    return `${diffInDays} days ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-brand-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Loading ticket...</p>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Ticket not found</p>
      </div>
    )
  }

  const allMessages = [
    {
      id: 'original',
      message: ticket.message,
      isFromAdmin: false,
      createdAt: ticket.createdAt,
      isOriginal: true,
    },
    ...responses,
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Ticket Reply
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Button>
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Unified Chat (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex flex-col h-[calc(100vh-200px)]">
            {/* Chat Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 px-5 py-4 lg:px-6 lg:py-5 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Ticket #{ticketId.slice(0, 8)} - {ticket.subject}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(ticket.createdAt)}, {formatTime(ticket.createdAt)} ({getTimeAgo(ticket.createdAt)})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" color={ticket.status === 'pending' ? 'error' : ticket.status === 'in-progress' ? 'warning' : 'success'}>
                    {ticket.status === 'pending' ? 'Pending' : ticket.status === 'in-progress' ? 'In-Progress' : ticket.status === 'resolved' ? 'Solved' : 'Closed'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Chat Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-6 lg:py-8">
              <div className="space-y-6">
                {allMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${msg.isFromAdmin ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        width={40}
                        height={40}
                        src={msg.isFromAdmin ? "https://i.pravatar.cc/150?img=5" : (ticket.user?.avatar || 'https://i.pravatar.cc/150?img=5')}
                        alt={msg.isFromAdmin ? "Admin" : (ticket.user?.name || 'User')}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        msg.isFromAdmin
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {msg.isFromAdmin ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      )}
                      <p className={`text-xs mt-2 ${msg.isFromAdmin ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatDate(msg.createdAt)}, {formatTime(msg.createdAt)} ({getTimeAgo(msg.createdAt)})
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Reply Form */}
            <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-4 lg:px-6 lg:py-5 flex-shrink-0">
              {error && (
                <div className="mb-4 p-4 rounded-lg bg-error-50 border border-error-200 dark:bg-error-900/20 dark:border-error-800">
                  <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmitReply}>
                <div className="space-y-4">
                  <div>
                    <textarea
                      id="reply"
                      rows={4}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply here..."
                      className="h-auto w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 bg-transparent text-gray-800"
                      required
                    />
                  </div>

                  {/* Attach Button and Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M9.33333 2L14 6.66667M14 6.66667H10.6667M14 6.66667V3.33333M13.3333 13.3333H2.66667C2.29848 13.3333 2 13.0348 2 12.6667V3.33333C2 2.96514 2.29848 2.66667 2.66667 2.66667H7.33333L9.33333 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Attach
                      </button>
                    </div>

                    {/* Status Radio Buttons */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="in-progress"
                            checked={selectedStatus === 'in-progress'}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-4 h-4 text-brand-500 border-gray-300 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">In-Progress</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="resolved"
                            checked={selectedStatus === 'resolved'}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-4 h-4 text-brand-500 border-gray-300 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Solved</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="closed"
                            checked={selectedStatus === 'closed'}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-4 h-4 text-brand-500 border-gray-300 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">On-Hold</span>
                        </label>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div>
                      <Button
                        type="submit"
                        disabled={submitting || !replyMessage.trim()}
                        className="flex items-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </>
                        ) : (
                          'Reply'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column - Ticket Details (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 sticky top-6">
            <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
              Ticket Details
            </h3>

            <div className="space-y-4">
              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Customer</span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  {ticket.user?.name || 'Unknown User'}
                </span>
              </div>

              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Email</span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white break-all">
                  {ticket.user?.email || '-'}
                </span>
              </div>

              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Ticket ID</span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  #{ticketId.slice(0, 8)}
                </span>
              </div>

              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Category</span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  General Support
                </span>
              </div>

              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Created</span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(ticket.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Status</span>
                <span>
                  <Badge size="sm" color={ticket.status === 'pending' ? 'error' : ticket.status === 'in-progress' ? 'warning' : 'success'}>
                    {ticket.status === 'pending' ? 'Pending' : ticket.status === 'in-progress' ? 'In-Progress' : ticket.status === 'resolved' ? 'Solved' : 'Closed'}
                  </Badge>
                </span>
              </div>

              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Priority</span>
                <span>
                  <Badge size="sm" color={ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'success'}>
                    {ticket.priority === 'high' ? 'High' : ticket.priority === 'medium' ? 'Medium' : 'Low'}
                  </Badge>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
