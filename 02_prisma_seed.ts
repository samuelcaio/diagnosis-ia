// prisma/seed.ts
import { PrismaClient, Role, Plan, AppointmentStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('senha123', 10)

  // Usuários
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com.br' },
    update: {},
    create: {
      email: 'admin@clinica.com.br',
      name: 'Admin Clínica',
      password: hash,
      role: Role.ADMIN,
      plan: Plan.ENTERPRISE,
    },
  })

  const medico = await prisma.user.upsert({
    where: { email: 'medico@clinica.com.br' },
    update: {},
    create: {
      email: 'medico@clinica.com.br',
      name: 'Dr. Rafael Souza',
      password: hash,
      role: Role.MEDICO,
      plan: Plan.PRO,
    },
  })

  await prisma.user.upsert({
    where: { email: 'recepcao@clinica.com.br' },
    update: {},
    create: {
      email: 'recepcao@clinica.com.br',
      name: 'Aline Santos',
      password: hash,
      role: Role.RECEPCAO,
      plan: Plan.STARTER,
    },
  })

  // Pacientes mock
  const p1 = await prisma.patient.upsert({
    where: { cpf: '042.312.555-98' },
    update: {},
    create: {
      name: 'João Paulo Ferreira',
      cpf: '042.312.555-98',
      birthDate: new Date('1985-03-15'),
      phone: '(65) 98841-1234',
      insurance: 'Unimed',
      sex: 'M',
    },
  })

  const p2 = await prisma.patient.upsert({
    where: { cpf: '123.456.789-00' },
    update: {},
    create: {
      name: 'Maria Aparecida dos Santos',
      cpf: '123.456.789-00',
      birthDate: new Date('1962-07-22'),
      phone: '(65) 99321-5678',
      insurance: 'Bradesco Saúde',
      sex: 'F',
    },
  })

  const p3 = await prisma.patient.upsert({
    where: { cpf: '987.654.321-11' },
    update: {},
    create: {
      name: 'Ana Beatriz Lima',
      cpf: '987.654.321-11',
      birthDate: new Date('1990-11-30'),
      phone: '(65) 97654-3210',
      insurance: 'SUS',
      sex: 'F',
    },
  })

  // Consultas
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.appointment.createMany({
    skipDuplicates: true,
    data: [
      {
        patientId: p2.id,
        doctorId: medico.id,
        dateTime: new Date(today.getTime() + 8.5 * 3600000),
        specialty: 'Cardiologia',
        type: 'Retorno',
        status: AppointmentStatus.EM_TRIAGEM,
      },
      {
        patientId: p1.id,
        doctorId: medico.id,
        dateTime: new Date(today.getTime() + 9 * 3600000),
        specialty: 'Clínica Geral',
        type: '1ª consulta',
        status: AppointmentStatus.AGENDADO,
      },
      {
        patientId: p3.id,
        doctorId: medico.id,
        dateTime: new Date(today.getTime() + 9.5 * 3600000),
        specialty: 'Endocrinologia',
        type: 'Urgência',
        status: AppointmentStatus.AGENDADO,
      },
    ],
  })

  // Checklist mock
  await prisma.checklist.create({
    data: {
      patientId: p1.id,
      doctorId: medico.id,
      aiScore: 78.4,
      data: JSON.stringify({
        demographics: {
          name: 'João Paulo Ferreira',
          cpf: '042.312.555-98',
          birthDate: '1985-03-15',
          sex: 'M',
          insurance: 'Unimed',
        },
        vitals: {
          bp: '142/88',
          hr: 98,
          spo2: 96,
          temp: 38.4,
          rr: 22,
          glucose: 182,
          weight: 82,
          height: 175,
        },
        symptoms: {
          chief: 'Febre alta há 2 dias, calafrios, dor lombar intensa, disúria, confusão mental.',
          onset: '2026-04-19',
          severity: 7,
          associated: ['Febre', 'Confusão mental', 'Dor lombar', 'Disúria', 'Calafrios'],
        },
        history: {
          comorbidities: 'Diabetes mellitus tipo 2, HAS, ITU de repetição',
          medications: 'Metformina 850mg, Losartana 50mg, Atorvastatina 20mg',
          allergies: 'Penicilina, AAS',
          hospitalizations: '2023 — Pneumonia (UTI 10 dias)',
        },
      }),
      riskFlags: JSON.stringify([
        { level: 'high', label: 'Sepse urinária provável', detail: 'qSOFA 2/3' },
        { level: 'high', label: 'Hiperglicemia descompensada', detail: 'Glicemia 182 + DM2' },
        { level: 'medium', label: 'Hipertensão não controlada', detail: 'PA 142/88 sob medicação' },
      ]),
    },
  })

  console.log('✅ Seed concluído com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
