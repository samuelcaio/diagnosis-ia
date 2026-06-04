'use client'
// src/app/(dashboard)/checklist/page.tsx

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

// ─── Zod Schema completo ────────────────────────────────────────────────────
const ChecklistSchema = z.object({
  // Etapa 1 — Dados demográficos
  demographics: z.object({
    name:      z.string().min(3, 'Nome obrigatório'),
    cpf:       z.string().min(11, 'CPF inválido'),
    birthDate: z.string().min(1, 'Data obrigatória'),
    phone:     z.string().optional(),
    sex:       z.enum(['M', 'F', 'OUTRO']),
    insurance: z.string().min(1, 'Convênio obrigatório'),
  }),
  // Etapa 2 — Sinais vitais
  vitals: z.object({
    bpSys:  z.coerce.number().min(50).max(280),
    bpDia:  z.coerce.number().min(30).max(180),
    hr:     z.coerce.number().min(20).max(300),
    spo2:   z.coerce.number().min(50).max(100),
    temp:   z.coerce.number().min(30).max(44),
    rr:     z.coerce.number().min(5).max(60),
    glucose:z.coerce.number().min(20).max(800),
    weight: z.coerce.number().min(1).max(300),
    height: z.coerce.number().min(50).max(250),
  }),
  // Etapa 3 — Sintomas
  symptoms: z.object({
    chief:    z.string().min(10, 'Descreva a queixa principal'),
    onset:    z.string().min(1),
    severity: z.coerce.number().min(0).max(10),
    associated: z.array(z.string()),
  }),
  // Etapa 4 — Histórico
  history: z.object({
    comorbidities:     z.string(),
    medications:       z.string(),
    allergies:         z.string(),
    hospitalizations:  z.string(),
  }),
})
type ChecklistData = z.infer<typeof ChecklistSchema>

// ─── Tipos de flags de risco ────────────────────────────────────────────────
interface RiskFlag {
  level: 'high' | 'medium' | 'low'
  label: string
  detail: string
}

function computeRiskFlags(data: ChecklistData): RiskFlag[] {
  const flags: RiskFlag[] = []
  const { vitals, symptoms, history } = data
  const hasDM = history.comorbidities.toLowerCase().includes('diabetes')
  const hasHAS = history.comorbidities.toLowerCase().includes('hipertensão') || history.comorbidities.toLowerCase().includes('has')

  const qsofa =
    (vitals.bpSys <= 100 ? 1 : 0) +
    (vitals.rr >= 22 ? 1 : 0) +
    (symptoms.associated.includes('Confusão mental') ? 1 : 0)

  if (qsofa >= 2 || (vitals.temp > 38.2 && symptoms.associated.length >= 2)) {
    flags.push({ level: 'high', label: 'Sepse provável', detail: `qSOFA ${qsofa}/3 — avaliação imediata recomendada` })
  }
  if (vitals.glucose > 250 && hasDM) {
    flags.push({ level: 'high', label: 'Hiperglicemia descompensada', detail: `Glicemia ${vitals.glucose} mg/dL com DM ativo` })
  }
  if (vitals.bpSys > 180 || vitals.bpDia > 110) {
    flags.push({ level: 'high', label: 'Crise hipertensiva', detail: `PA ${vitals.bpSys}/${vitals.bpDia} mmHg` })
  }
  if (vitals.bpSys > 140 && hasHAS) {
    flags.push({ level: 'medium', label: 'Hipertensão não controlada', detail: `PA ${vitals.bpSys}/${vitals.bpDia} sob medicação` })
  }
  if (vitals.spo2 < 93) {
    flags.push({ level: 'high', label: 'Hipoxemia significativa', detail: `SpO₂ ${vitals.spo2}% — oxigenoterapia necessária` })
  } else if (vitals.spo2 < 96) {
    flags.push({ level: 'medium', label: 'Saturação limítrofe', detail: `SpO₂ ${vitals.spo2}% — monitorar` })
  }
  if (vitals.hr > 120) {
    flags.push({ level: 'medium', label: 'Taquicardia importante', detail: `FC ${vitals.hr} bpm` })
  }
  if (flags.length === 0) {
    flags.push({ level: 'low', label: 'Sem flags críticos', detail: 'Parâmetros dentro da normalidade — consulta de rotina' })
  }
  return flags
}

// ─── Componentes de campo ──────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const INPUT_CLS = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 transition-colors"
const SYMPTOMS_LIST = ['Febre', 'Calafrios', 'Dor lombar', 'Disúria', 'Confusão mental', 'Náusea', 'Cefaleia', 'Dispneia', 'Dor torácica', 'Edema']

// ─── Steps ──────────────────────────────────────────────────────────────────
const STEPS = ['Dados', 'Vitais', 'Sintomas', 'Histórico', 'Flags']

// ─── Page ───────────────────────────────────────────────────────────────────
export default function ChecklistPage() {
  const [step, setStep] = useState(0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([])

  const methods = useForm<ChecklistData>({
    resolver: zodResolver(ChecklistSchema),
    defaultValues: {
      demographics: { name: 'João Paulo Ferreira', cpf: '042.312.555-98', birthDate: '1985-03-15', phone: '(65) 98841-1234', sex: 'M', insurance: 'Unimed' },
      vitals: { bpSys: 142, bpDia: 88, hr: 98, spo2: 96, temp: 38.4, rr: 22, glucose: 182, weight: 82, height: 175 },
      symptoms: { chief: 'Febre alta há 2 dias associada a calafrios, dor lombar intensa e ardência ao urinar.', onset: '2026-04-19', severity: 7, associated: ['Febre', 'Dor lombar', 'Confusão mental'] },
      history: { comorbidities: 'Diabetes mellitus tipo 2, HAS, ITU de repetição', medications: 'Metformina 850mg, Losartana 50mg', allergies: 'Penicilina', hospitalizations: '2023 — Pneumonia (UTI 10 dias)' },
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = methods

  function goTo(n: number) {
    if (n === 4) {
      const data = methods.getValues()
      setRiskFlags(computeRiskFlags(data))
    }
    setStep(n)
  }

  async function onSave(data: ChecklistData) {
    setSaving(true)
    const flags = computeRiskFlags(data)
    // TODO: Substituir por chamada à API /api/checklists
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
  }

  const selectedSymptoms = watch('symptoms.associated') ?? []
  function toggleSymptom(s: string) {
    const cur = methods.getValues('symptoms.associated')
    setValue('symptoms.associated', cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s])
  }

  const bmi = () => {
    const w = methods.watch('vitals.weight'), h = methods.watch('vitals.height')
    if (!w || !h) return '—'
    const bmi = w / Math.pow(h / 100, 2)
    const label = bmi < 18.5 ? 'Abaixo do peso' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidade'
    return `${bmi.toFixed(1)} — ${label}`
  }

  if (saved) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Pré-prontuário salvo!</h2>
      <p className="text-slate-500 mb-6">Os dados foram registrados e os flags de risco foram processados pela IA.</p>
      <button onClick={() => { setSaved(false); setStep(0) }} className="px-6 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-medium">
        Novo prontuário
      </button>
    </div>
  )

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSave)}>
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Pré-prontuário</h1>
        <p className="text-sm text-slate-500 mb-6">Coleta de dados clínicos em etapas</p>

        {/* Step nav */}
        <div className="flex mb-6 rounded-xl overflow-hidden border border-slate-200">
          {STEPS.map((s, i) => (
            <button
              key={s} type="button" onClick={() => goTo(i)}
              className={`flex-1 py-2.5 text-xs font-medium transition-all border-r last:border-r-0 border-slate-200 ${
                i === step ? 'bg-sky-600 text-white' : i < step ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >{i + 1}. {s}</button>
          ))}
        </div>

        {/* Step 0 — Dados */}
        {step === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold mb-5">Dados Demográficos</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome completo" error={errors.demographics?.name?.message}>
                <input {...register('demographics.name')} className={INPUT_CLS} />
              </Field>
              <Field label="Data de nascimento" error={errors.demographics?.birthDate?.message}>
                <input {...register('demographics.birthDate')} type="date" className={INPUT_CLS} />
              </Field>
              <Field label="CPF">
                <input {...register('demographics.cpf')} className={INPUT_CLS} />
              </Field>
              <Field label="Telefone">
                <input {...register('demographics.phone')} className={INPUT_CLS} />
              </Field>
              <Field label="Sexo biológico">
                <select {...register('demographics.sex')} className={INPUT_CLS}>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </Field>
              <Field label="Convênio">
                <select {...register('demographics.insurance')} className={INPUT_CLS}>
                  {['Unimed', 'SUS', 'Bradesco Saúde', 'Amil', 'Particular'].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex justify-end mt-6">
              <button type="button" onClick={() => goTo(1)} className="px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium">Próximo →</button>
            </div>
          </div>
        )}

        {/* Step 1 — Vitais */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold mb-5">Sinais Vitais</h2>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: 'PA Sistólica (mmHg)', key: 'vitals.bpSys' as const },
                { label: 'PA Diastólica (mmHg)', key: 'vitals.bpDia' as const },
                { label: 'FC (bpm)', key: 'vitals.hr' as const },
                { label: 'SpO₂ (%)', key: 'vitals.spo2' as const },
                { label: 'Temperatura (°C)', key: 'vitals.temp' as const },
                { label: 'FR (rpm)', key: 'vitals.rr' as const },
                { label: 'Glicemia (mg/dL)', key: 'vitals.glucose' as const },
                { label: 'Peso (kg)', key: 'vitals.weight' as const },
                { label: 'Altura (cm)', key: 'vitals.height' as const },
              ].map(({ label, key }) => (
                <Field key={key} label={label}>
                  <input {...register(key)} type="number" step="0.1" className={INPUT_CLS} />
                </Field>
              ))}
            </div>
            <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm">
              <span className="text-slate-500">IMC calculado: </span>
              <span className="font-medium">{bmi()}</span>
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => goTo(0)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm">← Voltar</button>
              <button type="button" onClick={() => goTo(2)} className="px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium">Próximo →</button>
            </div>
          </div>
        )}

        {/* Step 2 — Sintomas */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold mb-5">Sintomas Principais</h2>
            <div className="space-y-4">
              <Field label="Queixa principal" error={errors.symptoms?.chief?.message}>
                <textarea {...register('symptoms.chief')} rows={3} className={INPUT_CLS} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Início dos sintomas">
                  <input {...register('symptoms.onset')} type="date" className={INPUT_CLS} />
                </Field>
                <Field label="Intensidade da dor (0–10)">
                  <select {...register('symptoms.severity')} className={INPUT_CLS}>
                    {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}{i === 0 ? ' — Sem dor' : i <= 3 ? ' — Leve' : i <= 6 ? ' — Moderada' : ' — Intensa'}</option>)}
                  </select>
                </Field>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Sintomas associados</label>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS_LIST.map(s => (
                    <button
                      key={s} type="button" onClick={() => toggleSymptom(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        selectedSymptoms.includes(s) ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-200 text-slate-500 hover:border-sky-400'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => goTo(1)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm">← Voltar</button>
              <button type="button" onClick={() => goTo(3)} className="px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium">Próximo →</button>
            </div>
          </div>
        )}

        {/* Step 3 — Histórico */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold mb-5">Histórico Clínico</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Comorbidades">
                <textarea {...register('history.comorbidities')} rows={3} className={INPUT_CLS} />
              </Field>
              <Field label="Medicamentos em uso">
                <textarea {...register('history.medications')} rows={3} className={INPUT_CLS} />
              </Field>
              <Field label="Alergias">
                <input {...register('history.allergies')} className={INPUT_CLS} />
              </Field>
              <Field label="Internações anteriores">
                <input {...register('history.hospitalizations')} className={INPUT_CLS} />
              </Field>
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => goTo(2)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm">← Voltar</button>
              <button type="button" onClick={() => goTo(4)} className="px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium">Ver flags de risco →</button>
            </div>
          </div>
        )}

        {/* Step 4 — Flags */}
        {step === 4 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold mb-5">Flags de Risco Identificados</h2>
            <div className="space-y-3 mb-6">
              {riskFlags.map((flag, i) => (
                <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                  flag.level === 'high' ? 'bg-red-50 border-red-200' :
                  flag.level === 'medium' ? 'bg-amber-50 border-amber-200' :
                  'bg-emerald-50 border-emerald-200'
                }`}>
                  <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    flag.level === 'high' ? 'text-red-500' : flag.level === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                  }`} />
                  <div>
                    <p className={`text-sm font-semibold ${
                      flag.level === 'high' ? 'text-red-800' : flag.level === 'medium' ? 'text-amber-800' : 'text-emerald-800'
                    }`}>{flag.label}</p>
                    <p className={`text-xs mt-0.5 ${
                      flag.level === 'high' ? 'text-red-600' : flag.level === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{flag.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => goTo(3)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm">← Voltar</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : '✓ Salvar prontuário'}
              </button>
            </div>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
