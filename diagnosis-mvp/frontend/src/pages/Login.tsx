import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.tsx'
import { Activity, ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { DiagnosisLogo } from '../components/DiagnosisLogo.tsx'

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao autenticar.');
      }

      // Salva no estado global do AuthContext e no localStorage
      login(data.token, data.refreshToken, data.name, data.email, data.role, data.crm);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url('/login_bg.png')` }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[0.5px]"></div>

      <div className="relative w-full max-w-[380px] bg-slate-900/85 backdrop-blur-xl rounded-[2.5rem] p-9 shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-slate-800/80 flex flex-col justify-between animate-fade-in">
        
        {/* LOGO */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="bg-[#246393]/10 border border-[#246393]/30 p-2 rounded-[24px] shadow-sm w-24 h-24 flex items-center justify-center">
            <DiagnosisLogo size={76} />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-slate-100 tracking-tight mt-1">Diagnosis</h1>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/40 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <ShieldCheck size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">E-mail Clínico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medico@clinica.com.br"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-11 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 px-1">
            <span className="text-slate-500 font-medium">Acesso Restrito LGPD</span>
            <a href="#esqueci" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-all">Esqueci minha senha</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#246393] hover:bg-[#1E527B] text-white font-semibold py-3.5 rounded-2xl mt-6 shadow-md shadow-cyan-950/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
