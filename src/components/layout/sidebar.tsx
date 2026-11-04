'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Ticket, Users, UserCheck, Monitor, Key,
  ClipboardList, BookOpen, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Headphones, Building2, Mail
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, getInitials } from '@/lib/utils'

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
  }
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'AGENT', 'END_USER'] },
  { label: 'Tickets', href: '/tickets', icon: Ticket, roles: ['ADMIN', 'MANAGER', 'AGENT', 'END_USER'] },
  { label: 'Customers', href: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
  { label: 'Agents', href: '/agents', icon: UserCheck, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Departments', href: '/departments', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Email & Outbox', href: '/settings/channels/email', icon: Mail, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
  { label: 'Assets', href: '/assets', icon: Monitor, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
  { label: 'Licenses', href: '/licenses', icon: Key, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
  { label: 'Onboarding', href: '/onboarding', icon: ClipboardList, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, roles: ['ADMIN', 'MANAGER', 'AGENT', 'END_USER'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored) setCollapsed(stored === 'true')
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const userRole = user.role || 'END_USER'
  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 relative flex-shrink-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center h-16 px-4 border-b border-slate-700/50', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg flex-shrink-0">
            <Headphones className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm text-white leading-tight">ParleTech</p>
              <p className="text-xs text-slate-400 leading-tight">Help Desk</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-center h-9 w-full rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 h-9 px-3 rounded-lg transition-colors text-sm',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className={cn('border-t border-slate-700/50 p-3', collapsed ? 'flex justify-center' : '')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user.image || ''} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-20 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-white border border-slate-600 hover:bg-slate-600 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </TooltipProvider>
  )
}
