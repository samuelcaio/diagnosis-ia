// src/app/api/appointments/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { z } from 'zod'

const AppointmentSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  dateTime: z.string().datetime(),
  specialty: z.string().min(1),
  type: z.string().default('1ª consulta'),
  notes: z.string().optional(),
})

// GET /api/appointments?date=2026-04-21&doctorId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const doctorId = searchParams.get('doctorId')

    const where: Record<string, unknown> = {}

    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.dateTime = { gte: start, lte: end }
    }

    if (doctorId) where.doctorId = doctorId
    if (session.role === 'MEDICO') where.doctorId = session.sub

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, cpf: true, insurance: true } },
        doctor:  { select: { id: true, name: true } },
      },
      orderBy: { dateTime: 'asc' },
    })

    return NextResponse.json(appointments)
  } catch (err) {
    console.error('[APPOINTMENTS GET]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

// POST /api/appointments — criar nova consulta
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    if (!['ADMIN', 'RECEPCAO', 'MEDICO'].includes(session.role)) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = AppointmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 422 })
    }

    // Verificar conflito de horário
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: parsed.data.doctorId,
        dateTime: new Date(parsed.data.dateTime),
        status: { notIn: ['CANCELADO', 'FINALIZADO'] },
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'Conflito de horário detectado.' }, { status: 409 })
    }

    const appointment = await prisma.appointment.create({
      data: {
        ...parsed.data,
        dateTime: new Date(parsed.data.dateTime),
      },
      include: { patient: true, doctor: { select: { id: true, name: true } } },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (err) {
    console.error('[APPOINTMENTS POST]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

// PATCH /api/appointments/[id] (status update)
// src/app/api/appointments/[id]/route.ts
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const body = await req.json()
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { status: body.status, notes: body.notes },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })
  }
}
