import React, { useState, useEffect } from 'react'
import { HeartPulse, Activity, Thermometer, Droplet, Smile, Save, CheckCircle } from 'lucide-react'

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
}

export default function TriageQueue() {
  const [queue, setQueue] = useState<QueuedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<QueuedAppointment | null>(null);

  // Form Fields
  const [heartRate, setHeartRate] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');
  const [painScale, setPainScale] = useState(0);
  const [riskClassification, setRiskClassification] = useState('GREEN'); // Manchester default
  
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/triage/queue', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filtra os que não têm checklist/triagem completa ou mantém todos na fila de espera
        setQueue(data);
      }
    } catch (err) {
      console.error("Erro ao carregar fila:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleSelectPatient = (app: QueuedAppointment) => {
    setSelectedApp(app);
    // Reseta form
    setHeartRate('');
    setBloodPressure('');
    setTemperature('');
    setRespiratoryRate('');
    setOxygenSaturation('');
    setPainScale(0);
    setRiskClassification('GREEN');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        appointmentId: selectedApp.id,
        patientId: selectedApp.patient.id,
        heartRate: heartRate ? parseInt(heartRate) : null,
        bloodPressure: bloodPressure || null,
        temperature: temperature ? parseFloat(temperature) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : null,
        oxygenSaturation: oxygenSaturation ? parseInt(oxygenSaturation) : null,
        painScale: painScale,
        riskClassification: riskClassification
      };

      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao registrar triagem.');
      }

      setSuccessMsg('Triagem e sinais vitais salvos com sucesso!');
      setSelectedApp(null);
      fetchQueue();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha de comunicação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-[#1A2C3E] flex items-center gap-3">
          <HeartPulse className="text-[#2C6E9C]" size={32} />
          Painel de Triagem Manchester
        </h1>
        <p className="text-sm text-[#5B6E8C] mt-1">Classifique a gravidade dos pacientes de acordo com os sintomas e sinais vitais coletados.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: FILA DE TRIAGEM */}
        <div className="glass-card rounded-3xl p-6 border border-[#E9EDF2] lg:col-span-1 h-fit">
          <h2 className="text-lg font-display font-bold text-[#1A2C3E] mb-4">Aguardando Triagem</h2>
          {loading ? (
            <div className="py-12 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-8 h-8 rounded-full animate-spin"></div></div>
          ) : queue.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-[#E9EDF2] rounded-2xl bg-[#F7F9FC]">
              <CheckCircle className="mx-auto text-[#2C7A4D] mb-2" size={24} />
              <p className="text-xs font-semibold text-[#5B6E8C]">Tudo limpo!</p>
              <p className="text-[10px] text-[#9AAEBF] mt-1">Nenhum paciente aguardando.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleSelectPatient(app)}
                  className={`w-full p-4 text-left rounded-2xl border transition-all cursor-pointer ${
                    selectedApp?.id === app.id
                      ? 'bg-[#EBF4FB] border-[#2C6E9C] shadow-md'
                      : 'bg-white border-[#E9EDF2] hover:border-[#2C6E9C] hover:bg-[#F0F7FC]'
                  }`}
                >
                  <h4 className="text-sm font-bold text-[#1A2C3E]">{app.patient.name}</h4>
                  <div className="flex justify-between items-center text-[10px] text-[#5B6E8C] mt-2">
                    <span>Gênero: {app.patient.gender}</span>
                    <span>Nasc: {new Date(app.patient.birthDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COLUNA 2: FORMULÁRIO DE TRIAGEM */}
        <div className="glass-card rounded-3xl p-6 border border-[#E9EDF2] lg:col-span-2">
          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2">
              <CheckCircle size={18} />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {selectedApp ? (
            <form onSubmit={handleSubmitTriage} className="space-y-6">
              <div className="border-b border-[#E9EDF2] pb-4">
                <h3 className="text-base font-bold text-[#1A2C3E]">Paciente selecionado: {selectedApp.patient.name}</h3>
                <p className="text-xs text-[#5B6E8C] mt-1">Gênero: {selectedApp.patient.gender} • Nasc: {new Date(selectedApp.patient.birthDate).toLocaleDateString('pt-BR')}</p>
              </div>

              {/* SINAIS VITAIS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Frequência Cardíaca (BPM)</label>
                  <div className="relative">
                    <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AAEBF]" size={16} />
                    <input
                      type="number"
                      placeholder="Ex: 80"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      className="w-full border border-[#E9EDF2] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#1A2C3E] focus:outline-none focus:border-[#2C6E9C] focus:ring-1 focus:ring-[#2C6E9C] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Pressão Arterial (PA)</label>
                  <div className="relative">
                    <Droplet className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AAEBF]" size={16} />
                    <input
                      type="text"
                      placeholder="Ex: 120/80"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      className="w-full border border-[#E9EDF2] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#1A2C3E] focus:outline-none focus:border-[#2C6E9C] focus:ring-1 focus:ring-[#2C6E9C] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Temperatura (°C)</label>
                  <div className="relative">
                    <Thermometer className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AAEBF]" size={16} />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 36.5"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full border border-[#E9EDF2] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#1A2C3E] focus:outline-none focus:border-[#2C6E9C] focus:ring-1 focus:ring-[#2C6E9C] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Frequência Respiratória (IPM)</label>
                  <div className="relative">
                    <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AAEBF]" size={16} />
                    <input
                      type="number"
                      placeholder="Ex: 16"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      className="w-full border border-[#E9EDF2] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#1A2C3E] focus:outline-none focus:border-[#2C6E9C] focus:ring-1 focus:ring-[#2C6E9C] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Saturação de O2 (%)</label>
                  <div className="relative">
                    <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AAEBF]" size={16} />
                    <input
                      type="number"
                      placeholder="Ex: 98"
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(e.target.value)}
                      className="w-full border border-[#E9EDF2] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#1A2C3E] focus:outline-none focus:border-[#2C6E9C] focus:ring-1 focus:ring-[#2C6E9C] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2 flex justify-between">
                    <span>Escala de Dor (0 a 10)</span>
                    <span className="text-[#2C6E9C] font-bold">{painScale}</span>
                  </label>
                  <div className="flex items-center gap-3 py-2">
                    <Smile className="text-[#9AAEBF]" size={18} />
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={painScale}
                      onChange={(e) => setPainScale(parseInt(e.target.value))}
                      className="flex-1 accent-[#2C6E9C]"
                    />
                  </div>
                </div>
              </div>

              {/* CLASSIFICAÇÃO MANCHESTER */}
              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-3">Classificação de Risco Manchester (Gravidade)</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { color: 'RED', label: 'Emergência (Vermelho)', bg: 'bg-[#EF4444]' },
                    { color: 'ORANGE', label: 'Muito Urgente (Laranja)', bg: 'bg-[#F59E0B]' },
                    { color: 'YELLOW', label: 'Urgente (Amarelo)', bg: 'bg-[#EAB308] text-slate-950' },
                    { color: 'GREEN', label: 'Pouco Urgente (Verde)', bg: 'bg-[#10B981]' },
                    { color: 'BLUE', label: 'Não Urgente (Azul)', bg: 'bg-[#3B82F6]' }
                  ].map((option) => (
                    <button
                      key={option.color}
                      type="button"
                      onClick={() => setRiskClassification(option.color)}
                      className={`p-3.5 rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 text-white cursor-pointer ${option.bg} ${
                        riskClassification === option.color
                          ? 'ring-4 ring-black/20 scale-[1.03] shadow-lg opacity-100'
                          : 'opacity-40 hover:opacity-75'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-white/30 border border-white/40"></span>
                      {option.color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E9EDF2] flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#2C6E9C] hover:bg-[#245E86] text-white font-semibold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Save size={16} />
                      Salvar Classificação
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="py-24 text-center border border-dashed border-[#E9EDF2] rounded-3xl bg-[#F7F9FC]">
              <HeartPulse className="mx-auto text-[#9AAEBF] mb-3" size={40} />
              <p className="text-sm font-semibold text-[#5B6E8C]">Nenhum paciente selecionado</p>
              <p className="text-xs text-[#9AAEBF] mt-1">Selecione um paciente na lista lateral para abrir o formulário de triagem de sinais vitais.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
