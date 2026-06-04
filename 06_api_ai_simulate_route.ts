// src/app/api/ai-simulate/route.ts
// TODO: Substituir o algoritmo mock pela chamada real ao modelo de ML
// Opções: OpenAI Function Calling, HuggingFace Inference, modelo local ONNX

import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema de validação dos parâmetros clínicos
const ClinicalInputSchema = z.object({
  temperature: z.number().min(30).max(44),        // Temperatura corporal em °C
  heartRate: z.number().min(20).max(300),          // FC em bpm
  sysBP: z.number().min(50).max(280),              // Pressão sistólica
  spo2: z.number().min(50).max(100),               // Saturação O₂ em %
  glucose: z.number().min(20).max(800),            // Glicemia mg/dL
  mentalConfusion: z.boolean(),                    // Confusão mental (qSOFA)
  respiratoryRate: z.number().min(5).max(60).optional(),
  age: z.number().min(0).max(130).optional(),
  hasDiabetes: z.boolean().optional(),
  hasHypertension: z.boolean().optional(),
  previousHospitalization: z.boolean().optional(),
})

export type ClinicalInput = z.infer<typeof ClinicalInputSchema>

export interface AISimulationResult {
  predictions: {
    label: string
    probability: number   // 0–100
    severity: 'low' | 'medium' | 'high' | 'critical'
    color: string
  }[]
  topDiagnosis: string
  recommendation: string
  qsofa: number           // 0–3
  factors: {
    name: string
    value: string | number
    contribution: number  // 0–100, contribuição relativa ao diagnóstico principal
    direction: 'risk' | 'protective' | 'neutral'
    color: string
  }[]
  confidence: number      // 0–100
  processingMs: number
}

// ─── Algoritmo mock (substituir por modelo real) ───────────────────────────
function computeRisk(input: ClinicalInput): AISimulationResult {
  const start = Date.now()

  // qSOFA: 3 critérios (1 ponto cada)
  const qsofa =
    (input.sysBP <= 100 ? 1 : 0) +
    (input.respiratoryRate && input.respiratoryRate >= 22 ? 1 : 0) +
    (input.mentalConfusion ? 1 : 0)

  // Score de sepse (0–100)
  let sepseScore = 0
  if (input.temperature > 38.2 || input.temperature < 36)  sepseScore += 22
  if (input.heartRate > 90)                                  sepseScore += 15
  if (input.sysBP <= 100)                                    sepseScore += 20
  if (input.spo2 < 95)                                       sepseScore += 12
  if (input.mentalConfusion)                                 sepseScore += 20
  if (input.glucose > 140 && input.hasDiabetes)             sepseScore += 8
  if (input.respiratoryRate && input.respiratoryRate >= 22)  sepseScore += 15
  if (qsofa >= 2)                                            sepseScore += 10
  if (input.previousHospitalization)                         sepseScore += 5
  sepseScore = Math.min(Math.max(sepseScore, 5), 97)

  // Score IAM / SCA
  let iamScore = 0
  if (input.sysBP > 160)              iamScore += 15
  if (input.heartRate > 100)          iamScore += 12
  if (input.spo2 < 95)                iamScore += 10
  if (input.age && input.age > 55)    iamScore += 10
  if (input.hasHypertension)          iamScore += 8
  iamScore = Math.min(iamScore + 5, 55)

  // Score ITU não complicada (residual)
  const ituScore = Math.max(5, 100 - sepseScore - iamScore - 10)

  const total = sepseScore + iamScore + ituScore
  const norm = (v: number) => Math.round((v / total) * 100)

  const predictions = [
    {
      label: 'Sepse provável',
      probability: norm(sepseScore),
      severity: sepseScore > 70 ? 'critical' : sepseScore > 50 ? 'high' : 'medium' as const,
      color: '#EF4444',
    },
    {
      label: 'IAM / SCA',
      probability: norm(iamScore),
      severity: iamScore > 35 ? 'high' : 'medium' as const,
      color: '#F59E0B',
    },
    {
      label: 'ITU não complicada',
      probability: norm(ituScore),
      severity: 'low' as const,
      color: '#059669',
    },
  ].sort((a, b) => b.probability - a.probability)

  const topDiagnosis = predictions[0].label
  const topProb = predictions[0].probability

  const recommendation =
    topProb > 70
      ? '⚠️ Risco crítico — acionamento imediato da equipe de UTI recomendado. Colher hemoculturas, iniciar antibioticoterapia empírica e monitorização invasiva.'
      : topProb > 50
      ? '⚠️ Risco elevado — internação hospitalar e investigação laboratorial urgente (lactato, hemograma, PCR, ureia, creatinina).'
      : '📋 Risco moderado — observação clínica, exames complementares e reavaliação em 2–4h.'

  // Contribuição de cada fator para o diagnóstico principal
  const factors = [
    {
      name: 'Temperatura corporal',
      value: `${input.temperature} °C`,
      contribution: input.temperature > 38.2 ? 22 : input.temperature < 36 ? 18 : 3,
      direction: (input.temperature > 38.2 || input.temperature < 36) ? 'risk' : 'protective' as const,
      color: '#EF4444',
    },
    {
      name: 'Confusão mental',
      value: input.mentalConfusion ? 'Presente' : 'Ausente',
      contribution: input.mentalConfusion ? 20 : 2,
      direction: input.mentalConfusion ? 'risk' : 'protective' as const,
      color: input.mentalConfusion ? '#EF4444' : '#059669',
    },
    {
      name: 'Pressão arterial sistólica',
      value: `${input.sysBP} mmHg`,
      contribution: input.sysBP <= 100 ? 20 : input.sysBP > 160 ? 14 : 6,
      direction: (input.sysBP <= 100 || input.sysBP > 160) ? 'risk' : 'protective' as const,
      color: input.sysBP <= 100 ? '#EF4444' : input.sysBP > 140 ? '#F59E0B' : '#059669',
    },
    {
      name: 'Frequência cardíaca',
      value: `${input.heartRate} bpm`,
      contribution: input.heartRate > 100 ? 18 : input.heartRate > 90 ? 12 : 4,
      direction: input.heartRate > 90 ? 'risk' : 'protective' as const,
      color: input.heartRate > 100 ? '#EF4444' : '#F59E0B',
    },
    {
      name: 'Saturação O₂',
      value: `${input.spo2} %`,
      contribution: input.spo2 < 90 ? 15 : input.spo2 < 95 ? 10 : 2,
      direction: input.spo2 < 95 ? 'risk' : 'protective' as const,
      color: input.spo2 < 90 ? '#EF4444' : input.spo2 < 95 ? '#F59E0B' : '#059669',
    },
    {
      name: 'Glicemia capilar',
      value: `${input.glucose} mg/dL`,
      contribution: input.glucose > 250 ? 12 : input.glucose > 140 ? 8 : 2,
      direction: input.glucose > 140 ? 'risk' : 'neutral' as const,
      color: input.glucose > 250 ? '#EF4444' : input.glucose > 140 ? '#F59E0B' : '#059669',
    },
  ].sort((a, b) => b.contribution - a.contribution)

  return {
    predictions,
    topDiagnosis,
    recommendation,
    qsofa,
    factors,
    confidence: Math.round(65 + Math.random() * 20), // TODO: calibrar com modelo real
    processingMs: Date.now() - start,
  }
}

// ─── Handler HTTP ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = ClinicalInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados clínicos inválidos.', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // TODO: Substituir por chamada ao modelo real de ML
    // Exemplo com OpenAI:
    // const result = await openai.chat.completions.create({
    //   model: 'gpt-4-turbo',
    //   tools: [{ type: 'function', function: clinicalRiskSchema }],
    //   messages: [{ role: 'user', content: buildClinicalPrompt(parsed.data) }]
    // })
    const result = computeRisk(parsed.data)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[AI-SIMULATE ERROR]', err)
    return NextResponse.json({ error: 'Erro ao processar simulação.' }, { status: 500 })
  }
}
