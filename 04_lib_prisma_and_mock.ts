// src/lib/prisma.ts
// TODO: Trocar DATABASE_URL no .env para PostgreSQL em produção

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma


// ─────────────────────────────────────────────
// src/lib/mock-data.ts
// Dados mock para desenvolvimento sem banco
// ─────────────────────────────────────────────

export const MOCK_PATIENTS = [
  {
    id: 'pat_1',
    name: 'João Paulo Ferreira',
    cpf: '042.312.555-98',
    age: 41,
    sex: 'M',
    insurance: 'Unimed',
    waitMinutes: 15,
    specialty: 'Clínica Geral',
    status: 'AGENDADO' as const,
    vitals: { bp: '142/88', hr: 98, spo2: 96, temp: 38.4, glucose: 182 },
  },
  {
    id: 'pat_2',
    name: 'Maria Aparecida dos Santos',
    cpf: '123.456.789-00',
    age: 63,
    sex: 'F',
    insurance: 'Bradesco Saúde',
    waitMinutes: 23,
    specialty: 'Cardiologia',
    status: 'EM_TRIAGEM' as const,
    vitals: { bp: '160/95', hr: 88, spo2: 97, temp: 36.8, glucose: 110 },
  },
  {
    id: 'pat_3',
    name: 'Ana Beatriz Lima',
    cpf: '987.654.321-11',
    age: 35,
    sex: 'F',
    insurance: 'SUS',
    waitMinutes: 8,
    specialty: 'Endocrinologia',
    status: 'AGENDADO' as const,
    vitals: { bp: '180/110', hr: 102, spo2: 95, temp: 37.2, glucose: 320 },
  },
  {
    id: 'pat_4',
    name: 'Carlos Eduardo Mendes',
    cpf: '111.222.333-44',
    age: 57,
    sex: 'M',
    insurance: 'Unimed',
    waitMinutes: 2,
    specialty: 'Neurologia',
    status: 'AGENDADO' as const,
    vitals: { bp: '130/80', hr: 72, spo2: 98, temp: 36.5, glucose: 95 },
  },
]

export const MOCK_APPOINTMENTS_TODAY = [
  { time: '08:30', patient: 'Maria Aparecida dos Santos', type: 'Retorno', specialty: 'Cardiologia', status: 'EM_TRIAGEM' },
  { time: '09:00', patient: 'João Paulo Ferreira', type: '1ª consulta', specialty: 'Clínica Geral', status: 'AGENDADO' },
  { time: '09:30', patient: 'Ana Beatriz Lima', type: 'Urgência', specialty: 'Endocrinologia', status: 'URGENTE' },
  { time: '10:00', patient: 'Carlos Eduardo Mendes', type: 'Retorno', specialty: 'Neurologia', status: 'AGENDADO' },
  { time: '14:00', patient: 'Fernanda Costa Souza', type: '1ª consulta', specialty: 'Psiquiatria', status: 'AGENDADO' },
]

export const MOCK_USERS = [
  { id: 'usr_1', name: 'Dr. Rafael Souza', email: 'medico@clinica.com.br', role: 'MEDICO', plan: 'PRO', active: true, lastAccess: 'Agora' },
  { id: 'usr_2', name: 'Dra. Carla Figueiredo', email: 'carla@clinica.com.br', role: 'MEDICO', plan: 'PRO', active: true, lastAccess: '1h atrás' },
  { id: 'usr_3', name: 'Aline Santos', email: 'recepcao@clinica.com.br', role: 'RECEPCAO', plan: 'STARTER', active: true, lastAccess: '30 min' },
  { id: 'usr_4', name: 'Admin Clínica', email: 'admin@clinica.com.br', role: 'ADMIN', plan: 'ENTERPRISE', active: true, lastAccess: '2 dias' },
]
