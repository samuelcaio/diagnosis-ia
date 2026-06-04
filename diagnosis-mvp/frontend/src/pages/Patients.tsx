import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, FileText, CheckCircle, ChevronRight, UserCircle, Clock, X, UserX, XCircle } from 'lucide-react'

interface Patient {
  id: string;
  name: string;
  cpfHash: string;
  birthDate: string;
  gender: string;
  address?: string;
  phone?: string;
}

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Register Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('MASCULINO');
  const [address, setAddress] = useState('');
  const [cep, setCep] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  
  const [coverageArea, setCoverageArea] = useState('');
  const [microarea, setMicroarea] = useState('');
  const [acsName, setAcsName] = useState('');
  const [esfTeam, setEsfTeam] = useState('');
  const [phone, setPhone] = useState('');
  const [signConsent, setSignConsent] = useState(true); // Termo LGPD padrão
  
  // Queue Modal State
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedPatientForQueue, setSelectedPatientForQueue] = useState<Patient | null>(null);
  const [queuePriority, setQueuePriority] = useState(false);
  const [queueUrgency, setQueueUrgency] = useState('ELETIVO');
  const [placingInQueue, setPlacingInQueue] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Queue and History States
  const [activeTab, setActiveTab] = useState<'search' | 'queue' | 'history'>('search');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const fetchAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm("Confirmar desistência deste paciente da fila?")) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setSuccessMsg("Desistência registrada com sucesso!");
        fetchAppointments();
      } else {
        setErrorMsg("Erro ao registrar desistência.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de comunicação ao registrar desistência.");
    }
  };

  const fetchPatients = async (query = '') => {
    setLoading(true);
    try {
      const url = query ? `/api/patients?query=${encodeURIComponent(query)}` : '/api/patients';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Erro ao buscar pacientes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fechar modal com tecla Escape
  const handleCloseQueueModal = useCallback(() => {
    setShowQueueModal(false);
    setSelectedPatientForQueue(null);
    setQueuePriority(false);
    setQueueUrgency('ELETIVO');
    setErrorMsg('');
  }, []);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showQueueModal) handleCloseQueueModal();
        if (showAddForm) { setShowAddForm(false); setErrorMsg(''); setSuccessMsg(''); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showQueueModal, showAddForm, handleCloseQueueModal]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signConsent) {
      setErrorMsg('O paciente precisa aceitar o Termo de Consentimento de Dados de Saúde para prosseguir.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = { 
        name, cpf, birthDate, gender, address, phone,
        cep, state, city, neighborhood, street, addressNumber,
        complement, referencePoint, coverageArea, microarea,
        acsName, esfTeam
      };
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao cadastrar paciente.');
      }

      // Registra também termo de consentimento LGPD para o paciente
      await fetch('/api/consents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ patientId: data.id, termVersion: 'v1.2-2026' })
      });

      setSuccessMsg('Paciente cadastrado e Termo de Consentimento LGPD assinado digitalmente!');
      // Reseta form
      setName('');
      setCpf('');
      setBirthDate('');
      setAddress('');
      setCep('');
      setState('');
      setCity('');
      setNeighborhood('');
      setStreet('');
      setAddressNumber('');
      setComplement('');
      setReferencePoint('');
      setCoverageArea('');
      setMicroarea('');
      setAcsName('');
      setEsfTeam('');
      setPhone('');
      setShowAddForm(false);
      fetchPatients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha de comunicação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlacePatientInQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForQueue) return;

    setPlacingInQueue(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        patientId: selectedPatientForQueue.id,
        priority: queuePriority,
        urgency: queueUrgency
      };

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao colocar paciente na fila.');
      }

      setSuccessMsg(`Paciente ${selectedPatientForQueue.name} encaminhado(a) para a fila de atendimento com sucesso!`);
      setShowQueueModal(false);
      setSelectedPatientForQueue(null);
      setQueuePriority(false);
      setQueueUrgency('ELETIVO');
      fetchPatients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao colocar na fila.');
    } finally {
      setPlacingInQueue(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1A2C3E]">Gestão de Pacientes</h1>
          <p className="text-sm text-[#5B6E8C] mt-1 font-sans">Cadastre e gerencie a base demográfica e histórico clínico da unidade.</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setSuccessMsg(''); setErrorMsg(''); }}
          className="bg-[#2C6E9C] hover:bg-[#245E86] text-white font-semibold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer"
        >
          {showAddForm ? 'Visualizar Pacientes' : (
            <>
              <UserPlus size={18} />
              Novo Paciente
            </>
          )}
        </button>
      </div>

      {/* FORMULÁRIO DE CADASTRO DE PACIENTE */}
      {showAddForm ? (
        <div className="glass-card rounded-3xl p-6 border border-[#E9EDF2] max-w-3xl">
          <h2 className="text-lg font-display font-bold text-[#1A2C3E] mb-6 flex items-center gap-2">
            <UserPlus size={20} className="text-[#2C6E9C]" />
            Cadastrar Novo Paciente (UBS)
          </h2>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegisterPatient} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">CPF (Original - Não Hashed)</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Data de Nascimento</label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Gênero</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full py-2.5 px-4 text-xs rounded-xl cursor-pointer"
                >
                  <option value="MASCULINO">MASCULINO</option>
                  <option value="FEMININO">FEMININO</option>
                  <option value="OUTRO">OUTRO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <h4 className="text-sm font-bold text-[#2C6E9C] border-b border-[#E9EDF2] pb-2 mt-4 mb-4">Dados de Territorialização (Vigilância)</h4>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">CEP</label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Estado</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Ex: SP"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Município</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Município"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Bairro</label>
                <input
                  type="text"
                  required
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Rua</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Nome da Rua"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Número</label>
                <input
                  type="text"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  placeholder="Número"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Complemento</label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto, Bloco..."
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Ponto de Referência</label>
                <input
                  type="text"
                  value={referencePoint}
                  onChange={(e) => setReferencePoint(e.target.value)}
                  placeholder="Referência"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Área de Abrangência UBS</label>
                <input
                  type="text"
                  value={coverageArea}
                  onChange={(e) => setCoverageArea(e.target.value)}
                  placeholder="Área de Abrangência"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Microárea</label>
                <input
                  type="text"
                  required
                  value={microarea}
                  onChange={(e) => setMicroarea(e.target.value)}
                  placeholder="Ex: Microárea 03"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Agente Comunitário (ACS)</label>
                <input
                  type="text"
                  value={acsName}
                  onChange={(e) => setAcsName(e.target.value)}
                  placeholder="Nome do ACS"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider mb-2">Equipe ESF</label>
                <input
                  type="text"
                  value={esfTeam}
                  onChange={(e) => setEsfTeam(e.target.value)}
                  placeholder="Nome da Equipe ESF"
                  className="w-full py-2.5 px-4 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* CONSENTIMENTO LGPD */}
            <div className="bg-[#F0F7FF] border border-[#BDD9F2] p-5 rounded-2xl space-y-3 mt-6">
              <h4 className="text-xs font-bold text-[#2C6E9C] flex items-center gap-2 uppercase tracking-wider">
                <FileText size={16} />
                Termo de Consentimento LGPD (Versão v1.2-2026)
              </h4>
              <p className="text-[10px] text-[#5B6E8C] leading-relaxed">
                Em conformidade com a Lei Geral de Proteção de Dados (LGPD), o paciente autoriza a Unidade Básica de Saúde a realizar a coleta, armazenamento criptográfico de CPF e processamento de dados de sinais vitais e prontuário para fins de apoio diagnóstico auxiliado por Inteligência Artificial.
              </p>
              <label className="flex items-center gap-3 text-xs font-semibold text-[#1A2C3E] py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signConsent}
                  onChange={(e) => setSignConsent(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#2C6E9C] cursor-pointer"
                  style={{ border: '1px solid #E9EDF2', background: 'white' }}
                />
                Paciente aceita e assina digitalmente este Termo de Consentimento.
              </label>
            </div>

            <div className="pt-4 border-t border-[#E9EDF2] flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#2C6E9C] hover:bg-[#245E86] text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Concluir e Cadastrar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TABS SELECTION */}
          <div className="flex border-b border-[#E9EDF2] gap-6 mb-6">
            <button
              onClick={() => setActiveTab('search')}
              className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === 'search' 
                  ? 'text-[#2C6E9C] border-b-2 border-[#2C6E9C]' 
                  : 'text-[#5B6E8C] hover:text-[#1A2C3E]'
              }`}
            >
              Buscar Pacientes
            </button>
            <button
              onClick={() => { setActiveTab('queue'); fetchAppointments(); }}
              className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === 'queue' 
                  ? 'text-[#2C6E9C] border-b-2 border-[#2C6E9C]' 
                  : 'text-[#5B6E8C] hover:text-[#1A2C3E]'
              }`}
            >
              Fila de Espera
            </button>
            <button
              onClick={() => { setActiveTab('history'); fetchAppointments(); }}
              className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === 'history' 
                  ? 'text-[#2C6E9C] border-b-2 border-[#2C6E9C]' 
                  : 'text-[#5B6E8C] hover:text-[#1A2C3E]'
              }`}
            >
              Histórico de Atendimentos
            </button>
          </div>

          {/* SUCESS MESSAGE */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium flex items-center gap-2 animate-fade-in">
              <CheckCircle size={18} />
              {successMsg}
            </div>
          )}

          {/* ERROR MESSAGE */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium animate-fade-in">
              {errorMsg}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* BUSCA DE PACIENTE */}
              <form onSubmit={handleSearchSubmit} className="flex gap-4 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por nome do paciente ou CPF..."
                    className="w-full bg-[#FFFFFF] border border-[#E9EDF2] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-[#1A2C3E] placeholder-[#9AAEBF] focus:outline-none focus:border-[#2C6E9C] focus:ring-1 focus:ring-[#2C6E9C] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#FFFFFF] hover:bg-[#F7F9FC] border border-[#E9EDF2] text-[#5B6E8C] hover:text-[#1A2C3E] font-semibold px-6 rounded-2xl text-sm transition-all cursor-pointer shadow-sm"
                >
                  Pesquisar
                </button>
              </form>

              {/* LISTAGEM DE PACIENTES */}
              <div className="glass-card rounded-3xl border border-[#E9EDF2] overflow-hidden animate-fade-in">
                <div className="px-6 py-5 border-b border-[#E9EDF2] flex justify-between items-center bg-[#F7F9FC]/20">
                  <h2 className="text-base font-bold text-[#1A2C3E]">Pacientes Encontrados ({patients.length})</h2>
                </div>

                {loading ? (
                  <div className="py-20 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-10 h-10 rounded-full animate-spin"></div></div>
                ) : patients.length === 0 ? (
                  <div className="py-24 text-center border-t border-[#E9EDF2]">
                    <UserCircle className="mx-auto text-slate-400 mb-3 animate-pulse-cyan" size={48} />
                    <p className="text-sm font-semibold text-[#5B6E8C]">Nenhum paciente cadastrado</p>
                    <p className="text-xs text-[#9AAEBF] mt-1">Experimente buscar por outro nome ou realize um novo cadastro acima.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-[#F7F9FC]/40 text-[#5B6E8C] border-b border-[#E9EDF2] font-semibold uppercase tracking-wider">
                          <th className="px-6 py-4">Paciente</th>
                          <th className="px-6 py-4">Gênero</th>
                          <th className="px-6 py-4">Data Nasc.</th>
                          <th className="px-6 py-4">Hash CPF (Anônimo LGPD)</th>
                          <th className="px-6 py-4">Telefone</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9EDF2]">
                        {patients.map((patient) => (
                          <tr 
                            key={patient.id}
                            className="hover:bg-[#F7F9FC]/30 transition-colors cursor-pointer"
                            onClick={() => navigate(`/pacientes/${patient.id}`)}
                          >
                            <td className="px-6 py-4 font-bold text-[#1A2C3E] flex items-center gap-3">
                              <div className="bg-[#F0F4F9] text-[#2C6E9C] border border-[#E9EDF2] w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                                {patient.name.substring(0, 2).toUpperCase()}
                              </div>
                              {patient.name}
                            </td>
                            <td className="px-6 py-4 text-[#5B6E8C] font-semibold">{patient.gender}</td>
                            <td className="px-6 py-4 text-[#5B6E8C]">{new Date(patient.birthDate).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 font-mono text-[10px] text-[#2C6E9C] select-all">{patient.cpfHash.substring(0, 24)}...</td>
                            <td className="px-6 py-4 text-[#5B6E8C]">{patient.phone || 'Não informado'}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => { 
                                    setSelectedPatientForQueue(patient);
                                    setQueuePriority(false);
                                    setQueueUrgency('ELETIVO');
                                    setShowQueueModal(true);
                                  }}
                                  className="bg-[#F0F4F9] border border-[#E9EDF2] text-[#2C6E9C] hover:bg-[#2C6E9C] hover:text-[#FFFFFF] px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                >
                                  <Clock size={12} />
                                  Colocar na Fila
                                </button>
                                <button
                                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                                  className="bg-[#FFFFFF] border border-[#E9EDF2] text-[#5B6E8C] hover:bg-[#F7F9FC] hover:text-[#1A2C3E] p-2 rounded-lg transition-all cursor-pointer shadow-sm"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="glass-card rounded-3xl border border-[#E9EDF2] overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-[#E9EDF2] flex justify-between items-center bg-[#F7F9FC]/20">
                <h2 className="text-base font-bold text-[#1A2C3E]">Pacientes na Fila Ativa</h2>
                <button 
                  onClick={fetchAppointments}
                  className="text-xs text-[#2C6E9C] hover:text-[#245E86] font-semibold border border-[#E9EDF2] px-3 py-1.5 rounded-xl bg-white transition-all cursor-pointer shadow-sm"
                >
                  Atualizar Fila
                </button>
              </div>

              {appointmentsLoading ? (
                <div className="py-20 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-10 h-10 rounded-full animate-spin"></div></div>
              ) : appointments.filter(a => a.status === 'WAITING' || a.status === 'IN_PROGRESS').length === 0 ? (
                <div className="py-24 text-center border-t border-[#E9EDF2]">
                  <CheckCircle className="mx-auto text-[#2C6E9C] mb-3 animate-pulse-cyan" size={48} />
                  <p className="text-sm font-semibold text-[#5B6E8C]">Nenhum paciente na fila de espera</p>
                  <p className="text-xs text-[#9AAEBF] mt-1">Todos os pacientes já foram atendidos ou a fila está vazia.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#F7F9FC]/40 text-[#5B6E8C] border-b border-[#E9EDF2] font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Paciente</th>
                        <th className="px-6 py-4">Gênero</th>
                        <th className="px-6 py-4">Data Nasc.</th>
                        <th className="px-6 py-4">Urgência / Prioridade</th>
                        <th className="px-6 py-4">Status da Fila</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9EDF2]">
                      {appointments
                        .filter(a => a.status === 'WAITING' || a.status === 'IN_PROGRESS')
                        .map((appointment) => {
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
                          const patientInitials = patientName.substring(0, 2).toUpperCase();
                          return (
                            <tr key={appointment.id} className="hover:bg-[#F7F9FC]/30 transition-colors">
                              <td className="px-6 py-4 font-bold text-[#1A2C3E] flex items-center gap-3">
                                <div className="bg-[#F0F4F9] text-[#2C6E9C] border border-[#E9EDF2] w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                                  {patientInitials}
                                </div>
                                {patientName}
                              </td>
                              <td className="px-6 py-4 text-[#5B6E8C] font-semibold">{appointment.patient?.gender || 'Não Informado'}</td>
                              <td className="px-6 py-4 text-[#5B6E8C]">
                                {appointment.patient?.birthDate ? new Date(appointment.patient.birthDate).toLocaleDateString('pt-BR') : 'Não Informado'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap items-center gap-2">
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
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-[10px]">
                                <span className="inline-block text-[9px] bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  {appointment.status === 'IN_PROGRESS' ? 'Em Atendimento' : 'Aguardando'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleCancelAppointment(appointment.id)}
                                  className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ml-auto"
                                >
                                  <UserX size={12} />
                                  Desistência
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="glass-card rounded-3xl border border-[#E9EDF2] overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-[#E9EDF2] flex justify-between items-center bg-[#F7F9FC]/20">
                <h2 className="text-base font-bold text-[#1A2C3E]">Histórico de Atendimentos</h2>
                <button 
                  onClick={fetchAppointments}
                  className="text-xs text-[#2C6E9C] hover:text-[#245E86] font-semibold border border-[#E9EDF2] px-3 py-1.5 rounded-xl bg-white transition-all cursor-pointer shadow-sm"
                >
                  Atualizar Histórico
                </button>
              </div>

              {appointmentsLoading ? (
                <div className="py-20 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-10 h-10 rounded-full animate-spin"></div></div>
              ) : appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED').length === 0 ? (
                <div className="py-24 text-center border-t border-[#E9EDF2]">
                  <FileText className="mx-auto text-slate-400 mb-3 animate-pulse-cyan" size={48} />
                  <p className="text-sm font-semibold text-[#5B6E8C]">Nenhum atendimento no histórico</p>
                  <p className="text-xs text-[#9AAEBF] mt-1">Os atendimentos concluídos ou cancelados aparecerão nesta lista.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#F7F9FC]/40 text-[#5B6E8C] border-b border-[#E9EDF2] font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Paciente</th>
                        <th className="px-6 py-4">Gênero</th>
                        <th className="px-6 py-4">Data/Hora Agendamento</th>
                        <th className="px-6 py-4">Urgência / Prioridade</th>
                        <th className="px-6 py-4">Status Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9EDF2]">
                      {appointments
                        .filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED')
                        .map((appointment) => {
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
                          const patientInitials = patientName.substring(0, 2).toUpperCase();
                          return (
                            <tr key={appointment.id} className="hover:bg-[#F7F9FC]/30 transition-colors">
                              <td className="px-6 py-4 font-bold text-[#1A2C3E] flex items-center gap-3">
                                <div className="bg-[#F0F4F9] text-[#2C6E9C] border border-[#E9EDF2] w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                                  {patientInitials}
                                </div>
                                {patientName}
                              </td>
                              <td className="px-6 py-4 text-[#5B6E8C] font-semibold">{appointment.patient?.gender || 'Não Informado'}</td>
                              <td className="px-6 py-4 text-[#5B6E8C]">{new Date(appointment.scheduledFor || appointment.createdAt).toLocaleString('pt-BR')}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap items-center gap-2">
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
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {appointment.status === 'COMPLETED' ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    <CheckCircle size={10} />
                                    Atendido
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    <XCircle size={10} />
                                    Desistência
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL ENCAMINHAR PARA FILA */}
      {showQueueModal && selectedPatientForQueue && (
        <div 
          onClick={handleCloseQueueModal}
          className="fixed inset-0 bg-[#1A2C3E]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Encaminhar paciente para fila"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="modal-dark bg-[#0F1A27] border border-[#1E3048] rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl"
            style={{ zIndex: 101 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="text-[#2C9FD9]" size={18} />
                  Encaminhar para a Fila de Triagem
                </h3>
                <p className="text-[10px] text-[#7A9BB5] mt-1">Coloque o paciente na fila para avaliação dos sinais vitais e do médico.</p>
              </div>
              <button 
                onClick={handleCloseQueueModal}
                className="text-[#7A9BB5] hover:text-white p-1.5 bg-[#1A2C3E] rounded-lg border border-[#1E3048] cursor-pointer transition-colors"
                aria-label="Fechar modal"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1520] border border-[#1E3048] text-xs">
              <span className="block text-[9px] text-[#5A7A97] font-bold uppercase tracking-wider">Paciente Selecionado</span>
              <span className="block font-bold text-white text-sm mt-0.5">{selectedPatientForQueue.name}</span>
              <span className="block text-[10px] text-[#7A9BB5] mt-1">
                Gênero: {selectedPatientForQueue.gender} &bull; Nascimento: {new Date(selectedPatientForQueue.birthDate).toLocaleDateString('pt-BR')}
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePlacePatientInQueue} className="space-y-4">
              {/* CLASSIFICAÇÃO DE URGÊNCIA */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#7A9BB5] uppercase tracking-wider block">Classificação de Urgência / Emergência</label>
                <select
                  value={queueUrgency}
                  onChange={(e) => setQueueUrgency(e.target.value)}
                  className="dark-select w-full px-4 py-3 text-xs cursor-pointer font-bold"
                >
                  <option value="ELETIVO">Consulta Eletiva (Normal / Sem Urgência)</option>
                  <option value="URGENCIA">Urgência (Necessita Triagem Rápida)</option>
                  <option value="EMERGENCIA">Emergência (Urgência Gravíssima / Risco de Vida!)</option>
                </select>
              </div>

              {/* ATENDIMENTO PRIORITÁRIO */}
              <div className="p-4 rounded-2xl border border-[#1E3048] bg-[#0D1520] flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-[#C8DCF0]">Atendimento Prioritário</span>
                  <span className="block text-[9px] text-[#5A7A97] mt-0.5">Idosos (60+), gestantes, deficientes ou lactantes.</span>
                </div>
                <input
                  type="checkbox"
                  checked={queuePriority}
                  onChange={(e) => setQueuePriority(e.target.checked)}
                  className="w-5 h-5 rounded border-[#1E3048] accent-[#2C9FD9] cursor-pointer"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseQueueModal}
                  className="flex-1 bg-[#1A2C3E] hover:bg-[#1E3348] border border-[#1E3048] text-[#A8C4DC] font-semibold py-3 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={placingInQueue}
                  className="flex-1 bg-[#2C6E9C] hover:bg-[#245E86] text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {placingInQueue ? (
                    <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Encaminhar para Fila
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
