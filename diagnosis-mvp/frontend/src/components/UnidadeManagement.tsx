import React, { useState, useEffect } from 'react';
import { PlusCircle, RefreshCw, Building2, MapPin, Edit, Trash2 } from 'lucide-react';

interface UnidadeSaude {
  id: string;
  nome: string;
  endereco: string;
  tipo: string;
  status: string;
}

export default function UnidadeManagement() {
  const token = localStorage.getItem('token');
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [unidades, setUnidades] = useState<UnidadeSaude[]>([]);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipo, setTipo] = useState('UBS');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchMunicipios = async () => {
      try {
        const res = await fetch('/api/municipios', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setMunicipios(await res.json());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchMunicipios();
  }, []);

  useEffect(() => {
    if (selectedMunicipio) {
      fetchUnidades();
    } else {
      setUnidades([]);
    }
  }, [selectedMunicipio]);

  const fetchUnidades = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/unidades-saude', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': selectedMunicipio
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUnidades(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    if (!selectedMunicipio) {
      setError('Por favor, selecione um município antes de cadastrar a unidade.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/unidades-saude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': selectedMunicipio
        },
        body: JSON.stringify({
          nome,
          endereco,
          tipo,
          status: 'ATIVO'
        })
      });

      if (!res.ok) throw new Error('Falha ao cadastrar unidade.');
      
      setSuccess('Unidade de saúde cadastrada com sucesso!');
      setNome('');
      setEndereco('');
      setTipo('UBS');
      fetchUnidades();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta unidade?')) return;
    try {
      const res = await fetch(`/api/unidades-saude/${id}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': selectedMunicipio 
        }
      });
      if (res.ok) {
        fetchUnidades();
      } else {
        alert('Falha ao remover a unidade. Ela pode estar vinculada a usuários ou pacientes.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E9EDF2] p-6">
        <h3 className="text-sm font-bold text-[#2C6E9C] mb-4 flex items-center gap-2">
          <Building2 size={16} />
          Cadastrar Nova Unidade
        </h3>

        <div className="mb-6 space-y-1">
          <label className="text-xs font-medium text-[#5B6E8C]">Município / Organização</label>
          <select
            value={selectedMunicipio}
            onChange={(e) => setSelectedMunicipio(e.target.value)}
            className="w-full md:w-1/3 text-xs border border-[#E9EDF2] rounded-xl px-3 py-2"
          >
            <option value="">Selecione o Município</option>
            {municipios.map(m => (
              <option key={m.id} value={m.id}>{m.nomeMunicipio}</option>
            ))}
          </select>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs mb-4">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-xs mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#5B6E8C]">Nome da Unidade</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: UBS Centro"
              className="w-full text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#5B6E8C]">Endereço</label>
            <input
              type="text"
              required
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex: Rua A, 123"
              className="w-full text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#5B6E8C]">Tipo de Unidade</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full text-xs border border-[#E9EDF2] rounded-xl px-3 py-2"
            >
              <option value="UBS">UBS (Unidade Básica de Saúde)</option>
              <option value="HOSPITAL">Hospital</option>
              <option value="CLINICA">Clínica</option>
            </select>
          </div>
          
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#2C6E9C] text-white hover:bg-[#245E86] font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-2"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <PlusCircle size={14} />}
              Cadastrar
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E9EDF2] p-6">
        <h3 className="text-sm font-bold text-[#2C6E9C] mb-4 flex items-center gap-2">
          <MapPin size={16} />
          Unidades Cadastradas
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="animate-spin text-[#2C6E9C]" size={24} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E9EDF2]">
                  <th className="py-3 px-4 text-xs font-semibold text-[#5B6E8C]">Nome</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#5B6E8C]">Tipo</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#5B6E8C]">Endereço</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#5B6E8C] w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {unidades.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-[#5B6E8C]">
                      Nenhuma unidade cadastrada.
                    </td>
                  </tr>
                ) : (
                  unidades.map((u) => (
                    <tr key={u.id} className="border-b border-[#E9EDF2] hover:bg-[#F7F9FC] transition-colors">
                      <td className="py-3 px-4 text-xs font-medium text-[#1A212B]">{u.nome}</td>
                      <td className="py-3 px-4 text-xs">
                        <span className="bg-[#E9EDF2] text-[#5B6E8C] px-2 py-1 rounded-md font-semibold">
                          {u.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#5B6E8C]">{u.endereco}</td>
                      <td className="py-3 px-4 text-xs flex gap-2">
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
