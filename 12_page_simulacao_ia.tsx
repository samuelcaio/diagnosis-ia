'use client'
// src/app/(dashboard)/simulacao-ia/page.tsx

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Bot, Loader2, AlertTriangle, Info } from 'lucide-react'
import type { AISimulationResult } from '@/app/api/ai-simulate/route'

const FormSchema = z.object({
  temperature:     z.coerce.number().min(30).max(44),
  heartRate:       z.coerce.number().min(20).max(300),
  sysBP:           z.coerce.number().min(50).max(280),
  spo2:            z.coerce.number().min(50).max(100),
  glucose:         z.coerce.number().min(20).max(800),
  respiratoryRate: z.coerce.number().min(5).max(60),
  age:             z.coerce.number().min(0).max(130).optional(),
  mentalConfusion: z.boolean(),
  hasDiabetes:     z.boolean(),
  hasHypertension: z.boolean(),
})
type FormData = z.infer<typeof FormSchema>

const INPUT_CLS = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 transition-colors"

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    medium:   'bg-amber-100 text-amber-700 border-amber-200',
    low:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  }
  const labels: Record<string, string> = { critical: 'Crítico', high: 'Alto', medium: 'Moderado', low: 'Baixo' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[severity] ?? map.low}`}>
      {labels[severity] ?? severity}
    </span>
  )
}

export default function SimulacaoIAPage() {
  const [result, setResult] = useState<AISimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      temperature: 38.4, heartRate: 98, sysBP: 142, spo2: 96,
      glucose: 182, respiratoryRate: 22, age: 41,
      mentalConfusion: true, hasDiabetes: true, hasHypertension: true,
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/ai-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      setResult(json)
    } catch {
      setError('Falha de conexão com o servidor de IA.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Simulação IA Clínica</h1>
      <p className="text-sm text-slate-500 mb-6">Predição de risco com IA explicável · qSOFA + biomarcadores</p>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Input card */}
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Bot className="w-4 h-4 text-sky-600" />Parâmetros clínicos</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Temperatura (°C)', key: 'temperature' as const },
                { label: 'FC (bpm)', key: 'heartRate' as const },
                { label: 'PA sistólica (mmHg)', key: 'sysBP' as const },
                { label: 'SpO₂ (%)', key: 'spo2' as const },
                { label: 'Glicemia (mg/dL)', key: 'glucose' as const },
                { label: 'FR (rpm)', key: 'respiratoryRate' as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input {...register(key)} type="number" step="0.1" className={INPUT_CLS} />
                  {errors[key] && <p className="text-xs text-red-500">{errors[key]?.message}</p>}
                </div>
              ))}
            </div>
            <div className="pt-1 space-y-2">
              {[
                { key: 'mentalConfusion' as const, label: 'Confusão mental presente' },
                { key: 'hasDiabetes' as const, label: 'Diabetes mellitus' },
                { key: 'hasHypertension' as const, label: 'Hipertensão arterial' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input {...register(key)} type="checkbox" className="w-4 h-4 accent-sky-600" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processando...</> : '🤖 Executar análise IA'}
            </button>
          </form>
        </div>

        {/* Result card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {!result && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <Bot className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Preencha os parâmetros e<br/>clique em "Executar análise IA"</p>
            </div>
          )}
          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-3 text-sky-600" />
              <p className="text-sm">Processando dados clínicos...</p>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
          {result && (
            <div>
              {/* Top diagnosis */}
              <div className="mb-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Diagnóstico principal</p>
                <p className="text-xl font-bold text-red-600">{result.topDiagnosis}</p>
                <div className="flex items-center gap-2 mt-1">
                  <SeverityBadge severity={result.predictions[0].severity} />
                  <span className="text-xs text-slate-500">Confiança: {result.confidence}% · qSOFA {result.qsofa}/3</span>
                </div>
              </div>

              {/* Probability bars */}
              <div className="mb-5">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={result.predictions} layout="vertical" margin={{ left: 0, right: 40 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Probabilidade']} />
                    <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                      {result.predictions.map((p, i) => (
                        <Cell key={i} fill={p.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recommendation */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                {result.recommendation}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explainability factors */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600" />
            Contribuição de fatores — IA explicável (XAI)
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {result.factors.map((f, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">{f.name}</p>
                <p className="text-base font-semibold" style={{ color: f.color }}>{String(f.value)}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Contribuição</span>
                    <span className="font-medium" style={{ color: f.color }}>{f.contribution}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${f.contribution * 4}%`, background: f.color }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Esta ferramenta é de apoio à decisão clínica. O diagnóstico final é de exclusiva responsabilidade do médico.
            {/* TODO: Integrar modelo real de ML aqui */}
          </p>
        </div>
      )}
    </div>
  )
}
