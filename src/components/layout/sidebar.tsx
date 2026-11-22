'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Ticket, Users, UserCheck, Monitor, Key,
  ClipboardList, BookOpen, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Headphones, Building2, Mail,
  ShieldAlert, Cpu, CheckCircle2, Sparkles, Layers
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

interface NavItem {
  label: string
  href: string
  icon: any
  roles: string[]
  badge?: string | number
  badgeColor?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Core Help Desk',
    items: [
      { label: 'Tickets Queue', href: '/tickets', icon: Ticket, roles: ['ADMIN', 'MANAGER', 'AGENT', 'END_USER'], badge: '500', badgeColor: 'bg-blue-100 text-blue-700' },
      { label: 'Desk Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'AGENT', 'END_USER'] },
      { label: 'Engineering Report', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
      { label: 'VIP Priority Rules', href: '/settings/vip-rules', icon: ShieldAlert, roles: ['ADMIN', 'MANAGER'], badge: 'Active', badgeColor: 'bg-red-50 text-red-600' },
    ]
  },
  {
    title: 'IT Integrations',
    items: [
      { label: 'Integrations Hub', href: '/settings/integrations', icon: Cpu, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
      { label: 'Live Email Channels', href: '/settings/channels/email', icon: Mail, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
      { label: 'Asset Fleet (Snipe-IT)', href: '/assets', icon: Monitor, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
      { label: 'Cloud Licenses (M365)', href: '/licenses', icon: Key, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
    ]
  },
  {
    title: 'Management',
    items: [
      { label: 'Customers & Contacts', href: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'AGENT'] },
      { label: 'Service Agents', href: '/agents', icon: UserCheck, roles: ['ADMIN', 'MANAGER'] },
      { label: 'Departments', href: '/departments', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
      { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, roles: ['ADMIN', 'MANAGER', 'AGENT', 'END_USER'] },
      { label: 'System Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
    ]
  }
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

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen bg-white text-slate-800 border-r border-slate-200/80 transition-all duration-300 relative flex-shrink-0 shadow-[1px_0_3px_0_rgba(0,0,0,0.02)] z-20',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Zoho Desk Styled Logo Header */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-slate-100 bg-white select-none',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          <Link href="/tickets" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-xs flex-shrink-0">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-slate-900 leading-tight">ParleTech</span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                    Desk
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">Zoho Live Help Desk</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter(item => item.roles.includes(userRole))
            if (visibleItems.length === 0) return null

            return (
              <div key={idx} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {section.title}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

                  return collapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center justify-center h-9 w-9 mx-auto rounded-lg transition-colors',
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <span>{item.label}</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between h-9 px-3 rounded-lg transition-all text-xs font-medium group',
                        isActive
                          ? 'bg-blue-50/80 text-blue-700 font-bold border-l-2 border-blue-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={cn(
                          'h-4 w-4 flex-shrink-0 transition-colors',
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        )} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                          item.badgeColor || 'bg-slate-100 text-slate-600'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Zoho Live Status & Sync Indicator */}
        {!collapsed && (
          <div className="p-2.5 mx-2 mb-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Zoho Desk Connected
              </span>
              <span className="font-mono text-[10px] font-bold text-slate-500">500 Live</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">Parle Technologies (#787180614)</p>
          </div>
        )}

        {/* User Profile Footer */}
        <div className={cn(
          'border-t border-slate-100 p-2.5 bg-slate-50/50',
          collapsed ? 'flex justify-center' : ''
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Avatar className="h-8 w-8 flex-shrink-0 border border-slate-200">
                  <AvatarImage src={user.image || ''} />
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user.name || 'User'}</p>
                </div>
                <p className="text-[10px] text-slate-400 truncate leading-tight">{user.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse Toggle Pill */}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-20 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-white text-slate-500 border border-slate-200 shadow-xs hover:bg-slate-50 hover:text-slate-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>
    </TooltipProvider>
  )
}
