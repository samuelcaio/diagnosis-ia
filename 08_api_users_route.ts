// src/app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'MEDICO', 'RECEPCAO']),
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).default('STARTER'),
})

// GET /api/users — listar usuários (somente ADMIN)
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true,
      plan: true, active: true, createdAt: true,
      _count: { select: { accessLogs: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users)
}

// POST /api/users — criar usuário (somente ADMIN)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 422 })
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })

  const hashed = await bcrypt.hash(parsed.data.password, 10)
  const user = await prisma.user.create({
    data: { ...parsed.data, password: hashed },
    select: { id: true, email: true, name: true, role: true, plan: true, active: true },
  })
  return NextResponse.json(user, { status: 201 })
}

// PATCH /api/users/[id] — atualizar usuário
// src/app/api/users/[id]/route.ts
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      name: body.name,
      role: body.role,
      plan: body.plan,
      active: body.active,
    },
    select: { id: true, email: true, name: true, role: true, plan: true, active: true },
  })
  return NextResponse.json(updated)
}

// DELETE /api/users/[id] — desativar usuário
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })
  }

  // Soft delete — nunca apagar logs de acesso
  await prisma.user.update({
    where: { id: params.id },
    data: { active: false },
  })
  return NextResponse.json({ ok: true })
}
