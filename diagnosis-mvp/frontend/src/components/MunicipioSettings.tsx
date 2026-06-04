import React, { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';

export default function MunicipioSettings() {
  const [municipio, setMunicipio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMunicipio();
  }, []);

  const fetchMunicipio = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/municipios/11111111-2222-3333-4444-555555555555', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMunicipio(data);
      } else {
        setError('Falha ao carregar dados do município.');
      }
    } catch (e) {
      setError('Erro de conexão ao carregar município.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/municipios/${municipio.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(municipio)
      });
      if (res.ok) {
        setSuccess('Configurações salvas com sucesso!');
      } else {
        setError('Falha ao salvar configurações.');
      }
    } catch (e) {
      setError('Erro de conexão ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><div className="border-2 border-[#2C6E9C] border-t-transparent w-8 h-8 rounded-full animate-spin"></div></div>;

  if (!municipio) return <div className="p-6 text-danger text-sm font-semibold">{error}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
      <div className="glass-card rounded-3xl overflow-hidden p-6 space-y-6">
        <h2 className="text-base font-semibold text-[#1A2C3E] flex items-center gap-2 border-b border-[#E9EDF2] pb-4">
          <Building2 size={18} className="text-[#2C6E9C]" />
          Configurações do Município
        </h2>
        
        {error && <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-100">{success}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#5B6E8C] uppercase tracking-wider mb-1.5 ml-1">Nome do Município</label>
            <input 
              type="text" 
              value={municipio.nomeMunicipio || ''} 
              onChange={e => setMunicipio({...municipio, nomeMunicipio: e.target.value})}
              className="w-full bg-[#F7F9FC] border border-[#E9EDF2] text-[#1A2C3E] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2C6E9C]/20 focus:border-[#2C6E9C] transition-all placeholder:text-[#9AAEBF]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#5B6E8C] uppercase tracking-wider mb-1.5 ml-1">Estado (UF)</label>
              <input 
                type="text" 
                value={municipio.estado || ''} 
                onChange={e => setMunicipio({...municipio, estado: e.target.value})}
                maxLength={2}
                className="w-full bg-[#F7F9FC] border border-[#E9EDF2] text-[#1A2C3E] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2C6E9C]/20 focus:border-[#2C6E9C] transition-all placeholder:text-[#9AAEBF] uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#5B6E8C] uppercase tracking-wider mb-1.5 ml-1">Código IBGE</label>
              <input 
                type="text" 
                value={municipio.codigoIbge || ''} 
                onChange={e => setMunicipio({...municipio, codigoIbge: e.target.value})}
                className="w-full bg-[#F7F9FC] border border-[#E9EDF2] text-[#1A2C3E] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2C6E9C]/20 focus:border-[#2C6E9C] transition-all placeholder:text-[#9AAEBF]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#5B6E8C] uppercase tracking-wider mb-1.5 ml-1">Nome da Secretaria</label>
            <input 
              type="text" 
              value={municipio.nomeSecretaria || ''} 
              onChange={e => setMunicipio({...municipio, nomeSecretaria: e.target.value})}
              className="w-full bg-[#F7F9FC] border border-[#E9EDF2] text-[#1A2C3E] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2C6E9C]/20 focus:border-[#2C6E9C] transition-all placeholder:text-[#9AAEBF]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#5B6E8C] uppercase tracking-wider mb-1.5 ml-1">CNES Principal</label>
              <input 
                type="text" 
                value={municipio.cnesPrincipal || ''} 
                onChange={e => setMunicipio({...municipio, cnesPrincipal: e.target.value})}
                className="w-full bg-[#F7F9FC] border border-[#E9EDF2] text-[#1A2C3E] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2C6E9C]/20 focus:border-[#2C6E9C] transition-all placeholder:text-[#9AAEBF]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#5B6E8C] uppercase tracking-wider mb-1.5 ml-1">Cor Primária</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="color" 
                  value={municipio.corPrimaria || '#2C6E9C'} 
                  onChange={e => setMunicipio({...municipio, corPrimaria: e.target.value})}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-xs text-[#5B6E8C] font-mono">{municipio.corPrimaria || '#2C6E9C'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E9EDF2]">
            <button 
              onClick={handleSave}
              disabled={submitting}
              className="w-full bg-[#2C6E9C] hover:bg-[#215A84] text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[#2C6E9C]/20"
            >
              {submitting ? (
                <div className="border-2 border-white/30 border-t-white w-4 h-4 rounded-full animate-spin"></div>
              ) : (
                <Save size={16} />
              )}
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="glass-card rounded-3xl p-6 border-l-4 border-l-[#2C6E9C]">
          <h3 className="text-sm font-semibold text-[#1A2C3E] mb-2">MVP Multi-Município</h3>
          <p className="text-xs text-[#5B6E8C] leading-relaxed">
            O Diagnosis agora suporta múltiplos municípios. Todos os dados atuais foram associados ao município "Município Padrão (Editável)". 
            Nesta tela, o Super Administrador pode alterar os dados da cidade para fins de demonstração no MVP.
          </p>
        </div>
      </div>
    </div>
  );
}
