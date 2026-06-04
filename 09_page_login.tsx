'use client'
// src/app/(auth)/login/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['MEDICO', 'RECEPCAO', 'ADMIN']),
})
type LoginForm = z.infer<typeof LoginSchema>

const ROLE_DEMO: Record<string, { email: string; label: string }> = {
  MEDICO:   { email: 'medico@clinica.com.br',   label: 'Médico' },
  RECEPCAO: { email: 'recepcao@clinica.com.br', label: 'Recepção' },
  ADMIN:    { email: 'admin@clinica.com.br',    label: 'Admin' },
}

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { role: 'MEDICO', email: 'medico@clinica.com.br', password: 'senha123' },
  })

  const currentRole = watch('role')

  function selectRole(role: 'MEDICO' | 'RECEPCAO' | 'ADMIN') {
    setValue('role', role)
    setValue('email', ROLE_DEMO[role].email)
  }

  async function onSubmit(data: LoginForm) {
    setServerError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })
      const json = await res.json()
      if (!res.ok) { setServerError(json.error); return }
      router.push(json.redirectTo)
    } catch {
      setServerError('Falha de conexão. Verifique sua rede.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-content-center bg-gradient-to-br from-slate-900 via-blue-950 to-sky-800">
      <div className="bg-white rounded-2xl p-12 w-[420px] shadow-2xl">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
              <path d="M16 4C9.4 4 4 9.4 4 16s5.4 12 12 12 12-5.4 12-12S22.6 4 16 4z" stroke="white" strokeWidth="1.2" fill="none"/>
              <path d="M8 16l3-4 3 6 2.5-3 3 1.5" stroke="#7DD3FC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">Diagnosis IA Clinical</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Suporte à Decisão Clínica</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Acesse sua conta</h1>
        <p className="text-sm text-slate-500 mb-7">Selecione seu perfil e entre com suas credenciais</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Role tabs */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Perfil de acesso</label>
            <div className="flex gap-1.5">
              {(['MEDICO', 'RECEPCAO', 'ADMIN'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => selectRole(r)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                    currentRole === r
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'border-slate-200 text-slate-500 hover:border-sky-400 hover:text-sky-600'
                  }`}
                >
                  {ROLE_DEMO[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">E-mail</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="seu@email.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Senha</label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="Sua senha"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{serverError}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Entrando...' : 'Entrar na plataforma'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">Protótipo · senha: senha123 · v1.0.0-beta</p>
      </div>
    </div>
  )
}
