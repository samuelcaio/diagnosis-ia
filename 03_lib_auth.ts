// src/lib/auth.ts
// TODO: Substituir por NextAuth ou Clerk para SSO em produção

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'diagnosis-ia-secret-dev-key-mude-em-prod'
)

export interface JWTPayload {
  sub: string       // userId
  email: string
  name: string
  role: 'ADMIN' | 'MEDICO' | 'RECEPCAO'
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE'
  iat?: number
  exp?: number
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const token = cookies().get('diagnosis_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get('diagnosis_token')?.value
  if (!token) return null
  return verifyToken(token)
}

// Middleware helper — uso no middleware.ts
export function isAuthorized(session: JWTPayload | null, allowedRoles: JWTPayload['role'][]): boolean {
  if (!session) return false
  return allowedRoles.includes(session.role)
}

// Rota de destino após login por role
export function getDefaultRoute(role: JWTPayload['role']): string {
  switch (role) {
    case 'ADMIN':    return '/admin'
    case 'RECEPCAO': return '/agendamento'
    default:         return '/dashboard'
  }
}
