import React, { useState, useEffect } from 'react'
import { FolderLock, ShieldAlert, CheckCircle, RefreshCw, Globe, User, UserPlus, Mail, PlusCircle, BedDouble, Wrench, Plus, Building2 } from 'lucide-react'
import MunicipioSettings from '../components/MunicipioSettings.tsx'
import UnidadeManagement from '../components/UnidadeManagement.tsx'

interface AuditLog {
  id: string;
  patient?: { id: string; name: string };
  user?: { id: string; name: string; email: string; role: string };
  action: string;
  ipAddress: string;
  createdAt: string;
}

async function safeParseJson(res: Response) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return null;
  }
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'audit' | 'users' | 'beds' | 'municipio' | 'unidades'>('audit')
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState('');

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DOCTOR');
  const [crm, setCrm] = useState('');
  const [unidadeSaudeId, setUnidadeSaudeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [municipioId, setMunicipioId] = useState('');

  // Municipios State
  const [municipios, setMunicipios] = useState<any[]>([]);

  // Unidades de Saúde State
  const [unidades, setUnidades] = useState<any[]>([]);

  // Beds management state
  const [beds, setBeds] = useState<any[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [bedsError, setBedsError] = useState('');
  const [newBedNumber, setNewBedNumber] = useState('');
  const [newBedWard, setNewBedWard] = useState('Clínica Geral');
  const [newBedStatus, setNewBedStatus] = useState('AVAILABLE');
  const [bedSubmitting, setBedSubmitting] = useState(false);
  const [bedFormSuccess, setBedFormSuccess] = useState('');
  const [bedFormError, setBedFormError] = useState('');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    setLogsError('');
    try {
      const res = await fetch('/api/audit/logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
        if (res.ok) {
          const data = await safeParseJson(res);
          if (!data) {
            setLogsError('Falha ao carregar logs de auditoria.');
            return;
          }
          setLogs(data);
        } else {
        if (res.status === 403) {
          setLogsError('Acesso Proibido: Apenas usuários com papel ADMINISTRADOR podem auditar logs de acesso.');
        } else {
          setLogsError('Falha ao carregar logs de auditoria.');
        }
      }
    } catch (e) {
      setLogsError('Falha de conexão com o backend.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
        if (res.ok) {
          const data = await safeParseJson(res);
          if (!data) {
            setUsersError('Falha ao carregar lista de usuários.');
            return;
          }
          setUsers(data);
        } else {
        if (res.status === 403) {
          setUsersError('Acesso Proibido: Apenas administradores podem gerenciar usuários.');
        } else {
          setUsersError('Falha ao carregar lista de usuários.');
        }
      }
    } catch (e) {
      setUsersError('Falha de conexão com o backend ao buscar usuários.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchMunicipios = async () => {
    try {
      const res = await fetch('/api/municipios', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data) setMunicipios(data);
      }
    } catch (e) {
      console.error('Falha ao carregar municípios', e);
    }
  };

  const fetchUnidades = async (tenantId?: string) => {
    if (!tenantId) {
      setUnidades([]);
      return;
    }
    try {
      const res = await fetch('/api/unidades-saude', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenantId
        }
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data) setUnidades(data);
      }
    } catch (e) {
      console.error('Falha ao carregar unidades', e);
    }
  };

  useEffect(() => {
    fetchUnidades(municipioId);
  }, [municipioId]);

  const fetchBeds = async () => {
    setLoadingBeds(true);
    setBedsError('');
    try {
      const res = await fetch('/api/beds', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
        if (res.ok) {
          const data = await safeParseJson(res);
          if (!data) {
            setBedsError('Falha ao carregar leitos.');
            return;
          }
          setBeds(data);
        }
      else setBedsError('Falha ao carregar leitos.');
    } catch { setBedsError('Falha de conexão.'); }
    finally { setLoadingBeds(false); }
  };

  const handleCreateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    setBedFormSuccess('');
    setBedFormError('');
    if (!newBedNumber.trim()) { setBedFormError('Informe o número do leito.'); return; }
    setBedSubmitting(true);
    try {
      const res = await fetch('/api/beds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ bedNumber: newBedNumber, ward: newBedWard, status: newBedStatus })
      });
      if (res.ok) {
        setBedFormSuccess(`Leito ${newBedNumber.toUpperCase()} cadastrado com sucesso!`);
        setNewBedNumber('');
        setNewBedWard('Clínica Geral');
        setNewBedStatus('AVAILABLE');
        fetchBeds();
      } else {
          const data = await safeParseJson(res);
          setBedFormError(data?.message || 'Erro ao criar leito.');
      }
    } catch { setBedFormError('Erro de conexão.'); }
    finally { setBedSubmitting(false); }
  };

  const handleToggleMaintenance = async (bedId: string, currentStatus: string, bedNumber: string) => {
    if (currentStatus === 'OCCUPIED') { alert('Não é possível alterar um leito ocupado.'); return; }
    try {
      const res = await fetch(`/api/beds/${bedId}/maintenance`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchBeds();
    } catch { alert('Erro ao atualizar leito.'); }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchBeds();
    fetchMunicipios();
  }, []);

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');
    setSubmitting(true);

    if (!name || !email || !password || !role) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      setSubmitting(false);
      return;
    }

    if (role === 'DOCTOR' && !crm) {
      setFormError('Médicos exigem o preenchimento do número de CRM.');
      setSubmitting(false);
      return;
    }

    try {
      const payload: any = { name, email, password, role, municipioId };
      if (role === 'DOCTOR') {
        payload.crm = crm;
      }
      payload.unidadeSaudeId = unidadeSaudeId;

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFormSuccess(`Usuário ${name} cadastrado com sucesso no setor ${role}!`);
        // Reset form fields
        setName('');
        setEmail('');
        setPassword('');
        setRole('DOCTOR');
        setCrm('');
        setUnidadeSaudeId('');
        setMunicipioId('');
        // Refresh users list
        fetchUsers();
      } else {
          const data = await safeParseJson(res);
          setFormError(data?.message || 'Falha ao cadastrar usuário. Verifique os dados.');
      }
    } catch (e) {
      setFormError('Erro de conexão ao cadastrar usuário.');
    } finally {
      setSubmitting(false);
    }
  };  return (
    <div className="space-y-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#1A2C3E] flex items-center gap-3 tracking-tight">
            <FolderLock className="text-[#2C6E9C]" size={28} />
            Painel Administrativo & LGPD
          </h1>
          <p className="text-xs text-[#5B6E8C] mt-1">Gerencie profissionais de saúde, atribua setores e audite a trilha imutável de acessos sensíveis (LGPD).</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'audit' ? (
            <button
              onClick={fetchLogs}
              className="bg-white hover:bg-[#F7F9FC] border border-[#E9EDF2] text-[#5B6E8C] hover:text-[#1A2C3E] font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
              Atualizar Logs
            </button>
          ) : (
            <button
              onClick={fetchUsers}
              className="bg-white hover:bg-[#F7F9FC] border border-[#E9EDF2] text-[#5B6E8C] hover:text-[#1A2C3E] font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
              Atualizar Usuários
            </button>
          )}
        </div>
      </div>

      {/* ABAS */}
      <div className="flex border-b border-[#E9EDF2] gap-6">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 px-1 cursor-pointer ${
            activeTab === 'audit'
              ? 'border-[#2C6E9C] text-[#2C6E9C]'
              : 'border-transparent text-[#5B6E8C] hover:text-[#1A2C3E]'
          }`}
        >
          <FolderLock size={16} />
          Trilha de Auditoria LGPD
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 px-1 cursor-pointer ${
            activeTab === 'users'
              ? 'border-[#2C6E9C] text-[#2C6E9C]'
              : 'border-transparent text-[#5B6E8C] hover:text-[#1A2C3E]'
          }`}
        >
          <UserPlus size={16} />
          Gerenciar Usuários & Setores
        </button>
        <button
          onClick={() => { setActiveTab('beds'); fetchBeds(); }}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 px-1 cursor-pointer ${
            activeTab === 'beds'
              ? 'border-[#2C6E9C] text-[#2C6E9C]'
              : 'border-transparent text-[#5B6E8C] hover:text-[#1A2C3E]'
          }`}
        >
          <BedDouble size={16} />
          Gestão de Leitos
        </button>
        <button
          onClick={() => setActiveTab('municipio')}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 px-1 cursor-pointer ${
            activeTab === 'municipio'
              ? 'border-[#2C6E9C] text-[#2C6E9C]'
              : 'border-transparent text-[#5B6E8C] hover:text-[#1A2C3E]'
          }`}
        >
          <Building2 size={16} />
          Configurações do Município
        </button>
        <button
          onClick={() => setActiveTab('unidades')}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 px-1 cursor-pointer ${
            activeTab === 'unidades'
              ? 'border-[#2C6E9C] text-[#2C6E9C]'
              : 'border-transparent text-[#5B6E8C] hover:text-[#1A2C3E]'
          }`}
        >
          <Building2 size={16} />
          Gestão de Unidades
        </button>
      </div>

      {/* ABA DE AUDITORIA */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {logsError ? (
            <div className="p-6 rounded-3xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold max-w-3xl flex items-center gap-3">
              <ShieldAlert size={24} className="flex-shrink-0" />
              {logsError}
            </div>
          ) : (
            <div className="space-y-6">
              {/* AVISO DE CONFORMIDADE */}
              <div className="p-5 rounded-2xl bg-[#F0F4F9] border border-[#E9EDF2] text-xs text-[#5B6E8C] leading-relaxed max-w-4xl">
                <h4 className="font-semibold text-[#2C6E9C] mb-1 uppercase tracking-wider flex items-center gap-2 text-[10px]">
                  <CheckCircle size={16} className="text-[#2C7A4D]" />
                  Garantia de Imutabilidade (Append-Only)
                </h4>
                A base de dados do Supabase/PostgreSQL está configurada com RLS ativado e triggers estruturados a nível de banco de dados que bloqueiam qualquer instrução SQL de <code className="font-mono text-danger bg-red-50 px-1 py-0.5 rounded">UPDATE</code> ou <code className="font-mono text-danger bg-red-50 px-1 py-0.5 rounded">DELETE</code> sobre a tabela <code className="font-mono text-[#2C6E9C] bg-[#F0F4F9] px-1 py-0.5 rounded">access_logs</code>. Registros abaixo são históricos definitivos e auditáveis em juízo.
              </div>

              {/* TABELA DE AUDITORIA */}
              <div className="glass-card rounded-3xl overflow-hidden">
                <div className="px-6 py-5 border-b border-[#E9EDF2]">
                  <h2 className="text-base font-semibold text-[#1A2C3E]">Trilha de Auditoria Recente ({logs.length} acessos)</h2>
                </div>

                {loadingLogs ? (
                  <div className="py-20 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-8 h-8 rounded-full animate-spin"></div></div>
                ) : logs.length === 0 ? (
                  <div className="py-20 text-center text-[#5B6E8C] text-xs">Nenhum acesso de auditoria registrado no histórico.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-[#F7F9FC] text-[#5B6E8C] border-b border-[#E9EDF2] font-semibold uppercase tracking-wider">
                          <th className="px-6 py-4">Profissional</th>
                          <th className="px-6 py-4">Papel</th>
                          <th className="px-6 py-4">Ação Executada</th>
                          <th className="px-6 py-4">Paciente Afetado</th>
                          <th className="px-6 py-4">Endereço IP</th>
                          <th className="px-6 py-4">Data e Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9EDF2] text-[#1A2C3E] font-medium">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#F7F9FC] transition-colors">
                            <td className="px-6 py-4 font-semibold text-[#1A2C3E] flex items-center gap-2">
                              <User size={14} className="text-[#2C6E9C]" />
                              {log.user ? log.user.name : 'SISTEMA'}
                              <span className="text-[10px] text-[#5B6E8C] font-normal">({log.user ? log.user.email : 'system'})</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[9px] bg-[#F0F4F9] text-[#2C6E9C] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                                {log.user ? log.user.role : 'SYSTEM'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[#2C6E9C] font-mono text-[10px] uppercase select-all">{log.action}</td>
                            <td className="px-6 py-4 text-[#1A2C3E] font-semibold">{log.patient ? log.patient.name : 'Vários / Geral'}</td>
                            <td className="px-6 py-4 font-mono text-[10px] flex items-center gap-1.5">
                              <Globe size={12} className="text-[#5B6E8C]" />
                              {log.ipAddress}
                            </td>
                            <td className="px-6 py-4 text-[#5B6E8C]">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA DE GERENCIAMENTO DE USUÁRIOS */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          
          {/* COLUNA ESQUERDA - LISTA DE USUÁRIOS */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E9EDF2]">
                <h2 className="text-base font-semibold text-[#1A2C3E] flex items-center gap-2">
                  <User size={18} className="text-[#2C6E9C]" />
                  Profissionais de Saúde Cadastrados ({users.length})
                </h2>
                <p className="text-xs text-[#5B6E8C] mt-1">Lista de profissionais autorizados nos diferentes setores da clínica.</p>
              </div>

              {usersError ? (
                <div className="p-6 text-danger text-sm font-semibold">{usersError}</div>
              ) : loadingUsers ? (
                <div className="py-20 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-8 h-8 rounded-full animate-spin"></div></div>
              ) : users.length === 0 ? (
                <div className="py-20 text-center text-[#5B6E8C] text-xs">Nenhum profissional cadastrado.</div>
              ) : (
                <div className="divide-y divide-[#E9EDF2] max-h-[600px] overflow-y-auto">
                  {users.map((u) => {
                    let badgeClass = "bg-[#F0F4F9] text-[#2C6E9C] border-[#E9EDF2]";
                    let roleLabel = u.role;
                    let initials = u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                    // Pastel avatar backgrounds
                    const colors = ["bg-blue-50 text-blue-600", "bg-emerald-50 text-emerald-600", "bg-amber-50 text-amber-600", "bg-rose-50 text-rose-600"];
                    const colorIndex = u.name.charCodeAt(0) % colors.length;
                    const avatarColor = colors[colorIndex];

                    if (u.role === 'ADMIN') {
                      badgeClass = "bg-rose-50 text-rose-700 border-rose-100";
                      roleLabel = "Administrador";
                    } else if (u.role === 'DOCTOR') {
                      badgeClass = "bg-blue-50 text-blue-700 border-blue-100";
                      roleLabel = `Médico ${u.crm ? `- CRM: ${u.crm}` : ''}`;
                    } else if (u.role === 'NURSE') {
                      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      roleLabel = "Enfermeiro(a)";
                    } else if (u.role === 'RECEPTIONIST') {
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                      roleLabel = "Recepcionista";
                    }

                    return (
                      <div key={u.id} className="p-5 flex items-start justify-between hover:bg-[#F7F9FC] transition-colors gap-4">
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-semibold text-[#1A2C3E] flex items-center gap-2.5">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor}`}>
                              {initials}
                            </span>
                            {u.name}
                          </h3>
                          <div className="flex flex-col gap-1 pl-[42px]">
                            <span className="text-xs text-[#5B6E8C] flex items-center gap-1.5">
                              <Mail size={12} className="text-[#9AAEBF]" />
                              {u.email}
                            </span>
                            {u.unidadeSaude && (
                              <span className="text-[10px] text-[#5B6E8C] flex items-center gap-1.5 font-medium">
                                <Building2 size={11} className="text-[#9AAEBF]" />
                                <span>Unidade: <span className="text-[#2C6E9C] font-semibold">{u.unidadeSaude.nome}</span></span>
                              </span>
                            )}
                            <span className="text-[10px] text-[#9AAEBF]">
                              Cadastrado em: {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className={`text-[10px] border px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${badgeClass}`}>
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - FORMULÁRIO DE CADASTRO */}
          <div className="lg:col-span-5">
            <div className="glass-card rounded-3xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[#1A2C3E] flex items-center gap-2">
                  <UserPlus size={18} className="text-[#2C6E9C]" />
                  Cadastrar Novo Profissional
                </h2>
                <p className="text-xs text-[#5B6E8C] mt-1">Adicione um novo colaborador e selecione seu setor/papel de atuação.</p>
              </div>

              {formSuccess && (
                <div className="p-4 rounded-2xl bg-[#2C7A4D]/10 border border-[#2C7A4D]/20 text-[#2C7A4D] text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                  <CheckCircle size={18} className="flex-shrink-0 text-[#2C7A4D]" />
                  {formSuccess}
                </div>
              )}

              {formError && (
                <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                  <ShieldAlert size={18} className="flex-shrink-0 text-danger" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#5B6E8C]">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Dra. Ana Costa"
                    className="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#5B6E8C]">E-mail de Acesso</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: ana.costa@clinica.com"
                    className="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#5B6E8C]">Senha Inicial</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Defina uma senha segura"
                    className="w-full text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#5B6E8C] block mb-1.5">Papel / Setor</label>
                  {/* Pill selection type style */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'DOCTOR', label: 'Médico(a)' },
                      { id: 'NURSE', label: 'Enfermeiro(a)' },
                      { id: 'RECEPTIONIST', label: 'Recepcionista' },
                      { id: 'ADMIN', label: 'Administrador' }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setRole(item.id);
                          if (item.id !== 'DOCTOR') setCrm('');
                        }}
                        className={`py-2 px-3 rounded-full text-xs font-medium border text-center transition-all cursor-pointer ${
                          role === item.id
                            ? 'bg-[#F0F4F9] border-[#2C6E9C] text-[#2C6E9C] font-semibold'
                            : 'bg-white border-[#E9EDF2] text-[#5B6E8C] hover:bg-[#F7F9FC]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {role === 'DOCTOR' && (
                  <div className="space-y-1 animate-fade-in pt-1">
                    <label className="text-xs font-medium text-[#5B6E8C]">Registro CRM</label>
                    <input
                      type="text"
                      value={crm}
                      onChange={(e) => setCrm(e.target.value)}
                      placeholder="Ex: CRM/SP 123456"
                      className="w-full text-xs"
                    />
                  </div>
                )}

              <div className="space-y-1 pt-1">
                <label className="text-xs font-medium text-[#5B6E8C]">Município / Organização</label>
                <select
                  value={municipioId}
                  onChange={(e) => setMunicipioId(e.target.value)}
                  className="w-full text-xs border border-[#E9EDF2] rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">Selecione o Município</option>
                  {municipios.map(m => (
                    <option key={m.id} value={m.id}>{m.nomeMunicipio}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-xs font-medium text-[#5B6E8C]">Unidade de Saúde (UBS/Hospital)</label>
                <select
                  value={unidadeSaudeId}
                  onChange={(e) => setUnidadeSaudeId(e.target.value)}
                  className="w-full text-xs border border-[#E9EDF2] rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">Selecione a Unidade (Opcional)</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.tipo})</option>
                  ))}
                </select>
              </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#2C6E9C] text-white hover:bg-[#245E86] font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50 mt-4 shadow-sm"
                >
                  {submitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <PlusCircle size={14} />
                  )}
                  Cadastrar Profissional
                </button>
              </form>

              {/* LISTA DE PAPÉIS NA BASE DO FORMULÁRIO */}
              <div className="pt-4 border-t border-[#E9EDF2] space-y-2">
                <span className="text-[10px] font-bold text-[#9AAEBF] uppercase tracking-wider">Setores Disponíveis</span>
                <div className="flex flex-wrap gap-1.5">
                  {['ADMINISTRADOR', 'MÉDICO', 'ENFERMEIRO(A)', 'RECEPCIONISTA'].map((tag) => (
                    <span key={tag} className="text-[9px] bg-[#F0F4F9] text-[#2C6E9C] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ABA GESTÃO DE LEITOS */}
      {activeTab === 'beds' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* COLUNA ESQUERDA — LISTA DE LEITOS */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E9EDF2] flex justify-between items-center">
                <div>
                  <h2 className="text-base font-semibold text-[#1A2C3E] flex items-center gap-2">
                    <BedDouble size={18} className="text-[#2C6E9C]" />
                    Leitos Cadastrados ({beds.length})
                  </h2>
                  <p className="text-xs text-[#5B6E8C] mt-0.5">Gerencie todos os leitos da unidade de saúde.</p>
                </div>
                <button onClick={fetchBeds} className="text-xs text-[#5B6E8C] hover:text-[#2C6E9C] border border-[#E9EDF2] px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 bg-white transition-colors">
                  <RefreshCw size={12} className={loadingBeds ? 'animate-spin' : ''} /> Atualizar
                </button>
              </div>

              {bedsError ? (
                <div className="p-6 text-rose-600 text-sm">{bedsError}</div>
              ) : loadingBeds ? (
                <div className="py-16 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-7 h-7 rounded-full animate-spin" /></div>
              ) : beds.length === 0 ? (
                <div className="py-16 text-center text-[#5B6E8C] text-xs">Nenhum leito cadastrado ainda.</div>
              ) : (
                <div className="divide-y divide-[#E9EDF2] max-h-[520px] overflow-y-auto">
                  {beds.map((bed) => {
                    const isOccupied  = bed.status === 'OCCUPIED';
                    const isAvailable = bed.status === 'AVAILABLE';
                    const isMaint     = bed.status === 'MAINTENANCE';
                    return (
                      <div key={bed.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#F7F9FC] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#F0F4F9] text-[#2C6E9C] p-2 rounded-xl border border-[#E9EDF2]">
                            <BedDouble size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1A2C3E]">Leito {bed.bedNumber}</p>
                            <p className="text-[10px] text-[#5B6E8C] font-semibold uppercase tracking-wider">{bed.ward}</p>
                            {isOccupied && bed.patient && (
                              <p className="text-[10px] text-[#2C6E9C] mt-0.5">👤 {bed.patient.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            isOccupied  ? 'bg-red-50 text-red-600 border-red-100'
                          : isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                            {isOccupied ? 'Ocupado' : isAvailable ? 'Disponível' : 'Manutenção'}
                          </span>
                          {!isOccupied && (
                            <button
                              onClick={() => handleToggleMaintenance(bed.id, bed.status, bed.bedNumber)}
                              className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                isMaint
                                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                                  : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700'
                              }`}
                              title={isMaint ? 'Disponibilizar leito' : 'Colocar em manutenção'}
                            >
                              <Wrench size={11} className="inline mr-1" />
                              {isMaint ? 'Disponibilizar' : 'Manutenção'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA — FORMULÁRIO DE CRIAÇÃO */}
          <div className="lg:col-span-5">
            <div className="glass-card rounded-3xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-[#1A2C3E] flex items-center gap-2">
                  <Plus size={18} className="text-[#2C6E9C]" />
                  Cadastrar Novo Leito
                </h2>
                <p className="text-xs text-[#5B6E8C] mt-1">Defina o número, ala/tipo e status inicial do leito.</p>
              </div>

              {bedFormSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={16} className="flex-shrink-0" />{bedFormSuccess}
                </div>
              )}
              {bedFormError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert size={16} className="flex-shrink-0" />{bedFormError}
                </div>
              )}

              <form onSubmit={handleCreateBed} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider">Número / Código do Leito</label>
                  <input
                    type="text"
                    value={newBedNumber}
                    onChange={e => setNewBedNumber(e.target.value)}
                    placeholder="Ex: 101, UTI-03, PRE-05"
                    className="w-full py-2.5 px-4 text-sm rounded-xl"
                    required
                  />
                  <p className="text-[10px] text-[#9AAEBF]">O número será convertido para maiúsculas automaticamente.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider">Ala / Tipo do Leito</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Clínica Geral', 'UTI', 'Pré-Natal',
                      'Pediatria', 'Cirúrgico', 'Observação',
                      'Isolamento', 'Emergência', 'Recuperação'
                    ].map(ward => (
                      <button
                        key={ward}
                        type="button"
                        onClick={() => setNewBedWard(ward)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                          newBedWard === ward
                            ? 'bg-[#EBF4FB] border-[#2C6E9C] text-[#2C6E9C]'
                            : 'bg-white border-[#E9EDF2] text-[#5B6E8C] hover:bg-[#F7F9FC]'
                        }`}
                      >
                        {ward}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#5B6E8C] uppercase tracking-wider">Status Inicial</label>
                  <div className="flex gap-3">
                    {[{v:'AVAILABLE',l:'Disponível',c:'emerald'},{v:'MAINTENANCE',l:'Manutenção',c:'orange'}].map(opt => (
                      <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="bedStatus"
                          value={opt.v}
                          checked={newBedStatus === opt.v}
                          onChange={() => setNewBedStatus(opt.v)}
                          className="accent-[#2C6E9C]"
                        />
                        <span className={`text-xs font-semibold ${
                          opt.v === 'AVAILABLE' ? 'text-emerald-700' : 'text-orange-700'
                        }`}>{opt.l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bedSubmitting}
                  className="w-full bg-[#2C6E9C] hover:bg-[#245E86] text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 mt-2"
                >
                  {bedSubmitting
                    ? <RefreshCw size={15} className="animate-spin" />
                    : <Plus size={15} />}
                  Cadastrar Leito
                </button>
              </form>

              <div className="pt-3 border-t border-[#E9EDF2]">
                <p className="text-[10px] text-[#9AAEBF] font-semibold uppercase tracking-wider mb-2">Tipos de Ala Disponíveis</p>
                <div className="flex flex-wrap gap-1.5">
                  {['UTI', 'Pré-Natal', 'Clínica Geral', 'Pediatria', 'Cirúrgico', 'Observação', 'Isolamento', 'Emergência', 'Recuperação'].map(t => (
                    <span key={t} className="text-[9px] bg-[#F0F4F9] text-[#2C6E9C] px-2 py-0.5 rounded-full font-semibold">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA DE GESTÃO DO MUNICÍPIO */}
      {activeTab === 'municipio' && (
        <MunicipioSettings />
      )}

      {/* ABA DE UNIDADES DE SAÚDE */}
      {activeTab === 'unidades' && (
        <UnidadeManagement />
      )}
    </div>
  )
}
