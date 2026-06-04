// src/app/api/auth/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, getDefaultRoute } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// POST /api/auth — login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body as { email: string; password: string }

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    if (!user || !user.active) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'MEDICO' | 'RECEPCAO',
      plan: user.plan as 'STARTER' | 'PRO' | 'ENTERPRISE',
    })

    // Log de acesso
    await prisma.accessLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ip: req.headers.get('x-forwarded-for') ?? 'unknown',
      },
    })

    const redirectTo = getDefaultRoute(user.role as 'ADMIN' | 'MEDICO' | 'RECEPCAO')

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan },
      redirectTo,
    })

    res.cookies.set('diagnosis_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 horas
    })

    return res
  } catch (err) {
    console.error('[AUTH ERROR]', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// DELETE /api/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('diagnosis_token')
  return res
}
