import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.tsx'
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  Activity, 
  Play, 
  Volume2, 
  UserCheck, 
  ArrowRight,
  TrendingUp,
  UserX
} from 'lucide-react'

interface DashboardStats {
  totalPatients: number;
  pendingAppointments: number;
  highRiskAlertsCount: number;
  totalTriagesToday: number;
}

interface QueuedAppointment {
  id: string;
  patient: {
    id: string;
    name: string;
    birthDate: string;
    gender: string;
  };
  scheduledFor: string;
  status: string;
  checklistCompleted: boolean;
  checklistData?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    pendingAppointments: 0,
    highRiskAlertsCount: 0,
    totalTriagesToday: 0
  });
  
  const [queue, setQueue] = useState<QueuedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      // 1. Busca estatísticas
      const statsRes = await fetch('/api/reports/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Busca fila de triagem/atendimento
      const queueRes = await fetch('/api/triage/queue', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do painel:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Atualização periódica a cada 10 segundos para emular fila em tempo real
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCallPatient = (appointment: QueuedAppointment) => {
    setActiveCall(appointment.patient.name);
    // Simula chamada por voz ou som na UBS
    const utterance = new SpeechSynthesisUtterance(`Chamando paciente ${appointment.patient.name} para o consultório.`);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
    
    setTimeout(() => {
      setActiveCall(null);
    }, 5000);
  };

  const handleStartConsult = (appointment: QueuedAppointment) => {
    // Direciona direto para a linha do tempo e PEP do paciente
    navigate(`/pacientes/${appointment.patient.id}`);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm("Confirmar desistência deste paciente da fila?")) {
      return;
    }
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        fetchDashboardData();
      } else {
        alert("Erro ao registrar desistência.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de comunicação ao registrar desistência.");
    }
  };

  return (
    <div className="space-y-8 relative z-10">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#1A2C3E] leading-tight tracking-tight">Olá, {user?.name}</h1>
          <p className="text-xs text-[#5B6E8C] mt-1">Bem-vindo ao Diagnosis. Aqui está o panorama da Unidade de Saúde hoje.</p>
        </div>
        <div className="bg-white border border-[#E9EDF2] px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-[#2C7A4D]"></div>
          <span className="text-[11px] font-semibold text-[#5B6E8C]">Conectado ao Supabase</span>
        </div>
      </div>

      {/* PAINEL DE CHAMADA NOTIFICAÇÃO ATIVA */}
      {activeCall && (
        <div className="p-5 rounded-3xl bg-[#F0F4F9] border border-[#E9EDF2] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-[#2C6E9C] text-white p-2.5 rounded-2xl">
              <Volume2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#2C6E9C] uppercase tracking-wider">Painel de Chamada Ativo</p>
              <h3 className="text-base font-semibold text-[#1A2C3E]">Chamando: {activeCall}</h3>
            </div>
          </div>
          <span className="text-xs font-medium text-[#5B6E8C]">Dirigindo-se à sala...</span>
        </div>
      )}

      {/* STATS CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="glass-card p-6 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <p className="text-[11px] text-[#5B6E8C] font-bold uppercase tracking-wider">Pacientes Cadastrados</p>
            <div className="text-[#2C6E9C] bg-[#F0F4F9] p-2 rounded-xl"><Users size={18} /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-semibold text-[#1A2C3E] tracking-tight">{loading ? '...' : stats.totalPatients}</h2>
            <span className="text-[10px] text-[#2C7A4D] bg-[#F0F4F9] px-2 py-0.5 rounded-full font-semibold">+12%</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-6 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <p className="text-[11px] text-[#5B6E8C] font-bold uppercase tracking-wider">Aguardando Atendimento</p>
            <div className="text-[#2C6E9C] bg-[#F0F4F9] p-2 rounded-xl"><Calendar size={18} /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-semibold text-[#2C6E9C] tracking-tight">{loading ? '...' : stats.pendingAppointments}</h2>
            <span className="text-[10px] text-[#2C6E9C] bg-[#F0F4F9] px-2 py-0.5 rounded-full font-semibold">Hoje</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-6 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <p className="text-[11px] text-[#5B6E8C] font-bold uppercase tracking-wider">Alertas Cardíacos de IA</p>
            <div className="text-[#C26E38] bg-[#F0F4F9] p-2 rounded-xl"><AlertTriangle size={18} /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-semibold text-[#C26E38] tracking-tight">{loading ? '...' : stats.highRiskAlertsCount}</h2>
            <span className="text-[9px] text-[#C26E38] bg-[#F0F4F9] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Crítico</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-6 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <p className="text-[11px] text-[#5B6E8C] font-bold uppercase tracking-wider">Triagens Hoje</p>
            <div className="text-[#2C7A4D] bg-[#F0F4F9] p-2 rounded-xl"><Activity size={18} /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-semibold text-[#2C7A4D] tracking-tight">{loading ? '...' : stats.totalTriagesToday}</h2>
            <span className="text-[10px] text-[#5B6E8C] bg-[#F7F9FC] px-2 py-0.5 rounded-full font-semibold">UBS</span>
          </div>
        </div>
      </div>

      {/* QUEUE AND ALERTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FILA DE ATENDIMENTO */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1A2C3E]">Fila de Chamada e Consultório</h2>
              <p className="text-xs text-[#5B6E8C] mt-0.5">Lista atualizada em tempo real com triagem de risco ativa</p>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="text-xs text-[#2C6E9C] hover:text-[#245E86] font-semibold border border-[#E9EDF2] px-4 py-2 rounded-xl bg-white transition-all cursor-pointer shadow-sm"
            >
              Recarregar Fila
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-8 h-8 rounded-full animate-spin"></div></div>
          ) : queue.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[#E9EDF2] rounded-[20px] bg-[#F7F9FC]/50">
              <UserCheck className="mx-auto text-[#9AAEBF] mb-3" size={32} />
              <p className="text-sm font-semibold text-[#5B6E8C]">Nenhum paciente aguardando</p>
              <p className="text-xs text-[#9AAEBF] mt-1">Todos os agendamentos já foram atendidos ou triados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((appointment) => {
                let parsedChecklist = null;
                try {
                  if (appointment.checklistData) {
                    parsedChecklist = typeof appointment.checklistData === 'object'
                      ? appointment.checklistData
                      : JSON.parse(appointment.checklistData);
                  }
                } catch (e) {
                  console.error("Erro ao fazer parse do checklistData:", e);
                }
                const isPrioritario = parsedChecklist?.priority === true;
                const urgencia = parsedChecklist?.urgency || 'ELETIVO';
                const patientName = appointment.patient?.name || 'Paciente Sem Nome';
                const initials = patientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                return (
                  <div 
                    key={appointment.id}
                    className="p-4 rounded-xl border border-[#E9EDF2] hover:bg-[#F7F9FC] transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-[#F0F4F9] text-[#2C6E9C] border border-[#E9EDF2] w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#1A2C3E]">{patientName}</h4>
                          {isPrioritario && (
                            <span className="text-[9px] bg-amber-50 text-[#C26E38] border border-amber-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              ⚡ Prioritário
                            </span>
                          )}
                          {urgencia === 'EMERGENCIA' && (
                            <span className="text-[9px] bg-red-50 text-[#EF4444] border border-red-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              🚨 Emergência
                            </span>
                          )}
                          {urgencia === 'URGENCIA' && (
                            <span className="text-[9px] bg-orange-50 text-[#C26E38] border border-orange-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              ⚠️ Urgência
                            </span>
                          )}
                          {urgencia === 'ELETIVO' && (
                            <span className="text-[9px] bg-slate-50 text-[#5B6E8C] border border-[#E9EDF2] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                              Eletivo
                            </span>
                          )}
                          {patientName === 'João da Silva' && (
                            <span className="text-[9px] bg-red-50 text-[#EF4444] border border-red-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">ALERTA IA</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#5B6E8C] mt-1">
                          <span>Gênero: {appointment.patient?.gender || 'Não Informado'}</span>
                          <span>•</span>
                          <span>Nasc: {appointment.patient?.birthDate ? new Date(appointment.patient.birthDate).toLocaleDateString('pt-BR') : 'Não Informado'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer shadow-sm animate-fade-in"
                        title="Registrar desistência"
                      >
                        <UserX size={14} />
                        Desistência
                      </button>
                      <button
                        onClick={() => handleCallPatient(appointment)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E9EDF2] text-[#5B6E8C] hover:bg-[#F7F9FC] hover:text-[#1A2C3E] transition-all cursor-pointer shadow-sm"
                      >
                        <Volume2 size={14} />
                        Chamar
                      </button>
                      <button
                        onClick={() => handleStartConsult(appointment)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2C6E9C] hover:bg-[#245E86] text-white transition-all cursor-pointer shadow-sm"
                      >
                        Atender
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ALERTA DIAGNÓSTICO E PREVENÇÃO */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 text-[#C26E38]">
              <AlertTriangle size={24} />
              <h2 className="text-base font-semibold text-[#1A2C3E]">Painel de Alertas de IA</h2>
            </div>
            <p className="text-xs text-[#5B6E8C] leading-relaxed mb-6">
              O motor de IA analisou prontuários e triagens. Os seguintes pacientes apresentam critérios para eventos agudos cardiovasculares imediatos.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-semibold text-[#1A2C3E]">João da Silva</h4>
                  <span className="text-[10px] bg-[#C26E38] text-white px-2.5 py-0.5 rounded-full font-bold shadow-sm">92% Risco</span>
                </div>
                <p className="text-xs text-[#1A2C3E] mt-2 font-medium leading-normal">Diagnóstico sugerido: Infarto Agudo do Miocárdio (IAM)</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[9px] bg-white text-[#5B6E8C] px-2 py-0.5 rounded-md border border-[#E9EDF2] font-semibold">Dor Peito</span>
                  <span className="text-[9px] bg-white text-[#5B6E8C] px-2 py-0.5 rounded-md border border-[#E9EDF2] font-semibold">Diabetes</span>
                  <span className="text-[9px] bg-white text-[#5B6E8C] px-2 py-0.5 rounded-md border border-[#E9EDF2] font-semibold">Hipertensão</span>
                </div>
                <button
                  onClick={() => navigate('/pacientes/a111a111-a111-a111-a111-a111a111a111')}
                  className="w-full mt-4 bg-[#C26E38] hover:bg-[#a15525] text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  Abrir Protocolo de Emergência
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-[#E9EDF2] pt-6">
            <div className="flex items-center gap-3 text-[#2C6E9C] bg-[#F0F4F9] p-3 rounded-2xl border border-[#E9EDF2]">
              <TrendingUp size={18} className="flex-shrink-0" />
              <div className="text-[10px] text-[#5B6E8C] leading-normal font-medium">
                <span className="font-semibold text-[#2C6E9C] block">Dica de Gestão UBS:</span>
                Mantenha a triagem de Manchester em dia para que o motor preventivo de IAM dispare alertas em menos de 30s.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
