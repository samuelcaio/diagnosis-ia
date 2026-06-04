import React, { useState, useEffect, useRef, useCallback } from 'react'
import { BedDouble, CheckCircle, AlertTriangle, UserCheck, Plus, Save, ChevronRight, Search, X, Wrench } from 'lucide-react'

interface Patient {
  id: string;
  name: string;
  birthDate?: string;
  gender?: string;
  cpfHash?: string;
}

interface Bed {
  id: string;
  bedNumber: string;
  ward: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  patient?: Patient;
}

export default function BedsGrid() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);

  // Admission modal
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // CPF / nome search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBedsData = async () => {
    try {
      const res = await fetch('/api/beds', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setBeds(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBedsData(); }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Busca com debounce
  const searchPatients = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/beds/search-patient?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setShowDropdown(data.length > 0);
      }
    } catch { /* silencioso */ }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  const handleOpenAdmit = (bed: Bed) => {
    setSelectedBed(bed);
    setSelectedPatient(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setMsgSuccess('');
    setMsgError('');
  };

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearchQuery(p.name);
    setShowDropdown(false);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed || !selectedPatient) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/beds/${selectedBed.id}/occupy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ patientId: selectedPatient.id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao internar.');
      }
      setMsgSuccess(`${selectedPatient.name} internado(a) com sucesso no leito ${selectedBed.bedNumber}!`);
      setSelectedBed(null);
      fetchBedsData();
    } catch (err: any) {
      setMsgError(err.message || 'Falha ao admitir paciente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async (bed: Bed) => {
    setMsgSuccess(''); setMsgError('');
    if (!window.confirm(`Deseja dar alta médica para ${bed.patient?.name} e liberar o leito ${bed.bedNumber}?`)) return;
    try {
      const res = await fetch(`/api/beds/${bed.id}/discharge`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setMsgSuccess('Alta hospitalar registrada com sucesso!');
      fetchBedsData();
    } catch (err: any) {
      setMsgError(err.message || 'Falha ao dar alta.');
    }
  };

  const handleToggleMaintenance = async (bed: Bed) => {
    setMsgSuccess(''); setMsgError('');
    const action = bed.status === 'MAINTENANCE' ? 'disponibilizar' : 'colocar em manutenção';
    if (!window.confirm(`Deseja ${action} o leito ${bed.bedNumber}?`)) return;
    try {
      const res = await fetch(`/api/beds/${bed.id}/maintenance`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setMsgSuccess(`Leito ${bed.bedNumber} atualizado com sucesso!`);
      fetchBedsData();
    } catch (err: any) {
      setMsgError(err.message || 'Falha ao atualizar leito.');
    }
  };

  // Stats
  const available = beds.filter(b => b.status === 'AVAILABLE').length;
  const occupied  = beds.filter(b => b.status === 'OCCUPIED').length;
  const maint     = beds.filter(b => b.status === 'MAINTENANCE').length;

  return (
    <div className="space-y-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#1A2C3E] tracking-tight flex items-center gap-3">
            <BedDouble className="text-[#2C6E9C]" size={28} />
            Controle de Leitos Clínicos
          </h1>
          <p className="text-xs text-[#5B6E8C] mt-1">Monitore e coordene a capacidade e internações na unidade de saúde.</p>
        </div>
        <button
          onClick={fetchBedsData}
          className="bg-white hover:bg-[#F7F9FC] border border-[#E9EDF2] text-[#5B6E8C] hover:text-[#1A2C3E] font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" /></svg>
          Atualizar
        </button>
      </div>

      {/* STATS RÁPIDOS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle className="text-emerald-600" size={20} /></div>
          <div><p className="text-[10px] text-[#5B6E8C] font-semibold uppercase tracking-wider">Disponíveis</p><p className="text-xl font-bold text-[#1A2C3E]">{available}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><BedDouble className="text-red-500" size={20} /></div>
          <div><p className="text-[10px] text-[#5B6E8C] font-semibold uppercase tracking-wider">Ocupados</p><p className="text-xl font-bold text-[#1A2C3E]">{occupied}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><Wrench className="text-orange-500" size={20} /></div>
          <div><p className="text-[10px] text-[#5B6E8C] font-semibold uppercase tracking-wider">Manutenção</p><p className="text-xl font-bold text-[#1A2C3E]">{maint}</p></div>
        </div>
      </div>

      {/* MENSAGENS */}
      {msgSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />{msgSuccess}
        </div>
      )}
      {msgError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{msgError}</div>
      )}

      {/* MODAL DE ADMISSÃO */}
      {selectedBed && (
        <div
          onClick={() => setSelectedBed(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(26,44,62,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 64px rgba(0,0,0,0.16)', border: '1px solid #E9EDF2', position: 'relative' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ background: '#EBF4FB', borderRadius: '12px', padding: '8px', display: 'flex' }}>
                    <BedDouble size={20} color="#2C6E9C" />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1A2C3E', margin: 0 }}>
                    Hospitalizar Paciente
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: '#5B6E8C', margin: 0 }}>
                  Leito <strong style={{ color: '#2C6E9C' }}>{selectedBed.bedNumber}</strong> — {selectedBed.ward}
                </p>
              </div>
              <button
                onClick={() => setSelectedBed(null)}
                style={{ padding: '6px', borderRadius: '8px', border: '1px solid #E9EDF2', background: '#F7F9FC', cursor: 'pointer', color: '#5B6E8C', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit}>
              {/* Campo de busca */}
              <div style={{ marginBottom: '20px' }} ref={searchRef}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5B6E8C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Buscar Paciente por Nome
                </label>

                {!selectedPatient ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={15} color="#9AAEBF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setSelectedPatient(null); }}
                        onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                        placeholder="Digite o nome ou CPF do paciente..."
                        autoFocus
                        style={{ width: '100%', paddingLeft: '36px', paddingRight: '40px', paddingTop: '12px', paddingBottom: '12px', fontSize: '13px', borderRadius: '12px', border: '1px solid #E9EDF2', outline: 'none', background: '#F7F9FC', color: '#1A2C3E', boxSizing: 'border-box' }}
                      />
                      {searching && (
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', border: '2px solid #2C6E9C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      )}
                    </div>

                    {/* Dropdown de sugestões */}
                    {showDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E9EDF2', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 200, marginTop: '4px', overflow: 'hidden' }}>
                        {searchResults.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPatient(p)}
                            style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #F0F4F9', display: 'flex', alignItems: 'center', gap: '10px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F7F9FC')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#EBF4FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#2C6E9C', flexShrink: 0 }}>
                              {p.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A2C3E', margin: 0 }}>{p.name}</p>
                              {p.birthDate && (
                                <p style={{ fontSize: '11px', color: '#5B6E8C', margin: 0 }}>
                                  Nasc: {new Date(p.birthDate).toLocaleDateString('pt-BR')}
                                  {p.gender && ` • ${p.gender}`}
                                  {p.cpfHash && ` • CPF: ${p.cpfHash}`}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <p style={{ fontSize: '12px', color: '#9AAEBF', marginTop: '8px', textAlign: 'center' }}>
                        Nenhum paciente encontrado para "<strong>{searchQuery}</strong>"
                      </p>
                    )}
                  </div>
                ) : (
                  /* Card do paciente selecionado */
                  <div style={{ background: '#EBF4FB', border: '1px solid #BDD9F2', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#2C6E9C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {selectedPatient.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1A2C3E', margin: 0 }}>{selectedPatient.name}</p>
                        <p style={{ fontSize: '11px', color: '#5B6E8C', margin: 0 }}>
                          {selectedPatient.birthDate && `Nasc: ${new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR')}`}
                          {selectedPatient.gender && ` • ${selectedPatient.gender}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearPatient}
                      style={{ padding: '4px', borderRadius: '8px', border: '1px solid #BDD9F2', background: '#fff', cursor: 'pointer', color: '#5B6E8C', display: 'flex' }}
                      title="Trocar paciente"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #E9EDF2' }}>
                <button
                  type="button"
                  onClick={() => setSelectedBed(null)}
                  style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #E9EDF2', background: '#fff', color: '#5B6E8C', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedPatient || submitting}
                  style={{ padding: '10px 24px', borderRadius: '12px', background: selectedPatient ? '#2C6E9C' : '#9AAEBF', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: selectedPatient ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', transition: 'background 0.15s' }}
                >
                  {submitting
                    ? <span style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    : <Save size={14} />}
                  Confirmar Internação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRID DE LEITOS */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="border-2 border-[#2C6E9C] border-t-transparent w-8 h-8 rounded-full animate-spin" />
        </div>
      ) : beds.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#E9EDF2] rounded-3xl bg-[#F7F9FC]">
          <BedDouble className="mx-auto text-[#9AAEBF] mb-3" size={40} />
          <p className="text-sm font-semibold text-[#5B6E8C]">Nenhum leito cadastrado</p>
          <p className="text-xs text-[#9AAEBF] mt-1">Acesse o Painel Administrativo para cadastrar leitos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {beds.map((bed) => {
            const isAvailable   = bed.status === 'AVAILABLE';
            const isOccupied    = bed.status === 'OCCUPIED';
            const isMaint       = bed.status === 'MAINTENANCE';

            return (
              <div
                key={bed.id}
                className="bg-white p-5 rounded-3xl border border-[#E9EDF2] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                style={{ minHeight: '220px' }}
              >
                <div>
                  {/* Topo do card */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#F0F4F9] text-[#2C6E9C] p-2 rounded-xl border border-[#E9EDF2]">
                        <BedDouble size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#1A2C3E] leading-tight">Leito {bed.bedNumber}</h3>
                        <span className="text-[10px] text-[#5B6E8C] font-semibold uppercase tracking-wider">{bed.ward}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 border ${
                      isOccupied  ? 'bg-red-50 text-red-600 border-red-100'
                    : isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-orange-50 text-orange-600 border-orange-100'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isOccupied ? 'bg-red-500' : isAvailable ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                      {isOccupied ? 'Ocupado' : isAvailable ? 'Disponível' : 'Manutenção'}
                    </span>
                  </div>

                  {/* Status body */}
                  {isOccupied && bed.patient && (
                    <div className="p-3 rounded-2xl bg-[#EBF4FB] border border-[#BDD9F2] flex items-center gap-3">
                      <div className="bg-[#2C6E9C] text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {bed.patient.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] text-[#2C6E9C] uppercase tracking-wider font-bold">Paciente Admitido</p>
                        <p className="text-xs font-bold text-[#1A2C3E] truncate">{bed.patient.name}</p>
                      </div>
                    </div>
                  )}
                  {isAvailable && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                      <div className="bg-emerald-100 text-emerald-600 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1A2C3E]">Leito disponível</p>
                        <p className="text-[9px] text-emerald-600 uppercase tracking-wider font-bold">Pronto para admissão</p>
                      </div>
                    </div>
                  )}
                  {isMaint && (
                    <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100 flex items-center gap-3">
                      <div className="bg-orange-100 text-orange-600 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Wrench size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1A2C3E]">Em manutenção</p>
                        <p className="text-[9px] text-orange-600 uppercase tracking-wider font-bold">Indisponível para admissão</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="pt-3 mt-3 border-t border-[#E9EDF2] space-y-2">
                  {isOccupied ? (
                    <button
                      onClick={() => handleDischarge(bed)}
                      className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                      Registrar Alta
                    </button>
                  ) : isAvailable ? (
                    <>
                      <button
                        onClick={() => handleOpenAdmit(bed)}
                        className="w-full bg-[#2C6E9C] hover:bg-[#245E86] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex justify-between items-center"
                      >
                        <span className="flex items-center gap-2"><Plus size={13} />Admitir Paciente</span>
                        <ChevronRight size={13} />
                      </button>
                      <button
                        onClick={() => handleToggleMaintenance(bed)}
                        className="w-full bg-white hover:bg-orange-50 border border-[#E9EDF2] hover:border-orange-200 text-[#5B6E8C] hover:text-orange-600 font-semibold py-1.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Wrench size={12} />Colocar em Manutenção
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleToggleMaintenance(bed)}
                      className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={13} />Disponibilizar Leito
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Animação de spin (CSS inline) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
