import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { Role } from '@/lib/constants'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'looksfine_dev_secret_key_change_in_production_2026'
)
export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'looksfine_session'

export interface UserSessionPayload {
  id: string
  name: string
  email: string
  role: Role
  region?: string | null
  establishmentId?: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(user: UserSessionPayload): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    region: user.region || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as unknown as UserSessionPayload
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    return await verifySessionToken(token)
  } catch {
    return null
  }
}

// Conceptual permissions matrix
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  FOOD_SAFETY_INSPECTOR: [
    'establishments:read',
    'inspections:read',
    'inspections:conduct',
    'violations:create',
    'corrective_actions:recommend',
  ],
  INSPECTION_MANAGER: [
    'establishments:read',
    'inspections:read',
    'inspections:assign',
    'inspections:review',
    'prioritization:read',
    'inspectors:monitor',
  ],
  ESTABLISHMENT_MANAGER: [
    'establishment:read_own',
    'inspections:read_own',
    'violations:read_own',
    'corrective_actions:submit_evidence',
  ],
  FOOD_SAFETY_ADMIN: [
    'establishments:read',
    'establishments:write',
    'inspections:read',
    'inspections:write',
    'violations:manage',
    'corrective_actions:manage',
    'analytics:read',
    'admin:all',
  ],
}

export function hasRolePermission(role: Role, permission: string): boolean {
  if (role === 'FOOD_SAFETY_ADMIN') return true
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export async function requireAuthUser(allowedRoles?: Role[]): Promise<{ user: UserSessionPayload | null; error?: string; status?: number }> {
  const user = await getSessionUser()
  if (!user) {
    return { user: null, error: 'Unauthorized: Authentication required', status: 401 }
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { user: null, error: 'Forbidden: Insufficient role permissions', status: 403 }
  }
  return { user }
}
