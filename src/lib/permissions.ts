import { auth } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export type Permission =
  | 'tickets:view_all'
  | 'tickets:view_dept'
  | 'tickets:view_own'
  | 'tickets:create'
  | 'tickets:assign'
  | 'tickets:update_status'
  | 'tickets:delete'
  | 'tickets:bulk_action'
  | 'comments:create_internal'
  | 'agents:manage'
  | 'departments:manage'
  | 'customers:view'
  | 'customers:manage'
  | 'assets:view'
  | 'assets:manage'
  | 'licenses:view'
  | 'licenses:manage'
  | 'kb:view_internal'
  | 'kb:manage'
  | 'reports:view'
  | 'sla:manage'
  | 'automation:manage'
  | 'settings:manage'
  | 'users:manage'
  | 'onboarding:manage'
  | 'audit:view'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'tickets:view_all', 'tickets:create', 'tickets:assign', 'tickets:update_status',
    'tickets:delete', 'tickets:bulk_action', 'comments:create_internal',
    'agents:manage', 'departments:manage', 'customers:view', 'customers:manage',
    'assets:view', 'assets:manage', 'licenses:view', 'licenses:manage',
    'kb:view_internal', 'kb:manage', 'reports:view', 'sla:manage',
    'automation:manage', 'settings:manage', 'users:manage', 'onboarding:manage', 'audit:view',
  ],
  MANAGER: [
    'tickets:view_all', 'tickets:create', 'tickets:assign', 'tickets:update_status',
    'tickets:bulk_action', 'comments:create_internal',
    'customers:view', 'customers:manage',
    'assets:view', 'licenses:view',
    'kb:view_internal', 'kb:manage', 'reports:view', 'onboarding:manage',
  ],
  AGENT: [
    'tickets:view_dept', 'tickets:create', 'tickets:update_status',
    'comments:create_internal', 'customers:view',
    'assets:view', 'licenses:view',
    'kb:view_internal', 'kb:manage',
  ],
  END_USER: [
    'tickets:view_own', 'tickets:create',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export async function requirePermission(permission: Permission): Promise<void> {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  const role = session.user.role as UserRole
  if (!hasPermission(role, permission)) {
    throw new Error('Forbidden')
  }
}

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

export function isAdmin(role: string): boolean {
  return role === 'ADMIN'
}

export function isManagerOrAbove(role: string): boolean {
  return role === 'ADMIN' || role === 'MANAGER'
}

export function isAgentOrAbove(role: string): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'AGENT'
}
