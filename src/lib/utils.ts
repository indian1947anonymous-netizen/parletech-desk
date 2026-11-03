import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined, fmt = 'MMM dd, yyyy') {
  if (!date) return '—'
  return format(new Date(date), fmt)
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return '—'
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

export function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false
  return isBefore(new Date(date), new Date())
}

export function isUrgent(date: Date | string | null | undefined): boolean {
  if (!date) return false
  const deadline = new Date(date)
  const soon = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
  return isAfter(soon, deadline) && isAfter(deadline, new Date())
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length = 100): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function generateTicketNumber(counter: number): string {
  return `TKT-${String(counter).padStart(4, '0')}`
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function priorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'text-green-600 bg-green-50 border-green-200',
    MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
    URGENT: 'text-red-600 bg-red-50 border-red-200',
  }
  return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200'
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: 'text-blue-600 bg-blue-50 border-blue-200',
    IN_PROGRESS: 'text-purple-600 bg-purple-50 border-purple-200',
    WAITING_FOR_CUSTOMER: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    WAITING_FOR_THIRD_PARTY: 'text-orange-600 bg-orange-50 border-orange-200',
    ON_HOLD: 'text-gray-600 bg-gray-50 border-gray-200',
    RESOLVED: 'text-green-600 bg-green-50 border-green-200',
    CLOSED: 'text-gray-500 bg-gray-50 border-gray-200',
  }
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200'
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    WAITING_FOR_CUSTOMER: 'Waiting for Customer',
    WAITING_FOR_THIRD_PARTY: 'Waiting for Third Party',
    ON_HOLD: 'On Hold',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  }
  return labels[status] || status
}

export function priorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent',
  }
  return labels[priority] || priority
}

export function assetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LAPTOP: 'Laptop',
    DESKTOP: 'Desktop',
    PHONE: 'Phone',
    MONITOR: 'Monitor',
    TABLET: 'Tablet',
    PRINTER: 'Printer',
    SERVER: 'Server',
    NETWORK: 'Network Device',
    PERIPHERAL: 'Peripheral',
    OTHER: 'Other',
  }
  return labels[type] || type
}

export function assetStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'text-green-600 bg-green-50 border-green-200',
    IN_REPAIR: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    RETIRED: 'text-gray-500 bg-gray-50 border-gray-200',
    LOST: 'text-red-600 bg-red-50 border-red-200',
    SPARE: 'text-blue-600 bg-blue-50 border-blue-200',
  }
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200'
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrator',
    MANAGER: 'Support Manager',
    AGENT: 'Support Agent',
    END_USER: 'End User',
  }
  return labels[role] || role
}

export function roleColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: 'text-purple-600 bg-purple-50 border-purple-200',
    MANAGER: 'text-blue-600 bg-blue-50 border-blue-200',
    AGENT: 'text-green-600 bg-green-50 border-green-200',
    END_USER: 'text-gray-600 bg-gray-50 border-gray-200',
  }
  return colors[role] || 'text-gray-600 bg-gray-50 border-gray-200'
}
