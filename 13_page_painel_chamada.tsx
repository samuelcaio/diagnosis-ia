'use client'
// src/app/(dashboard)/painel-chamada/page.tsx

import { useState, useEffect, useRef } from 'react'
import { Bell, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface Patient {
  id: string
  name: string
  waitMinutes: number
  specialty: string
  status: 'waiting' | 'calling' | 'called'
  priority: 'normal' | 'urgent'
}

const INITIAL_QUEUE: Patient[] = [
  { id: '1', name: 'Maria Aparecida dos Santos', waitMinutes: 23, specialty: 'Cardiologia', status: 'waiting', priority: 'normal' },
  { id: '2', name: 'João Paulo Ferreira',         waitMinutes: 15, specialty: 'Clínica Geral', status: 'waiting', priority: 'normal' },
  { id: '3', name: 'Ana Beatriz Lima',             waitMinutes: 8,  specialty: 'Endocrinologia', status: 'waiting', priority: 'urgent' },
  { id: '4', name: 'Carlos Eduardo Mendes',        waitMinutes: 2,  specialty: 'Neurologia', status: 'waiting', priority: 'normal' },
  { id: '5', name: 'Fernanda Costa Souza',         waitMinutes: 0,  specialty: 'Psiquiatria', status: 'waiting', priority: 'normal' },
]

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => {
      osc.frequency.value = 1100
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.6)
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.65)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9)
    }, 600)
  } catch (_) { /* AudioContext não disponível */ }
}

export default function PainelChamadaPage() {
  const [queue, setQueue] = useState<Patient[]>(INITIAL_QUEUE)
  const [callingId, setCallingId] = useState<string | null>(null)
  const [stats, setStats] = useState({ attended: 7, avgTime: 18, inConsult: 1 })
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Simula atualização em tempo real (mock com setInterval)
  // TODO: Substituir por WebSocket ou SSE para produção
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(q => q.map(p => ({
        ...p,
        waitMinutes: p.status === 'waiting' ? p.waitMinutes + 1 : p.waitMinutes,
      })))
    }, 60000) // atualiza a cada 60s
    return () => clearInterval(interval)
  }, [])

  function callPatient(id: string) {
    setCallingId(id)
    setQueue(q => q.map(p => ({ ...p, status: p.id === id ? 'calling' : p.status })))
    playBeep()

    // Após 5s, marca como chamado
    timerRef.current = setTimeout(() => {
      setQueue(q => q.map(p => ({ ...p, status: p.id === id ? 'called' : p.status })))
      setStats(s => ({ ...s, attended: s.attended + 1 }))
      setCallingId(null)
    }, 5000)
  }

  function resetPatient(id: string) {
    setQueue(q => q.map(p => ({ ...p, status: p.id === id ? 'waiting' : p.status })))
  }

  const waiting = queue.filter(p => p.status === 'waiting' || p.status === 'calling')
  const callingPatient = queue.find(p => p.id === callingId)

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Painel de Chamada</h1>
      <p className="text-sm text-slate-500 mb-6">Fila de atendimento em tempo real</p>

      {/* Chamada ativa */}
      {callingPatient && (
        <div className="bg-slate-900 rounded-xl p-6 text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-full bg-emerald-500 items-center justify-center mb-4 animate-ping-slow">
            <Bell className="w-7 h-7 text-white" />
          </div>
          <p className="text-3xl font-bold text-white mb-2">{callingPatient.name}</p>
          <p className="text-slate-400 text-sm">Chamando para o Consultório 3</p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Em chamada
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Fila */}
        <div className="col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Fila de espera</h2>
              <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-medium">
                {waiting.length} aguardando
              </span>
            </div>

            <div className="space-y-3">
              {queue.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all duration-300 ${
                    p.status === 'calling' ? 'border-sky-400 bg-sky-50 shadow-sm shadow-sky-100' :
                    p.status === 'called'  ? 'border-slate-100 bg-slate-50 opacity-50' :
                    p.priority === 'urgent' ? 'border-red-200 bg-red-50' :
                    'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Número */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                    p.status === 'calling' ? 'bg-emerald-500 text-white animate-pulse' :
                    p.status === 'called'  ? 'bg-slate-200 text-slate-500' :
                    p.priority === 'urgent' ? 'bg-red-500 text-white' :
                    'bg-sky-600 text-white'
                  }`}>
                    {p.status === 'called' ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${p.status === 'called' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{p.specialty}</span>
                      {p.status === 'waiting' && p.waitMinutes > 0 && (
                        <span className={`flex items-center gap-1 text-xs ${p.waitMinutes > 20 ? 'text-red-500' : 'text-slate-400'}`}>
                          <Clock className="w-3 h-3" />
                          {p.waitMinutes} min
                        </span>
                      )}
                      {p.priority === 'urgent' && (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertCircle className="w-3 h-3" />urgente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ação */}
                  {p.status === 'waiting' && (
                    <button
                      onClick={() => callPatient(p.id)}
                      disabled={!!callingId && callingId !== p.id}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
                        p.priority === 'urgent'
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-sky-600 hover:bg-sky-700 text-white'
                      }`}
                    >
                      {p.priority === 'urgent' ? 'Urgente' : 'Chamar'}
                    </button>
                  )}
                  {p.status === 'calling' && (
                    <span className="text-xs text-emerald-600 font-medium animate-pulse">Chamando...</span>
                  )}
                  {p.status === 'called' && (
                    <button onClick={() => resetPatient(p.id)} className="text-xs text-slate-400 hover:text-slate-600">
                      Resetar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Estatísticas do turno</h2>
            <div className="space-y-3">
              {[
                { label: 'Pacientes atendidos', value: stats.attended, color: 'text-emerald-600' },
                { label: 'Tempo médio', value: `${stats.avgTime} min`, color: 'text-sky-600' },
                { label: 'Em consulta agora', value: stats.inConsult, color: 'text-amber-600' },
                { label: 'Na fila', value: waiting.length, color: 'text-red-500' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Em atendimento agora</h2>
            <div className="bg-sky-50 rounded-lg p-3">
              <p className="text-sm font-medium text-sky-900">Dr. Rafael Souza</p>
              <p className="text-xs text-slate-500 mt-0.5">Consultório 3 · Desde 08:45</p>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Em consulta
                </span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
            <p className="font-medium mb-1">💡 Atualização automática</p>
            <p>A fila é atualizada em tempo real. Em produção, use WebSocket ou SSE para sincronização entre múltiplos terminais.</p>
            {/* TODO: Implementar SSE ou WebSocket para sincronização real-time */}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ping-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
        .animate-ping-slow { animation: ping-slow 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
