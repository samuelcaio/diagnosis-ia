import React, { useState, useEffect } from 'react';
import { Activity, Map, Users, AlertTriangle, Download, Filter, MapPin, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Alert {
  id: string;
  type: string;
  disease: string;
  neighborhood: string;
  caseCount: number;
  daysPeriod: number;
  message: string;
  createdAt: string;
}

interface Stats {
  totalPatients: number;
  byNeighborhood: Record<string, number>;
  byStreet: Record<string, number>;
  byMicroarea: Record<string, number>;
}

export default function Surveillance() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts' | 'map'>('dashboard');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        fetch('/api/surveillance/dashboard', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}),
        fetch('/api/surveillance/alerts', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }})
      ]);
      
      if (statsRes.status === 401 || statsRes.status === 403 || alertsRes.status === 401 || alertsRes.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Vigilância Territorial", 14, 15);
    doc.setFontSize(10);
    doc.text(`Data da exportação: ${new Date().toLocaleDateString()}`, 14, 22);
    
    // População por bairro
    const neighborhoodData = Object.entries(stats.byNeighborhood || {}).map(([bairro, count]) => [bairro, count.toString()]);
    autoTable(doc, {
      startY: 28,
      head: [['Bairro', 'População Adscrita']],
      body: neighborhoodData,
      theme: 'grid',
      headStyles: { fillColor: [44, 110, 156] }
    });

    // Alertas
    if (alerts.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 28;
      doc.setFontSize(14);
      doc.text("Alertas Epidemiológicos", 14, finalY + 15);
      const alertsData = alerts.map(a => [a.disease, a.neighborhood, a.caseCount.toString(), a.daysPeriod + ' dias']);
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Doença / Agravo', 'Localidade', 'Casos', 'Período']],
        body: alertsData,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72] }
      });
    }

    doc.save("relatorio_vigilancia.pdf");
  };

  const handleExportExcel = () => {
    if (!stats) return;
    const wb = XLSX.utils.book_new();
    
    // Planilha 1: Bairros
    const wsBairros = XLSX.utils.json_to_sheet(
      Object.entries(stats.byNeighborhood || {}).map(([Bairro, Pacientes]) => ({ Bairro, Pacientes }))
    );
    XLSX.utils.book_append_sheet(wb, wsBairros, "Bairros");

    // Planilha 2: Alertas
    if (alerts.length > 0) {
      const wsAlertas = XLSX.utils.json_to_sheet(
        alerts.map(a => ({ Doença: a.disease, Localidade: a.neighborhood, Casos: a.caseCount, Período: `${a.daysPeriod} dias`, Data: new Date(a.createdAt).toLocaleDateString() }))
      );
      XLSX.utils.book_append_sheet(wb, wsAlertas, "Alertas");
    }

    XLSX.writeFile(wb, "relatorio_vigilancia.xlsx");
  };

  if (loading || !stats) {
    return <div className="p-10 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-10 h-10 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1A2C3E]">Vigilância Territorial</h1>
          <p className="text-sm text-[#5B6E8C] mt-1 font-sans">Monitoramento de agravos, inteligência geográfica e controle epidemiológico populacional.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-200 transition-all flex items-center gap-2">
            <Download size={14} /> EXCEL
          </button>
          <button onClick={handleExportPDF} className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-xl text-xs font-bold border border-rose-200 transition-all flex items-center gap-2">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E9EDF2] shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5B6E8C] uppercase">População Total Adscrita</p>
            <h3 className="text-2xl font-black text-[#1A2C3E]">{stats.totalPatients}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E9EDF2] shadow-sm flex items-center gap-4">
          <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
            <Map size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5B6E8C] uppercase">Bairros Mapeados</p>
            <h3 className="text-2xl font-black text-[#1A2C3E]">{Object.keys(stats.byNeighborhood || {}).length}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E9EDF2] shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5B6E8C] uppercase">Microáreas Ativas</p>
            <h3 className="text-2xl font-black text-[#1A2C3E]">{Object.keys(stats.byMicroarea || {}).length}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E9EDF2] shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-xl text-rose-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5B6E8C] uppercase">Surtos Ativos (7d)</p>
            <h3 className="text-2xl font-black text-rose-600">{alerts.length}</h3>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-[#E9EDF2] gap-6">
        <button onClick={() => setActiveTab('dashboard')} className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${activeTab === 'dashboard' ? 'text-[#2C6E9C] border-b-2 border-[#2C6E9C]' : 'text-[#5B6E8C] hover:text-[#1A2C3E]'}`}>Indicadores Populacionais</button>
        <button onClick={() => setActiveTab('map')} className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${activeTab === 'map' ? 'text-[#2C6E9C] border-b-2 border-[#2C6E9C]' : 'text-[#5B6E8C] hover:text-[#1A2C3E]'}`}>Mapa de Calor e Microáreas</button>
        <button onClick={() => setActiveTab('alerts')} className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${activeTab === 'alerts' ? 'text-[#2C6E9C] border-b-2 border-[#2C6E9C]' : 'text-[#5B6E8C] hover:text-[#1A2C3E]'}`}>Alertas Epidemiológicos {alerts.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{alerts.length}</span>}</button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-[#E9EDF2]">
            <h3 className="text-sm font-bold text-[#1A2C3E] mb-4 flex items-center gap-2"><MapPin size={16} className="text-[#2C6E9C]"/> População por Bairro</h3>
            <div className="space-y-3">
              {Object.entries(stats.byNeighborhood || {}).sort((a,b) => b[1] - a[1]).map(([neighborhood, count]) => (
                <div key={neighborhood} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-xl border border-[#E9EDF2]">
                  <span className="text-xs font-semibold text-[#1A2C3E]">{neighborhood}</span>
                  <span className="text-xs font-bold text-[#2C6E9C] bg-white border border-[#BDD9F2] px-3 py-1 rounded-lg shadow-sm">{count} pacientes</span>
                </div>
              ))}
              {Object.keys(stats.byNeighborhood || {}).length === 0 && <p className="text-xs text-[#5B6E8C]">Nenhum bairro registrado.</p>}
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl border border-[#E9EDF2]">
            <h3 className="text-sm font-bold text-[#1A2C3E] mb-4 flex items-center gap-2"><MapPin size={16} className="text-[#2C6E9C]"/> População por Microárea</h3>
            <div className="space-y-3">
              {Object.entries(stats.byMicroarea || {}).sort((a,b) => b[1] - a[1]).map(([microarea, count]) => (
                <div key={microarea} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-xl border border-[#E9EDF2]">
                  <span className="text-xs font-semibold text-[#1A2C3E]">{microarea}</span>
                  <span className="text-xs font-bold text-[#2C6E9C] bg-white border border-[#BDD9F2] px-3 py-1 rounded-lg shadow-sm">{count} pacientes</span>
                </div>
              ))}
              {Object.keys(stats.byMicroarea || {}).length === 0 && <p className="text-xs text-[#5B6E8C]">Nenhuma microárea registrada.</p>}
            </div>
          </div>
        </div>
      )}

      {/* MAP TAB (Heatmap Simplificado via CSS) */}
      {activeTab === 'map' && (
        <div className="glass-card p-8 rounded-3xl border border-[#E9EDF2] text-center">
          <Map className="mx-auto text-[#2C6E9C] mb-4" size={48} />
          <h2 className="text-lg font-bold text-[#1A2C3E]">Visualização Geográfica e Heatmap</h2>
          <p className="text-sm text-[#5B6E8C] mt-2 max-w-lg mx-auto">
            Esta visualização cria mapas de blocos (Treemap) baseados nos registros territoriais. Você pode identificar clusters populacionais analisando as áreas com coloração mais escura.
          </p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(stats.byNeighborhood || {}).map(([b, count], i) => {
              const intensity = Math.min(100, Math.max(10, (count / stats.totalPatients) * 100 * 3));
              return (
                <div key={i} className="rounded-xl p-4 flex flex-col items-center justify-center text-white min-h-[100px] shadow-sm transition-all hover:scale-105 cursor-pointer" style={{ backgroundColor: `rgba(44, 110, 156, ${intensity / 100})`}}>
                  <span className="text-[10px] uppercase font-bold text-white/90 truncate w-full text-center">{b}</span>
                  <span className="text-2xl font-black">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <AlertTriangle className="text-rose-600" />
            <p className="text-xs font-semibold text-rose-800">
              O motor de vigilância epidemiológica analisa diariamente todos os atendimentos. Se houver mais de 10 casos suspeitos da mesma doença em uma mesma localidade num período de 7 dias, um alerta de possível surto aparecerá aqui.
            </p>
          </div>
          
          {alerts.length === 0 ? (
            <div className="glass-card p-10 rounded-3xl border border-[#E9EDF2] text-center">
              <CheckCircle className="mx-auto text-emerald-500 mb-3" size={32} />
              <p className="text-sm font-bold text-[#1A2C3E]">Nenhum Surto Identificado</p>
              <p className="text-xs text-[#5B6E8C]">A situação epidemiológica atual encontra-se dentro da normalidade.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-rose-100 text-rose-700 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md">
                      🚨 Alerta de Surto ({alert.daysPeriod} dias)
                    </span>
                    <span className="text-[10px] text-[#5B6E8C] font-mono">{new Date(alert.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1A2C3E] mb-1">{alert.disease}</h4>
                  <p className="text-[11px] text-[#5B6E8C] mb-4">Localidade Afetada: <strong className="text-[#1A2C3E]">{alert.neighborhood}</strong></p>
                  
                  <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="bg-white text-rose-600 font-black text-xl w-10 h-10 rounded-lg flex items-center justify-center border border-rose-200 shadow-sm">
                      {alert.caseCount}
                    </div>
                    <p className="text-xs text-rose-800 font-semibold leading-tight">
                      Casos identificados na mesma região num curto período de tempo.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
