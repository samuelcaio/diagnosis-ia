import React, { useState, useEffect } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js'
import { BarChart3, TrendingUp, Clock, Users, BedDouble, AlertTriangle, Printer } from 'lucide-react'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement
);

interface DashboardStats {
  totalPatients: number;
  pendingAppointments: number;
  highRiskAlertsCount: number;
  totalTriagesToday: number;
  avgWaitingTimeMinutes: Record<string, number>;
  doctorProductivity: Record<string, number>;
}

export default function Reports() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/reports/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // ALERT TO FORCE CACHE CHECK
    console.log("Relatórios carregados com sucesso. Versão Nova V3");
  }, []);

  if (loading || !stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="border-4 border-primary border-t-transparent w-12 h-12 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Carregando relatórios gerenciais da UBS...</p>
      </div>
    );
  }

  // 1. Gráfico de Tempo de Espera (Manchester)
  const waitingTimeData = {
    labels: ['Vermelho (Emergência)', 'Laranja (Muito Urgente)', 'Amarelo (Urgente)', 'Verde (Pouco Urgente)', 'Azul (Não Urgente)'],
    datasets: [
      {
        label: 'Tempo Médio de Espera (minutos)',
        data: [
          stats.avgWaitingTimeMinutes['VERMELHO'] || 4,
          stats.avgWaitingTimeMinutes['LARANJA'] || 12,
          stats.avgWaitingTimeMinutes['AMARELO'] || 24,
          stats.avgWaitingTimeMinutes['VERDE'] || 52,
          stats.avgWaitingTimeMinutes['AZUL'] || 85
        ],
        backgroundColor: [
          '#EF4444', // Vermelho
          '#F59E0B', // Laranja
          '#EAB308', // Amarelo
          '#10B981', // Verde
          '#3B82F6'  // Azul
        ],
        borderRadius: 8,
        borderWidth: 0
      }
    ]
  };

  // 2. Gráfico de Produtividade dos Médicos
  const docLabels = Object.keys(stats.doctorProductivity);
  const docValues = Object.values(stats.doctorProductivity);
  
  const productivityData = {
    labels: docLabels,
    datasets: [
      {
        label: 'Consultas Realizadas',
        data: docValues,
        backgroundColor: [
          'rgba(6, 182, 212, 0.7)',
          'rgba(99, 102, 241, 0.7)',
          'rgba(16, 185, 129, 0.7)'
        ],
        borderColor: [
          '#06B6D4',
          '#6366F1',
          '#10B981'
        ],
        borderWidth: 1,
        borderRadius: 8
      }
    ]
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 print:m-0 print:p-0 relative">
      <style>
        {`
          @media print {
            body { background: white !important; }
            aside { display: none !important; }
            header { display: none !important; }
            main { padding: 0 !important; overflow: visible !important; }
            .glass-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; break-inside: avoid; }
            canvas { max-width: 100% !important; height: auto !important; }
          }
        `}
      </style>



      {/* CABEÇALHO */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-3xl font-display font-bold text-slate-100 flex items-center gap-3">
            <BarChart3 className="text-primary animate-pulse-cyan print:text-black" size={32} />
            <span className="print:text-black">Relatórios Gerenciais e Produtividade</span>
          </h1>
          
          <button 
            onClick={handlePrint}
            style={{ zIndex: 50, position: 'relative' }}
            className="print:hidden flex items-center justify-center gap-2 bg-primary hover:bg-[#245A82] text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-cyan-950/20 transition-all"
          >
            <Printer size={20} />
            Imprimir Relatório PDF
          </button>
        </div>
        <p className="text-sm text-slate-400 mt-1 print:text-gray-700">Estatísticas detalhadas de tempos de fila, atendimentos e internações na UBS.</p>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl flex items-center gap-4 print:border print:border-gray-300 print:shadow-none print:bg-white">
          <div className="bg-primary/10 text-primary p-3 rounded-2xl print:bg-gray-100"><Clock size={24} className="print:text-black" /></div>
          <div>
            <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider print:text-gray-500">Média Espera Crítica</p>
            <h3 className="text-xl font-display font-bold text-slate-100 print:text-black">8 minutos</h3>
            <span className="text-[9px] text-success print:text-green-700">Dentro da meta SISREG</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl flex items-center gap-4 print:border print:border-gray-300 print:shadow-none print:bg-white">
          <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-2xl print:bg-gray-100"><Users size={24} className="print:text-black" /></div>
          <div>
            <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider print:text-gray-500">Produtividade Médica</p>
            <h3 className="text-xl font-display font-bold text-slate-100 print:text-black">41 Consultas</h3>
            <span className="text-[9px] text-slate-400 print:text-gray-600">Total acumulado hoje</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl flex items-center gap-4 print:border print:border-gray-300 print:shadow-none print:bg-white">
          <div className="bg-success/10 text-success p-3 rounded-2xl print:bg-gray-100"><BedDouble size={24} className="print:text-black" /></div>
          <div>
            <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider print:text-gray-500">Taxa Ocupação Leitos</p>
            <h3 className="text-xl font-display font-bold text-slate-100 print:text-black">40%</h3>
            <span className="text-[9px] text-slate-450 print:text-gray-600">2 de 5 leitos ocupados</span>
          </div>
        </div>
      </div>

      {/* GRÁFICOS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GRÁFICO 1: TEMPO DE ESPERA */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800/80 space-y-6 print:border-gray-300 print:shadow-none print:bg-white">
          <div>
            <h3 className="text-base font-display font-bold text-slate-200 print:text-black">Distribuição de Tempo de Fila (Manchester)</h3>
            <p className="text-xs text-slate-450 mt-1 print:text-gray-600">Tempo médio em minutos calculado da triagem até a entrada no consultório.</p>
          </div>
          
          <div className="max-h-[300px] flex justify-center">
            <Bar 
              data={waitingTimeData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { 
                    grid: { color: '#1E293B' }, 
                    ticks: { color: '#64748B' },
                    title: { display: true, text: 'Minutos', color: '#64748B', font: { size: 10 } }
                  },
                  x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } } }
                }
              }}
            />
          </div>
        </div>

        {/* GRÁFICO 2: PRODUTIVIDADE */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800/80 space-y-6 print:border-gray-300 print:shadow-none print:bg-white">
          <div>
            <h3 className="text-base font-display font-bold text-slate-200 print:text-black">Consultas Realizadas por Médico (Hoje)</h3>
            <p className="text-xs text-slate-450 mt-1 print:text-gray-600">Monitoramento de eficiência clínica e distribuição de carga na UBS.</p>
          </div>
          
          <div className="max-h-[300px] flex justify-center">
            <Bar 
              data={productivityData}
              options={{
                indexAxis: 'y' as const, // Gráfico de barra horizontal
                responsive: true,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  x: { 
                    grid: { color: '#1E293B' }, 
                    ticks: { color: '#64748B' },
                    title: { display: true, text: 'Consultas', color: '#64748B', font: { size: 10 } }
                  },
                  y: { grid: { display: false }, ticks: { color: '#64748B' } }
                }
              }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
