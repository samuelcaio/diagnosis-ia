'use client'
// src/app/(dashboard)/layout.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, ClipboardList,
  BellRing, Bot, Users, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',        icon: LayoutDashboard, roles: ['MEDICO', 'ADMIN', 'RECEPCAO'] },
  { href: '/agendamento',  label: 'Agendamento',       icon: Calendar,        roles: ['MEDICO', 'ADMIN', 'RECEPCAO'] },
  { href: '/checklist',    label: 'Pré-prontuário',    icon: ClipboardList,   roles: ['MEDICO', 'ADMIN', 'RECEPCAO'] },
  { href: '/painel-chamada', label: 'Painel de Chamada', icon: BellRing,      roles: ['MEDICO', 'ADMIN', 'RECEPCAO'] },
  { href: '/simulacao-ia', label: 'Simulação IA',      icon: Bot,             roles: ['MEDICO', 'ADMIN'] },
  { href: '/admin',        label: 'Administração',     icon: Users,           roles: ['ADMIN'] },
]

interface Session {
  name: string
  role: 'ADMIN' | 'MEDICO' | 'RECEPCAO'
  email: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // TODO: Substituir por hook useSession (NextAuth) em produção
    fetch('/api/auth/me').then(r => r.json()).then(setSession).catch(() => router.push('/login'))
  }, [])

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  const initials = session?.name?.split(' ').slice(0, 2).map(n => n[0]).join('') ?? '??'
  const visibleNav = NAV_ITEMS.filter(n => session ? n.roles.includes(session.role) : false)

  const TITLE_MAP: Record<string, string> = {
    '/dashboard': 'Dashboard', '/agendamento': 'Agendamento',
    '/checklist': 'Pré-prontuário', '/painel-chamada': 'Painel de Chamada',
    '/simulacao-ia': 'Simulação IA', '/admin': 'Administração',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-slate-900 flex flex-col flex-shrink-0 transition-all duration-200`}>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" stroke="white" strokeWidth="1.2" fill="none"/>
                <path d="M6 12l2.5-3 2.5 4.5 2-2.5 2 1.2" stroke="#7DD3FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Diagnosis IA</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Clinical</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {visibleNav.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-all ${
                  active
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-2 mb-2 p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {initials}
            </div>
            {!collapsed && session && (
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-medium text-white truncate">{session.name}</p>
                <p className="text-[10px] text-slate-500">{session.role}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-900">{TITLE_MAP[pathname] ?? 'Diagnóstico IA'}</p>
            <p className="text-xs text-slate-400">Início / {TITLE_MAP[pathname] ?? ''}</p>
          </div>
          <div className="flex-1" />
          <span className="text-xs bg-sky-100 text-sky-700 px-3 py-1 rounded-full font-medium">● Online</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
