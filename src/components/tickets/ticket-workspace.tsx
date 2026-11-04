'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  statusColor, statusLabel, priorityColor, priorityLabel,
  formatDate, formatDateTime, formatRelativeTime, isOverdue
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Clock, AlertTriangle, Send, Lock, User, Monitor, Key,
  History, Paperclip, ChevronRight, CheckCircle2, Shield,
  Laptop, Phone, Calendar, ArrowLeft, Loader2, Mail,
  ArrowUpRight, ArrowDownLeft, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface TicketWorkspaceProps {
  ticket: any
  currentUser: any
  agents: { id: string; name: string | null; email: string }[]
  departments: { id: string; name: string }[]
  requesterAssets: any[]
  requesterLicenses: any[]
  previousTickets: any[]
}

export function TicketWorkspace({
  ticket: initialTicket,
  currentUser,
  agents,
  departments,
  requesterAssets,
  requesterLicenses,
  previousTickets,
}: TicketWorkspaceProps) {
  const router = useRouter()
  const [ticket, setTicket] = useState(initialTicket)
  const [replyContent, setReplyContent] = useState('')
  const [replyType, setReplyType] = useState<'PUBLIC_REPLY' | 'INTERNAL_NOTE'>('PUBLIC_REPLY')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [activeTab, setActiveTab] = useState<'conversation' | 'history' | 'emails'>('conversation')

  const isAgent = ['ADMIN', 'MANAGER', 'AGENT'].includes(currentUser.role)

  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      toast.error('Please enter a message before sending')
      return
    }

    setSubmittingReply(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          type: replyType,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit reply')

      toast.success(replyType === 'INTERNAL_NOTE' ? 'Internal note added' : 'Public reply sent')
      setReplyContent('')

      // Append new comment to ticket
      setTicket((prev: any) => ({
        ...prev,
        comments: [...prev.comments, json.comment],
      }))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update status')

      toast.success(`Status updated to ${statusLabel(newStatus)}`)
      setTicket((prev: any) => ({ ...prev, status: newStatus }))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleUpdatePriority = async (newPriority: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update priority')

      toast.success(`Priority updated to ${priorityLabel(newPriority)}`)
      setTicket((prev: any) => ({ ...prev, priority: newPriority }))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleAssignAgent = async (agentId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agentId === 'unassigned' ? null : agentId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to assign agent')

      const assigned = agents.find(a => a.id === agentId)
      toast.success(assigned ? `Assigned to ${assigned.name}` : 'Ticket unassigned')
      setTicket((prev: any) => ({
        ...prev,
        agentId: agentId === 'unassigned' ? null : agentId,
        agent: assigned ? { id: assigned.id, name: assigned.name } : null,
      }))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleAssignDepartment = async (deptId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: deptId === 'none' ? null : deptId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update department')

      const dept = departments.find(d => d.id === deptId)
      toast.success(dept ? `Department set to ${dept.name}` : 'Department removed')
      setTicket((prev: any) => ({
        ...prev,
        departmentId: deptId === 'none' ? null : deptId,
        department: dept ? { id: dept.id, name: dept.name } : null,
      }))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const overdue = isOverdue(ticket.slaResolutionDue) && !['RESOLVED', 'CLOSED'].includes(ticket.status)

  return (
    <div className="space-y-4">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
            <Link href="/tickets">
              <ArrowLeft className="h-4 w-4 mr-1" /> Tickets
            </Link>
          </Button>
          <div className="h-4 w-px bg-slate-300" />
          <span className="font-mono text-sm font-bold text-slate-800">{ticket.ticketNumber}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor(ticket.status)}`}>
            {statusLabel(ticket.status)}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor(ticket.priority)}`}>
            {priorityLabel(ticket.priority)}
          </span>
        </div>

        {/* SLA Status Indicator */}
        <div className="flex items-center gap-2">
          {ticket.slaResolutionDue && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border ${
              overdue
                ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              <span>
                {overdue ? 'SLA Overdue: ' : 'Resolution target: '}
                {formatDateTime(ticket.slaResolutionDue)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Conversation & Timeline (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Ticket Header & Original Request */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-snug">{ticket.subject}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5">
                    <span>Opened by <strong className="text-slate-700">{ticket.requester?.name || ticket.customer?.name || 'User'}</strong></span>
                    <span>•</span>
                    <span>{formatDateTime(ticket.createdAt)}</span>
                    {ticket.category && (
                      <>
                        <span>•</span>
                        <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {ticket.category} {ticket.subcategory && `/ ${ticket.subcategory}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>
            </CardContent>
          </Card>

          {/* Tabs: Conversation vs Activity History */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'conversation'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Conversation ({ticket.comments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activity History ({ticket.activities?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'emails'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Email Thread & Outbox ({ticket.emailLogs?.length || 0})
            </button>
          </div>

          {activeTab === 'conversation' && (
            <div className="space-y-4">
              {/* Comments Timeline */}
              {ticket.comments?.map((comment: any) => {
                const isInternal = comment.type === 'INTERNAL_NOTE'
                return (
                  <div
                    key={comment.id}
                    className={`rounded-lg border p-4.5 space-y-2.5 transition-all ${
                      isInternal
                        ? 'bg-amber-50/70 border-amber-200 shadow-sm'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className={isInternal ? 'bg-amber-200 text-amber-800 text-[10px]' : 'bg-blue-600 text-white text-[10px]'}>
                            {comment.author?.name ? comment.author.name.slice(0, 2).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-xs font-bold text-slate-800">{comment.author?.name || 'User'}</span>
                          <span className="text-[11px] text-slate-400 ml-2">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                      </div>

                      {isInternal && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          <Lock className="h-3 w-3" /> Internal Note
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed pl-9">
                      {comment.content}
                    </div>
                  </div>
                )
              })}

              {/* Reply Box */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setReplyType('PUBLIC_REPLY')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-r border-slate-200 transition-colors ${
                      replyType === 'PUBLIC_REPLY'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" /> Public Reply
                  </button>

                  {isAgent && (
                    <button
                      type="button"
                      onClick={() => setReplyType('INTERNAL_NOTE')}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors ${
                        replyType === 'INTERNAL_NOTE'
                          ? 'bg-amber-100 text-amber-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5 text-amber-700" /> Internal Note (Agents Only)
                    </button>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  {replyType === 'PUBLIC_REPLY' && (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-md text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-blue-700">From:</span>
                        <span className="font-medium">"{currentUser.name || 'Agent'} (ParleTech Desk)" &lt;{currentUser.email || 'support@parletech.com'}&gt;</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-blue-700">To:</span>
                        <span className="font-medium">{ticket.customer?.email || ticket.requester?.email || 'Customer'}</span>
                      </div>
                    </div>
                  )}

                  <Textarea
                    placeholder={
                      replyType === 'INTERNAL_NOTE'
                        ? 'Type an internal note visible only to support staff...'
                        : 'Type your reply to the requester...'
                    }
                    rows={4}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="resize-y text-sm border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                      {replyType === 'INTERNAL_NOTE'
                        ? '🔒 Internal notes are never visible to the requester.'
                        : '📧 The requester will receive an email notification.'}
                    </p>

                    <Button
                      size="sm"
                      onClick={handleSendReply}
                      disabled={submittingReply || !replyContent.trim()}
                      className={replyType === 'INTERNAL_NOTE' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                    >
                      {submittingReply ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {replyType === 'INTERNAL_NOTE' ? 'Add Note' : 'Send Reply'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'history' && (
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {ticket.activities?.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 text-xs">
                      <div className="p-1 rounded-full bg-slate-100 text-slate-500 mt-0.5">
                        <History className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-800 font-medium">{activity.description}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          by {activity.user?.name || 'System'} • {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!ticket.activities || ticket.activities.length === 0) && (
                    <p className="text-xs text-slate-500 text-center py-4">No activity history recorded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'emails' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">
                  Total emails logged for this ticket: {ticket.emailLogs?.length || 0}
                </span>
                <Link
                  href="/settings/channels/email"
                  className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                >
                  Open Global Email Outbox & Simulator <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {(!ticket.emailLogs || ticket.emailLogs.length === 0) ? (
                <div className="p-8 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-400">
                  No email messages recorded yet for this ticket.
                </div>
              ) : (
                ticket.emailLogs.map((log: any) => {
                  const isOut = log.direction === 'OUTBOUND'
                  return (
                    <div
                      key={log.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-sm hover:border-blue-200 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isOut
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isOut ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            {isOut ? 'OUTBOUND' : 'INBOUND'}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{log.subject}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md">
                        <div>
                          <span className="text-slate-400 font-semibold mr-1">From:</span>
                          <span className="font-medium text-slate-800">{log.from}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold mr-1">To:</span>
                          <span className="font-medium text-slate-800">{log.to}</span>
                        </div>
                        {log.agentName && (
                          <div className="col-span-2">
                            <span className="text-slate-400 font-semibold mr-1">Sent by Agent:</span>
                            <span className="font-bold text-blue-700">{log.agentName}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed pt-1">
                        {log.body}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Support Workspace Right Panel: Quick Actions, Requester Info, Devices, Assets */}
        <div className="space-y-5">
          {/* Ticket Properties Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-semibold text-slate-800">Ticket Properties</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Status</label>
                <Select
                  value={ticket.status}
                  onValueChange={handleUpdateStatus}
                  disabled={updatingStatus || !isAgent}
                >
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="WAITING_FOR_CUSTOMER">Waiting on Customer</SelectItem>
                    <SelectItem value="WAITING_FOR_THIRD_PARTY">Waiting on 3rd Party</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Priority</label>
                <Select
                  value={ticket.priority}
                  onValueChange={handleUpdatePriority}
                  disabled={!isAgent}
                >
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned Agent Selector */}
              {isAgent && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Assigned Agent</label>
                  <Select
                    value={ticket.agentId || 'unassigned'}
                    onValueChange={handleAssignAgent}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agents.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name || a.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Department Selector */}
              {isAgent && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Department</label>
                  <Select
                    value={ticket.departmentId || 'none'}
                    onValueChange={handleAssignDepartment}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="No Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                <p>Created: {formatDateTime(ticket.createdAt)}</p>
                <p>Last Activity: {formatRelativeTime(ticket.updatedAt)}</p>
                {ticket.resolvedAt && <p>Resolved: {formatDateTime(ticket.resolvedAt)}</p>}
              </div>
            </CardContent>
          </Card>

          {/* IT Support Differentiator: Requester & Assigned Device Info Panel */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-semibold text-slate-800">Requester & IT Info</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  {ticket.requester?.name || ticket.customer?.name || 'External Contact'}
                </p>
                <p className="text-slate-500 text-xs">
                  {ticket.requester?.email || ticket.customer?.email || 'No email registered'}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                  <span>{ticket.requester?.jobTitle || 'Employee'}</span>
                  <span>•</span>
                  <span>{ticket.requester?.department || ticket.customer?.company || 'General'}</span>
                </div>
              </div>

              {/* Assigned Hardware Devices */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5 text-slate-500" /> Assigned Devices
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {requesterAssets.length}
                  </Badge>
                </div>

                {requesterAssets.length > 0 ? (
                  <div className="space-y-2">
                    {requesterAssets.map((item: any) => (
                      <div key={item.id} className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{item.asset?.name || item.name}</span>
                          <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                            {item.asset?.assetTag || item.assetTag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Model: {item.asset?.model || 'Standard'} • S/N: {item.asset?.serialNumber || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-[11px] italic">No active hardware assets assigned.</p>
                )}
              </div>

              {/* Assigned Software Licenses */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-slate-500" /> Active Software Licenses
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {requesterLicenses.length}
                  </Badge>
                </div>

                {requesterLicenses.length > 0 ? (
                  <div className="space-y-1.5">
                    {requesterLicenses.map((lic: any) => (
                      <div key={lic.id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-0">
                        <span className="font-medium text-slate-700">{lic.license?.productName || lic.productName}</span>
                        <span className="text-slate-400 text-[10px]">{lic.license?.licenseType || 'User'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-[11px] italic">No assigned software licenses.</p>
                )}
              </div>

              {/* Previous Support Tickets */}
              <div className="pt-3 border-t border-slate-100">
                <span className="font-semibold text-slate-700 block mb-2">
                  Recent Tickets by Requester
                </span>
                <div className="space-y-1.5">
                  {previousTickets
                    .filter((t: any) => t.id !== ticket.id)
                    .slice(0, 3)
                    .map((t: any) => (
                      <Link
                        key={t.id}
                        href={`/tickets/${t.id}`}
                        className="block p-1.5 rounded hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-600">{t.ticketNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border ${statusColor(t.status)}`}>
                            {statusLabel(t.status)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">{t.subject}</p>
                      </Link>
                    ))}
                  {previousTickets.filter((t: any) => t.id !== ticket.id).length === 0 && (
                    <p className="text-slate-400 text-[11px] italic">No previous tickets.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
