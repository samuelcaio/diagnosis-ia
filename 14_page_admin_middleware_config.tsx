'use client'
// src/app/(dashboard)/admin/page.tsx

import { useState, useEffect } from 'react'
import { Users, Shield, ToggleLeft, ToggleRight, Plus, Loader2 } from 'lucide-react'

type Role = 'ADMIN' | 'MEDICO' | 'RECEPCAO'
type Plan = 'STARTER' | 'PRO' | 'ENTERPRISE'

interface User {
  id: string
  name: string
  email: string
  role: Role
  plan: Plan
  active: boolean
  lastAccess?: string
}

const MOCK_USERS: User[] = [
  { id: '1', name: 'Dr. Rafael Souza', email: 'medico@clinica.com.br', role: 'MEDICO', plan: 'PRO', active: true, lastAccess: 'Agora' },
  { id: '2', name: 'Dra. Carla Figueiredo', email: 'carla@clinica.com.br', role: 'MEDICO', plan: 'PRO', active: true, lastAccess: '1h atrás' },
  { id: '3', name: 'Aline Santos', email: 'recepcao@clinica.com.br', role: 'RECEPCAO', plan: 'STARTER', active: true, lastAccess: '30 min' },
  { id: '4', name: 'Admin Clínica', email: 'admin@clinica.com.br', role: 'ADMIN', plan: 'ENTERPRISE', active: true, lastAccess: '2 dias' },
  { id: '5', name: 'Dr. Marcos Lima', email: 'marcos@clinica.com.br', role: 'MEDICO', plan: 'PRO', active: false, lastAccess: '15 dias' },
]

const MODULES = [
  { id: 'checklist',   label: '📋 Pré-prontuário digital', desc: 'Checklist clínico em etapas', plans: ['STARTER', 'PRO', 'ENTERPRISE'] },
  { id: 'ai',          label: '🤖 Simulação IA',           desc: 'Predição de risco clínico explicável', plans: ['PRO', 'ENTERPRISE'] },
  { id: 'call-panel',  label: '📢 Painel de chamada',      desc: 'Fila de atendimento em tempo real', plans: ['STARTER', 'PRO', 'ENTERPRISE'] },
  { id: 'scheduling',  label: '📅 Agendamento avançado',   desc: 'Calendário multi-profissional', plans: ['PRO', 'ENTERPRISE'] },
  { id: 'prescription',label: '💊 Prescrição digital',     desc: 'Integração com farmácias · Em breve', plans: ['ENTERPRISE'] },
]

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    ADMIN:    'bg-red-100 text-red-700 border border-red-200',
    MEDICO:   'bg-sky-100 text-sky-700 border border-sky-200',
    RECEPCAO: 'bg-slate-100 text-slate-700 border border-slate-200',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[role]}`}>{role}</span>
}

function PlanBadge({ plan }: { plan: Plan }) {
  const map: Record<Plan, string> = {
    STARTER:    'bg-slate-100 text-slate-600',
    PRO:        'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[plan]}`}>{plan}</span>
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [modules, setModules] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map(m => [m.id, m.plans.includes('PRO')]))
  )
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function toggleModule(id: string) {
    setModules(m => {
      const next = { ...m, [id]: !m[id] }
      showToast(next[id] ? 'Módulo ativado' : 'Módulo desativado')
      return next
    })
  }

  function toggleUser(id: string) {
    setUsers(u => u.map(user =>
      user.id === id ? { ...user, active: !user.active } : user
    ))
    showToast('Status do usuário atualizado')
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Administração</h1>
      <p className="text-sm text-slate-500 mb-6">Gestão de usuários, planos e módulos do sistema</p>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Usuários ativos', value: users.filter(u => u.active).length, icon: Users, color: 'text-sky-600' },
          { label: 'Plano atual', value: 'Pro', icon: Shield, color: 'text-purple-600' },
          { label: 'Módulos ativos', value: `${Object.values(modules).filter(Boolean).length}/${MODULES.length}`, icon: ToggleRight, color: 'text-emerald-600' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{m.label}</p>
            <div className="flex items-center gap-2">
              <m.icon className={`w-5 h-5 ${m.color}`} />
              <span className="text-2xl font-semibold">{m.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de usuários */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Usuários do sistema</h2>
          <button
            onClick={() => showToast('Formulário de novo usuário em breve')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Novo usuário
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                {['Nome', 'E-mail', 'Perfil', 'Plano', 'Status', 'Último acesso', 'Ação'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-2 px-3 first:pl-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3 pl-0 text-sm font-medium text-slate-900">{u.name}</td>
                  <td className="py-3 px-3 text-sm text-slate-500">{u.email}</td>
                  <td className="py-3 px-3"><RoleBadge role={u.role} /></td>
                  <td className="py-3 px-3"><PlanBadge plan={u.plan} /></td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-400">{u.lastAccess ?? '—'}</td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggleUser(u.id)}
                      className="text-xs text-slate-500 hover:text-sky-600 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Módulos */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Módulos disponíveis</h2>
        <div className="space-y-1">
          {MODULES.map((m, i) => (
            <div key={m.id} className={`flex items-center justify-between py-3.5 ${i < MODULES.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div>
                <p className="text-sm font-medium text-slate-900">{m.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-400">{m.desc}</p>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{m.plans.join(', ')}</span>
                </div>
              </div>
              <button
                onClick={() => toggleModule(m.id)}
                className={`relative w-10 h-5 rounded-full transition-colors ${modules[m.id] ? 'bg-sky-600' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${modules[m.id] ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-slide-in z-50">
          <span className="text-emerald-400">✓</span> {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.2s ease; }
        .left-5\\.5 { left: 1.375rem; }
      `}</style>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// middleware.ts (raiz do projeto — src/middleware.ts)
// ═══════════════════════════════════════════════════════════════
/*
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('diagnosis_token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  const session = await verifyToken(token)
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  // Proteger rota /admin somente para ADMIN
  if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
*/


// ═══════════════════════════════════════════════════════════════
// next.config.ts
// ═══════════════════════════════════════════════════════════════
/*
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
  images: { domains: [] },
  // TODO: adicionar domínio da CDN quando deploy em produção
}

export default nextConfig
*/


// ═══════════════════════════════════════════════════════════════
// .env.local (não commitar!)
// ═══════════════════════════════════════════════════════════════
/*
DATABASE_URL="file:./dev.db"
JWT_SECRET="diagnosis-ia-jwt-secret-mude-para-chave-longa-em-producao"
# TODO: Em produção, gerar com: openssl rand -base64 64
# TODO: Para PostgreSQL: DATABASE_URL="postgresql://user:pass@host:5432/db"
# TODO: Para SSO: NEXTAUTH_SECRET="..." NEXTAUTH_URL="https://..."
*/
