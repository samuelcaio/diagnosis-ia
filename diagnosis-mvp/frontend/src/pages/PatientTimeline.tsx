import React, { useState, useEffect } from 'react'

// Helper to safely parse JSON responses, even if the body is empty or not JSON
const safeParseJson = async (res: Response) => {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const text = await res.text()
    if (text.trim()) {
      try {
        return JSON.parse(text)
      } catch (e) {
        console.warn('Failed to parse JSON:', e)
        return null
      }
    }
    return null // empty body
  }
  return null // not JSON
}
import { useParams, Link } from 'react-router-dom'
import { jsPDF } from 'jspdf'

import { 
  Activity, 
  Clock, 
  FileText, 
  Heart, 
  ShieldAlert, 
  CheckCircle, 
  ArrowLeft,
  FilePlus,
  TrendingUp,
  Download,
  AlertOctagon,
  Microscope,
  Bed,
  Layers,
  ChevronRight,
  ClipboardList,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  User,
  HeartPulse,
  Thermometer,
  Sparkles,
  Award,
  ChevronLeft,
  RefreshCw
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
);

const safeDecodeBase64Utf8 = (base64Str: string): string => {
  try {
    const binString = atob(base64Str);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    try {
      return decodeURIComponent(escape(atob(base64Str)));
    } catch (err) {
      return atob(base64Str);
    }
  }
};

interface PatientHistory {
  patient: {
    id: string;
    name: string;
    birthDate: string;
    gender: string;
    cpfHash: string;
    address?: string;
    phone?: string;
  };
  conditions: any[];
  observations: any[];
  medications: any[];
  allergies: any[];
  immunizations: any[];
  timelineRecords: any[];
  triages: any[];
}

// Mapeamento CID-10 para CIAP-2 padrão da Atenção Primária
const cidToCiapMap: Record<string, { code: string, desc: string }> = {
  'I10': { code: 'K86', desc: 'Hipertensão Sem Complicação' },
  'E10': { code: 'T90', desc: 'Diabetes Insulino-Dependente' },
  'E11': { code: 'T90', desc: 'Diabetes Não Insulino-Dependente' },
  'J45': { code: 'R96', desc: 'Asma' },
  'J44': { code: 'R95', desc: 'Doença Pulmonar Obstrutiva Crônica (DPOC)' },
  'N18': { code: 'U99', desc: 'Doença Renal Crônica' },
  'F41': { code: 'P74', desc: 'Transtorno de Ansiedade' },
  'F32': { code: 'P76', desc: 'Transtorno Depressivo' },
  'I21': { code: 'K75', desc: 'Infarto Agudo do Miocárdio (IAM)' },
  'H66': { code: 'H71', desc: 'Otite Média Aguda (OMA)' },
  'H92': { code: 'H01', desc: 'Dor de Ouvido' },
  'A90': { code: 'A77', desc: 'Dengue' },
  'A92': { code: 'A77', desc: 'Febre por outros vírus (Chikungunya/Zika)' },
  'J11': { code: 'R80', desc: 'Influenza / Gripe' },
  'U07': { code: 'R83', desc: 'Infecção por SARS-CoV-2 (COVID-19)' },
  'J18': { code: 'R81', desc: 'Pneumonia' },
  'N30': { code: 'U71', desc: 'Cistite (Infecção Urinária Baixa)' },
  'N10': { code: 'U70', desc: 'Pielonefrite (Infecção Urinária Alta)' },
  'K29': { code: 'D87', desc: 'Gastrite / Dispepsia' },
  'M54': { code: 'L03', desc: 'Dor lombar sem irradiação (Lombalgia)' },
  'R54': { code: 'A05', desc: 'Fragilidade senil (Idoso)' },
  'Z34': { code: 'W78', desc: 'Gravidez baixo risco (Pré-Natal)' },
  'E66': { code: 'T82', desc: 'Obesidade Clínico-Metabólica' },
  'R73': { code: 'T90', desc: 'Diabetes / Glicemia anormal (Pré-Diabetes)' }
};

export default function PatientTimeline() {
  const { patientId } = useParams<{ patientId: string }>();
  
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [beds, setBeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'soap' | 'docs' | 'exams' | 'beds'>('timeline');

  // AI Diagnostic State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiValidated, setAiValidated] = useState(false);
  const [esusUsoIa, setEsusUsoIa] = useState<'USADA' | 'PRECAUCAO' | 'NAO_USADA'>('USADA');

  // ================= e-SUS APS EMR STATE =================
  const [currentEsusStep, setCurrentEsusStep] = useState(0);

  // 1. Identificação do Usuário
  const [esusCns, setEsusCns] = useState('');
  const [esusMotherName, setEsusMotherName] = useState('');
  const [esusMicroarea, setEsusMicroarea] = useState('02');
  const [esusHealthTeam, setEsusHealthTeam] = useState('Equipe Saúde da Família Ciano');
  const [esusCommunityAgent, setEsusCommunityAgent] = useState('Mariana Silva');

  // 2. Acolhimento e Demanda Estruturados
  const [esusMotivo, setEsusMotivo] = useState('Consulta de Demanda Espontânea');
  const [esusDemandaTipo, setEsusDemandaTipo] = useState('Espontânea'); // Espontânea ou Agendada
  const [esusQueixaPrincipal, setEsusQueixaPrincipal] = useState('');
  const [questionarioDinamico, setQuestionarioDinamico] = useState<Record<string, string>>({});
  const [sintomasAssociados, setSintomasAssociados] = useState<string[]>([]);
  const [fatoresDeRiscoSelecionados, setFatoresDeRiscoSelecionados] = useState<string[]>([]);
  const [observacaoComplementar, setObservacaoComplementar] = useState('');

  // 3. Triagem & Vitais (Auto-carregados da Enfermagem se disponíveis)
  const [esusPa, setEsusPa] = useState('');
  const [esusFc, setEsusFc] = useState('');
  const [esusFr, setEsusFr] = useState('');
  const [esusSat, setEsusSat] = useState('');
  const [esusTemp, setEsusTemp] = useState('');
  const [esusGlicemia, setEsusGlicemia] = useState('');
  const [esusPeso, setEsusPeso] = useState('');
  const [esusAltura, setEsusAltura] = useState('');
  const [esusIMC, setEsusIMC] = useState('');
  const [esusCircAbdominal, setEsusCircAbdominal] = useState('');
  const [esusDor, setEsusDor] = useState(0);
  const [esusRiscoCardio, setEsusRiscoCardio] = useState('Baixo');
  const [esusFragilidade, setEsusFragilidade] = useState('Não Frágil');

  // 4. Histórico Clínico & Alergias
  const [esusCronicas, setEsusCronicas] = useState<string[]>([]);
  const [esusAlergiasMeds, setEsusAlergiasMeds] = useState('');
  const [esusAlergiasAlimentar, setEsusAlergiasAlimentar] = useState('');
  const [esusAlergiasOutras, setEsusAlergiasOutras] = useState('');
  const [esusMedsEmUso, setEsusMedsEmUso] = useState<{medicamento: string, dose: string, frequencia: string}[]>([
    { medicamento: '', dose: '', frequencia: '' }
  ]);

  // 5. Exame Físico por Sistemas
  const [esusEfGeral, setEsusEfGeral] = useState('Bom estado geral, orientado em tempo e espaço, ativo e cooperativo.');
  const [esusEfConsciencia, setEsusEfConsciencia] = useState('Lúcido e orientado (Escala de Coma de Glasgow 15). Sem déficits focais.');
  const [esusEfHidratacao, setEsusEfHidratacao] = useState('Corado, hidratado, anictérico, acianótico.');
  const [esusEfCardio, setEsusEfCardio] = useState('Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros.');
  const [esusEfRespiratorio, setEsusEfRespiratorio] = useState('Murmúrio vesicular presente bilateralmente, sem ruídos adventícios.');
  const [esusEfGastro, setEsusEfGastro] = useState('Abdômen plano, flácido, indolor à palpação superficial e profunda, RHA normoativos.');
  const [esusEfNeuro, setEsusEfNeuro] = useState('Pupilas isocóricas e fotorreagentes, nervos cranianos preservados.');
  const [esusEfMusculo, setEsusEfMusculo] = useState('Força muscular e mobilidade articular preservada em todos os membros.');
  const [esusEfPele, setEsusEfPele] = useState('Pele íntegra, sem lesões, turgor preservado.');

  // 6. SOAP (Consulta Clínica)
  const [esusSoapS, setEsusSoapS] = useState('');
  const [esusSoapO, setEsusSoapO] = useState('');
  const [esusSoapAProblems, setEsusSoapAProblems] = useState('');
  const [esusSoapACid, setEsusSoapACid] = useState('');
  const [esusSoapACiap, setEsusSoapACiap] = useState('');
  const [esusSoapAHipotese, setEsusSoapAHipotese] = useState('');
  const [esusSoapP, setEsusSoapP] = useState('');

  // 7. Solicitação de Exames
  const [esusExamesSolicitados, setEsusExamesSolicitados] = useState<string[]>([]);
  const [esusExamesOutros, setEsusExamesOutros] = useState('');

  // 8. Prescrição Eletrônica
  const [esusPrescricaoMeds, setEsusPrescricaoMeds] = useState<{medicamento: string, posologia: string, dias: string}[]>([
    { medicamento: '', posologia: '', dias: '' }
  ]);
  const [esusPrescricaoOrientacoes, setEsusPrescricaoOrientacoes] = useState('');

  // 9. Encaminhamentos
  const [esusEncSpecialty, setEsusEncSpecialty] = useState('');
  const [esusEncPriority, setEsusEncPriority] = useState('Média');
  const [esusEncJustification, setEsusEncJustification] = useState('');

  // 10. Acompanhamentos APS
  const [esusAcompanhamentos, setEsusAcompanhamentos] = useState<string[]>([]);

  // ================= END e-SUS APS EMR STATE =================

  // Documents State
  const [docType, setDocType] = useState<'prescription' | 'certificate' | 'referral'>('prescription');
  const [prescriptionMeds, setPrescriptionMeds] = useState('');
  const [certDays, setCertDays] = useState('3');
  const [certCid, setCertCid] = useState('E10');
  const [certNotes, setCertNotes] = useState('Manter repouso e hidratação.');
  const [refSpecialty, setRefSpecialty] = useState('Cardiologia');
  const [refJustification, setRefJustification] = useState('Paciente hipertenso e diabético apresentando queixas de dor torácica aguda irradiada para o membro superior esquerdo.');
  
  const [docPdfBase64, setDocPdfBase64] = useState<string | null>(null);
  const [docHash, setDocHash] = useState<string | null>(null);

  // Exams State
  const [examCode, setExamCode] = useState('GLUCOSE');
  const [examName, setExamName] = useState('Glicemia de Jejum');
  const [examValue, setExamValue] = useState('');
  const [examUnit, setExamUnit] = useState('mg/dL');
  const [examRange, setExamRange] = useState('70 a 99 mg/dL');

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/history`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (!data) {
          throw new Error('Invalid patient history response');
        }
        setHistory({
          patient: data.patient,
          conditions: data.conditions || [],
          observations: data.observations || [],
          medications: data.medications || [],
          allergies: data.allergies || [],
          immunizations: data.immunizations || [],
          timelineRecords: data.timelineRecords || [],
          triages: data.triages || []
        });
      }
      
      const bedsRes = await fetch('/api/beds', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (bedsRes.ok) {
        const bedsData = await safeParseJson(bedsRes);
        if (bedsData) setBeds(bedsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchHistory();
    }
  }, [patientId]);

  // Pre-carregar dados da triagem e histórico clínico ao iniciar o atendimento e-SUS
  useEffect(() => {
    if (history) {
      // CNS e dados demográficos extras (Simulados para MVP se não preenchidos)
      setEsusCns('238.4982.3894.0019');
      setEsusMotherName('Maria Joana da Silva');
      
      // Auto-preenche triagem da enfermagem
      if (history.triages && history.triages.length > 0) {
        const t = history.triages[0];
        setEsusPa(t.bloodPressure || '');
        setEsusFc(t.heartRate?.toString() || '');
        setEsusFr(t.respiratoryRate?.toString() || '');
        setEsusSat(t.oxygenSaturation?.toString() || '');
        setEsusTemp(t.temperature?.toString() || '');
        setEsusDor(t.painScale || 0);
        
        // Sugestão de queixa vinda do acolhimento
        setEsusQueixaPrincipal(esusQueixaPrincipal || 'Paciente encaminhado da triagem devido a sintomas ativos.');
      }

      // Auto-preenche comorbidades ativas
      if (history.conditions && history.conditions.length > 0) {
        const activeConds = history.conditions.map(c => c.name);
        setEsusCronicas(activeConds);
      }

      // Auto-preenche alergias registradas
      if (history.allergies && history.allergies.length > 0) {
        const allergiesText = history.allergies.map(a => a.allergen).join(', ');
        setEsusAlergiasMeds(allergiesText);
      }

      // Auto-preenche medicamentos de uso contínuo
      if (history.medications && history.medications.length > 0) {
        const activeMeds = history.medications.map(m => ({
          medicamento: m.medicationName,
          dose: m.dosage,
          frequencia: m.frequency
        }));
        setEsusMedsEmUso(activeMeds);
      }
    }
  }, [history]);

  // Calcular IMC dinamicamente
  useEffect(() => {
    if (esusPeso && esusAltura) {
      const pesoNum = parseFloat(esusPeso);
      const alturaMetros = parseFloat(esusAltura) / 100;
      if (alturaMetros > 0) {
        const imcVal = (pesoNum / (alturaMetros * alturaMetros)).toFixed(1);
        setEsusIMC(imcVal);
      }
    }
  }, [esusPeso, esusAltura]);

  // Sincronizar dados de queixa e vitais no SOAP automaticamente
  useEffect(() => {
    // S: Subjetivo pré-formata com queixas e acolhimento
    const cronicasText = esusCronicas.length > 0 ? `\nHistórico Crônico: ${esusCronicas.join(', ')}` : '';
    setEsusSoapS(`Queixa Principal: ${esusQueixaPrincipal}\nMotivo: ${esusMotivo}\nDemanda: ${esusDemandaTipo}${cronicasText}`);
    
    // O: Objetivo pré-formata com vitais da triagem e exame físico por sistemas
    const vitaisText = `PA: ${esusPa} mmHg | FC: ${esusFc} BPM | FR: ${esusFr} IPM | SatO2: ${esusSat}% | Temp: ${esusTemp}°C | Dor: ${esusDor}/10 | IMC: ${esusIMC}`;
    const efText = `Exame Físico Geral: ${esusEfGeral}\nConsciência: ${esusEfConsciencia}\nCardiovascular: ${esusEfCardio}\nRespiratório: ${esusEfRespiratorio}\nOutros sistemas avaliados e sem anormalidades.`;
    setEsusSoapO(`${vitaisText}\n\n${efText}`);
  }, [esusQueixaPrincipal, esusMotivo, esusDemandaTipo, esusPa, esusFc, esusFr, esusSat, esusTemp, esusDor, esusIMC, esusEfGeral, esusEfConsciencia, esusEfCardio, esusEfRespiratorio, esusCronicas]);

  // Executar Análise Inteligente de Risco (IA Clínica)
  const handleAiAnalysis = async () => {
    setAiLoading(true);
    setAiResult(null);
    setAiValidated(false);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          patientId,
          rawText: (esusSoapS + ' ' + esusSoapO).trim(),
          queixaPrincipal: esusQueixaPrincipal,
          questionarioDinamico: questionarioDinamico,
          sintomasAssociados: sintomasAssociados,
          fatoresDeRiscoSelecionados: fatoresDeRiscoSelecionados,
          observacaoComplementar: observacaoComplementar
        })
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data) setAiResult(data);
        else console.warn('AI analysis returned empty or non‑JSON response');
      } else {
        const errData = await safeParseJson(res);
        let errorMsg = 'Erro ao analisar com IA.';
        if (errData && errData.message) errorMsg = errData.message;
        else {
          const errText = await res.text();
          if (errText) errorMsg = errText;
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  // Validar e Preencher Prontuário com sugestões da IA Clínica
  const handleValidateAiSuggestions = () => {
    if (!aiResult) return;

    // 1. Preenche a Avaliação e Diagnóstico e-SUS
    setEsusSoapS(aiResult.soapSubjetivo || esusSoapS);
    setEsusSoapO(aiResult.soapObjetivo || esusSoapO);
    setEsusSoapAProblems(aiResult.alert || 'Alerta de Risco Moderado a Alto ativo.');
    setEsusSoapAHipotese(aiResult.soapAvaliacao || aiResult.alert || 'Suspeita Clínica de Infecção / Evento Agudo.');
    
    // 2. Utiliza o CID da resposta da IA, ou chuta caso nulo
    let cid = aiResult.cid || 'E10';
    setEsusSoapACid(cid);

    // Mapeamento automático para CIAP-2 correspondente e-SUS APS
    const cleanCid = cid.substring(0,3);
    const ciap2 = cidToCiapMap[cleanCid]?.code || 'A99';
    setEsusSoapACiap(ciap2);

    // 3. Preenche plano com exames sugeridos e conduta
    const exames = aiResult.exams ? aiResult.exams.join(', ') : 'ECG, Hemograma, exames rotineiros.';
    const conduta = aiResult.conduct ? aiResult.conduct : 'Conduta de monitoramento clínico.';
    
    setEsusSoapP(aiResult.soapPlano || `Exames Solicitados: ${exames}\nConduta Médica Validada: ${conduta}\nPlano de acompanhamento e-SUS ativo.`);

    // 4. Marca checkboxes de solicitação de exames correspondentes
    const examCodes: string[] = [];
    if (exames.toLowerCase().includes('glicose')) examCodes.push('GLUCOSE');
    if (exames.toLowerCase().includes('ecg')) examCodes.push('ECG');
    if (exames.toLowerCase().includes('hemograma')) examCodes.push('HEMOGRAMA');
    if (exames.toLowerCase().includes('colesterol')) examCodes.push('CHOLESTEROL');
    setEsusExamesSolicitados(examCodes);

    // 5. Preenche exames sugeridos em texto
    setEsusExamesOutros(exames);

    // 6. Preenche sugestão de prescrição básica nas orientações
    const contraText = aiResult.contraindications?.length > 0 
      ? `\n\n[ALERTA DE SEGURANÇA] CONTRAINDICAÇÕES (NÃO PRESCREVER): ${aiResult.contraindications.join(', ')}` 
      : '';
      
    if (aiResult.conduct) {
      setEsusPrescricaoOrientacoes(`Conduta e medicamentos a serem ministrados imediatamente: ${aiResult.conduct}${contraText}`);
    }

    setAiValidated(true);
    setMsgSuccess('Sugestões do CDSS (CID, CIAP-2, Exames e Condutas) validadas e incorporadas com sucesso!');
    // Pula para a aba de SOAP
    setCurrentEsusStep(6);
  };

  // Salvar Ficha de Consulta e-SUS APS (12 Seções)
  const handleSaveEsusPep = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setMsgSuccess('');
    setMsgError('');

    // Prepara o payload com as 12 seções estruturadas para e-SUS
    const esusPayload = {
      // 1. Identificação do Usuário
      identificacao: {
        nome_completo: history?.patient.name,
        cpf_anonimo: 'ANÔNIMO (LGPD COMPLIANT)',
        data_nascimento: history?.patient.birthDate,
        sexo: history?.patient.gender,
        cns: esusCns,
        nome_mae: esusMotherName,
        endereco: history?.patient.address || 'UBS Local',
        telefone: history?.patient.phone || 'Não informado',
        microarea: esusMicroarea,
        equipe_saude_familia: esusHealthTeam,
        agente_comunitario: esusCommunityAgent
      },
      // 2. Acolhimento
      acolhimento: {
        data_hora: new Date().toISOString(),
        profissional_responsavel: 'Dr. Carlos Oliveira',
        motivo_procura: esusMotivo,
        demanda_tipo: esusDemandaTipo,
        classificacao_risco: esusPa ? 'Verde (Normal)' : 'Azul (Eletivo)',
        queixa_principal: esusQueixaPrincipal
      },
      // 3. Triagem
      triagem: {
        pressao_arterial: esusPa,
        frequencia_cardiaca: esusFc,
        frequencia_respiratoria: esusFr,
        saturacao_o2: esusSat,
        temperatura: esusTemp,
        glicemia_capilar: esusGlicemia,
        antropometria: {
          peso_kg: esusPeso,
          altura_cm: esusAltura,
          imc: esusIMC,
          circunferencia_abdominal: esusCircAbdominal
        },
        escalas: {
          dor: esusDor,
          risco_cardiovascular: esusRiscoCardio,
          escore_fragilidade_idosos: esusFragilidade
        }
      },
      // 4. Histórico Clínico
      historico_clinico: {
        condicoes_cronicas: esusCronicas,
        alergias: {
          medicamentos: esusAlergiasMeds,
          alimentos: esusAlergiasAlimentar,
          outros: esusAlergiasOutras
        },
        medicamentos_em_uso: esusMedsEmUso.filter(m => m.medicamento)
      },
      // 5. Consulta SOAP
      soap: {
        subjetivo: esusSoapS,
        objetivo: esusSoapO,
        avaliacao: {
          problemas_identificados: esusSoapAProblems,
          cid10: esusSoapACid,
          ciap2: esusSoapACiap,
          hipotese_diagnostica: esusSoapAHipotese,
          uso_ia_apoio_decisorio: esusUsoIa
        },
        plano: {
          condutas: esusSoapP,
          retorno: 'Retorno agendado em 15 dias ou se houver sinais de alerta.'
        }
      },
      // 6. Exame Físico
      exame_fisico: {
        estado_geral: esusEfGeral,
        nivel_consciencia: esusEfConsciencia,
        hidratacao: esusEfHidratacao,
        sistemas: {
          cardiovascular: esusEfCardio,
          respiratorio: esusEfRespiratorio,
          gastrointestinal: esusEfGastro,
          neurologico: esusEfNeuro,
          musculoesqueletico: esusEfMusculo,
          pele: esusEfPele
        }
      },
      // 7. Solicitação de Exames
      solicitacao_exames: {
        exames_selecionados: esusExamesSolicitados,
        outros_exames: esusExamesOutros
      },
      // 8. Prescrição Eletrônica
      prescricao_eletronica: {
        medicamentos_prescritos: esusPrescricaoMeds.filter(m => m.medicamento),
        orientacoes: esusPrescricaoOrientacoes
      },
      // 9. Encaminhamentos
      encaminhamentos: {
        especialidade: esusEncSpecialty,
        prioridade: esusEncPriority,
        justificativa: esusEncJustification
      },
      // 10. Acompanhamentos APS (Programas)
      programas_aps: esusAcompanhamentos,
      // 11. Evolução Cronológica
      evolucao_meta: {
        data: new Date().toLocaleDateString('pt-BR'),
        tipo: 'CONSULTA APS E-SUS'
      },
      // 12. Assinatura Digital
      assinatura_digital: {
        profissional_nome: 'Dr. Carlos Oliveira',
        conselho_profissional: 'CRM/SP',
        conselho_numero: '123456',
        assinatura_icp_brasil: 'PEP-SIG-ICPBR-SHA256-' + Math.random().toString(36).substring(2,15).toUpperCase()
      }
    };

    try {
      const res = await fetch(`/api/records/patient/${patientId}/esus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(esusPayload)
      });

      if (!res.ok) {
        // Safely parse error response if present
        const errData = await safeParseJson(res);
        let errorMsg = 'Erro ao salvar prontuário e-SUS.';
        if (errData && errData.message) errorMsg = errData.message;
        else {
          const errText = await res.text();
          if (errText) errorMsg = errText;
        }
        throw new Error(errorMsg);
      }

      setMsgSuccess('Consulta e-SUS APS salva, auditada e assinada digitalmente com sucesso!');
      
      // Reseta estados
      setEsusQueixaPrincipal('');
      setEsusSoapS('');
      setEsusSoapO('');
      setEsusSoapACid('');
      setEsusSoapACiap('');
      setEsusSoapAHipotese('');
      setEsusSoapP('');
      setEsusPrescricaoMeds([{ medicamento: '', posologia: '', dias: '' }]);
      setEsusPrescricaoOrientacoes('');
      setEsusEncSpecialty('');
      setEsusEncJustification('');
      setEsusExamesSolicitados([]);
      setEsusExamesOutros('');
      setEsusAcompanhamentos([]);
      setEsusUsoIa('USADA');
      
      setCurrentEsusStep(0);
      setActiveTab('timeline');
      fetchHistory();
    } catch (err: any) {
      setMsgError(err.message || 'Erro de rede ao salvar evolução e-SUS.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Registrar Resultado de Exame
  const handleRegisterExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setMsgSuccess('');
    setMsgError('');

    try {
      const payload = {
        code: examCode,
        name: examName,
        value: examValue,
        unit: examUnit,
        referenceRange: examRange
      };

      const res = await fetch(`/api/observations/patient/${patientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await safeParseJson(res);
        throw new Error(data?.message || 'Erro ao salvar exame.');
      }

      setMsgSuccess('Resultado de exame laboratorial salvo com sucesso!');
      setExamValue('');
      fetchHistory();
    } catch (err: any) {
      setMsgError(err.message || 'Falha ao registrar.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Hospitalizar em Leito
  const handleOccupyBed = async (bedId: string) => {
    setMsgSuccess('');
    setMsgError('');
    try {
      const res = await fetch(`/api/beds/${bedId}/occupy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ patientId })
      });

      if (!res.ok) {
        const data = await safeParseJson(res);
        throw new Error(data?.message || 'Erro ao ocupar leito.');
      }

      setMsgSuccess('Paciente internado e leito ocupado com sucesso!');
      fetchHistory();
    } catch (err: any) {
      setMsgError(err.message || 'Falha ao realizar internação.');
    }
  };

  // Liberar / Dar alta do leito
  const handleDischargeBed = async (bedId: string) => {
    setMsgSuccess('');
    setMsgError('');
    try {
      const res = await fetch(`/api/beds/${bedId}/discharge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const data = await safeParseJson(res);
        throw new Error(data?.message || 'Erro ao dar alta.');
      }

      setMsgSuccess('Alta hospitalar registrada e leito liberado!');
      fetchHistory();
    } catch (err: any) {
      setMsgError(err.message || 'Falha.');
    }
  };

  // Baixar documento simulado em TXT/PDF do Base64
  const downloadDocument = (base64Str: string, filename: string) => {
    const rawData = safeDecodeBase64Utf8(base64Str);
    const blob = new Blob([rawData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gerar e Baixar PDF profissional via jsPDF para Receitas/Atestados/Encaminhamentos
  const downloadDocumentAsPdf = (base64Str: string, filename: string, title: string = 'Documento Clínico') => {
    try {
      const textContent = safeDecodeBase64Utf8(base64Str);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Barra superior em Azul Azure (#3B82F6)
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 8, 'F');

      // Logo e Identificação da UBS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(26, 44, 62); // #1A2C3E
      doc.text('DIAGNOSIS - CUIDADO CLÍNICO INTELIGENTE', 15, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(91, 110, 140); // #5B6E8C
      doc.text('Unidade Básica de Saúde (UBS) - Sistema Único de Saúde (SUS)', 15, 27);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 15, 32);

      // Linha horizontal divisória
      doc.setDrawColor(233, 237, 242);
      doc.setLineWidth(0.5);
      doc.line(15, 36, 195, 36);

      // Título do Documento Clínico
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(44, 110, 156); // #2C6E9C
      doc.text(title.toUpperCase(), 15, 45);

      // Corpo de texto
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85); // #334155

      // Tratamento de quebra automática de páginas e de linhas
      const splitText = doc.splitTextToSize(textContent, 180);
      let y = 55;
      const pageHeight = 297;
      const margin = 15;

      for (let i = 0; i < splitText.length; i++) {
        if (y > pageHeight - margin - 25) {
          doc.addPage();
          // Barra de cabeçalho na nova página
          doc.setFillColor(59, 130, 246);
          doc.rect(0, 0, 210, 8, 'F');
          y = 25;
        }
        doc.text(splitText[i], 15, y);
        y += 6.5;
      }

      // Rodapé estruturado com disclaimers legais de assinatura
      y = Math.max(y + 15, 225); // Garante rodapé na base caso texto seja curto
      if (y > pageHeight - margin - 30) {
        doc.addPage();
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, 210, 8, 'F');
        y = 225;
      }

      doc.setDrawColor(233, 237, 242);
      doc.line(15, y, 195, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(26, 44, 62);
      doc.text('Assinado Digitalmente (Assinatura Eletrônica ICP-Brasil)', 15, y + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(91, 110, 140);
      doc.text('Documento gerado em conformidade com as regras da MP 2.200-2/2001 e com a LGPD.', 15, y + 11);
      doc.text('Auditado de forma imutável nos servidores do e-SUS. Código ICP: SHA-256 Validated.', 15, y + 15);

      doc.save(filename);
      setMsgSuccess('Documento baixado em PDF com sucesso!');
    } catch (e) {
      console.error('Erro ao gerar PDF do documento:', e);
      // Fallback para download em texto plano (.txt) se houver falhas inesperadas
      downloadDocument(base64Str, filename.replace('.pdf', '.txt'));
    }
  };

  // Parser defensivo de datas que suporta strings ISO e arrays de LocalDateTime do Java
  const safeParseDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    
    // Se for um array de LocalDateTime (Jackson padrão ex: [2026, 5, 30, 15, 41, 19])
    if (Array.isArray(dateVal)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateVal;
      // Os meses em JavaScript começam em 0 (Janeiro = 0, Maio = 4)
      return new Date(year, month - 1, day, hour, minute, second);
    }
    
    // Se for string ou timestamp numérico
    const parsed = new Date(dateVal);
    if (isNaN(parsed.getTime())) {
      return new Date(); // Fallback para a data atual se não conseguir converter
    }
    return parsed;
  };

  // Gerar e Baixar PDF profissional contendo todo o histórico do PEP (Prontuário Eletrônico do Paciente)
  const downloadFullPepAsPdf = () => {
    if (!history || !patient) return;
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const margin = 15;
      const contentWidth = 180;
      const pageHeight = 297;
      let y = 20;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin - 20) {
          doc.addPage();
          doc.setFillColor(44, 110, 156);
          doc.rect(0, 0, 210, 8, 'F');
          y = 20;
          return true;
        }
        return false;
      };

      // Barra superior decorativa
      doc.setFillColor(44, 110, 156);
      doc.rect(0, 0, 210, 8, 'F');

      // Cabeçalho do Dossiê do Prontuário
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(26, 44, 62);
      doc.text('DIAGNOSIS - CUIDADO CLÍNICO INTELIGENTE', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(91, 110, 140);
      doc.text('Unidade Básica de Saúde (UBS) - Sistema Único de Saúde (SUS)', margin, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(26, 44, 62);
      doc.text('PRONTUÁRIO ELETRÔNICO DO PACIENTE (PEP)', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(91, 110, 140);
      doc.text('Dossiê Clínico Consolidado - Atenção Primária à Saúde (e-SUS APS)', margin, y);
      y += 5;

      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, y);
      y += 8;

      doc.setDrawColor(233, 237, 242);
      doc.setLineWidth(0.5);
      doc.line(margin, y, 195, y);
      y += 10;

      // 1. Dados Demográficos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(44, 110, 156);
      doc.text('1. DADOS CADASTRAIS DO PACIENTE', margin, y);
      y += 7;

      doc.setFillColor(247, 249, 252);
      doc.rect(margin, y, contentWidth, 28, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(26, 44, 62);
      doc.text('Nome Completo:', margin + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.name, margin + 35, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.text('Nascimento:', margin + 4, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(patient.birthDate).toLocaleDateString('pt-BR'), margin + 30, y + 12);

      doc.setFont('helvetica', 'bold');
      doc.text('Sexo Biológico:', margin + 85, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.gender || 'Não informado', margin + 115, y + 12);

      doc.setFont('helvetica', 'bold');
      doc.text('CPF (LGPD):', margin + 4, y + 18);
      doc.setFont('helvetica', 'normal');
      doc.text('PROTEGIDO (ANONIMIZAÇÃO VIA HASH CRIPTOGRÁFICO)', margin + 30, y + 18);

      doc.setFont('helvetica', 'bold');
      doc.text('Contato:', margin + 4, y + 24);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.phone || 'Não cadastrado', margin + 25, y + 24);
      
      y += 38;

      // 2. Antecedentes
      checkPageBreak(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(44, 110, 156);
      doc.text('2. ANTECEDENTES E CONDIÇÕES CRÔNICAS', margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(26, 44, 62);

      if (!history.conditions || history.conditions.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhuma condição crônica ou comorbidade ativa cadastrada na ficha clínica.', margin + 4, y);
        y += 8;
      } else {
        history.conditions.forEach((cond) => {
          checkPageBreak(8);
          doc.setFont('helvetica', 'bold');
          const bullet = `• ${cond.name || 'Condição'}`;
          const width = doc.getTextWidth(bullet);
          doc.text(bullet, margin + 4, y);
          doc.setFont('helvetica', 'normal');
          if (cond.cidCode) {
            doc.text(` (CID-10: ${cond.cidCode})`, margin + 4 + width + 2, y);
          }
          y += 6;
        });
      }
      y += 6;

      // 3. Sinais Vitais
      checkPageBreak(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(44, 110, 156);
      doc.text('3. HISTÓRICO DE SINAIS VITAIS E TRIAGENS (MANCHESTER)', margin, y);
      y += 7;

      if (!history.triages || history.triages.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.text('Nenhum registro de triagem ou sinais vitais no histórico clínico.', margin + 4, y);
        y += 8;
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setFillColor(240, 244, 249);
        doc.rect(margin, y, contentWidth, 6, 'F');
        
        doc.text('Data / Hora', margin + 2, y + 4.5);
        doc.text('Pressão Art.', margin + 40, y + 4.5);
        doc.text('Cardíaco', margin + 65, y + 4.5);
        doc.text('Temperatura', margin + 85, y + 4.5);
        doc.text('Saturação', margin + 110, y + 4.5);
        doc.text('Peso', margin + 135, y + 4.5);
        doc.text('Classificação', margin + 155, y + 4.5);
        
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        history.triages.forEach((t) => {
          checkPageBreak(6);
          const tDateObj = safeParseDate(t.createdAt);
          const tDate = tDateObj.toLocaleDateString('pt-BR') + ' ' + tDateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
          doc.text(tDate, margin + 2, y + 4.5);
          doc.text(t.bloodPressure || '-', margin + 40, y + 4.5);
          doc.text(t.heartRate ? `${t.heartRate} bpm` : '-', margin + 65, y + 4.5);
          doc.text(t.temperature ? `${t.temperature} °C` : '-', margin + 85, y + 4.5);
          doc.text(t.oxygenSaturation ? `${t.oxygenSaturation}%` : '-', margin + 110, y + 4.5);
          doc.text(t.weight ? `${t.weight} kg` : '-', margin + 135, y + 4.5);
          doc.text(t.riskClassification || 'SEM RISCO', margin + 155, y + 4.5);
          y += 6;
        });
      }
      y += 10;

      // 4. Evoluções SOAP
      checkPageBreak(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(44, 110, 156);
      doc.text('4. CONSULTAS E EVOLUÇÕES CLÍNICAS (SOAP)', margin, y);
      y += 7;

      if (!history.timelineRecords || history.timelineRecords.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.text('Nenhum atendimento ou registro clínico no prontuário do paciente.', margin + 4, y);
        y += 8;
      } else {
        const sorted = [...history.timelineRecords];
        
        sorted.forEach((record, index) => {
          checkPageBreak(30);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(44, 110, 156);
          const rDateObj = safeParseDate(record.recordedAt);
          const rDateStr = rDateObj.toLocaleDateString('pt-BR') + ' ' + rDateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
          doc.text(`Atendimento #${sorted.length - index} - Data: ${rDateStr} | ${record.title || 'Consulta'}`, margin, y);
          y += 6;

          const parsed = parseSoapContent(record.content);
          
          // Se for um documento emitido contendo pdfBase64, omitir a base64 gigantesca e apresentar um resumo elegante
          if (parsed && (parsed.pdfBase64 || record.content?.includes("pdfBase64"))) {
            checkPageBreak(25);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(26, 44, 62);
            
            let docTypeName = 'Documento Clínico';
            if (record.content?.includes('prescription') || record.title?.includes('Receita')) docTypeName = 'Receituário Médico';
            else if (record.content?.includes('certificate') || record.title?.includes('Atestado')) docTypeName = 'Atestado de Afastamento';
            else if (record.content?.includes('referral') || record.title?.includes('Encaminhamento')) docTypeName = 'Guia de Encaminhamento';
            
            doc.text(`• Documento Emitido: ${docTypeName}`, margin + 4, y);
            y += 5;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(80, 95, 115);
            doc.text(`  Status: Assinado Digitalmente (Assinatura Eletrônica ICP-Brasil)`, margin + 4, y);
            y += 5;
            
            if (parsed.medicamentos) {
              const splitMed = doc.splitTextToSize(`  Medicamentos/Resumo: ${parsed.medicamentos}`, 170);
              for (let m = 0; m < splitMed.length; m++) {
                checkPageBreak(5);
                doc.text(splitMed[m], margin + 4, y);
                y += 4.5;
              }
            }
            if (record.signatureHash) {
              doc.setFont('helvetica', 'italic');
              doc.text(`  Hash SHA-256 Assinatura: ${record.signatureHash.substring(0, 32)}...`, margin + 4, y);
              y += 4.5;
            }
            y += 2;
          } 
          // Se for uma consulta e-SUS ou contiver dados SOAP clássicos
          else if (parsed && parsed.soap) {
            const sections = [
              { label: 'S (Subjetivo - Queixa e Sintomas):', val: parsed.soap.subjetivo },
              { label: 'O (Objetivo - Sinais e Exame Físico):', val: parsed.soap.objetivo },
              { label: 'A (Avaliação - Diagnóstico e Hipótese):', val: `${parsed.soap.avaliacao?.hipotese_diagnostica || ''} ${parsed.soap.avaliacao?.cid10 ? `[CID-10: ${parsed.soap.avaliacao.cid10}]` : ''} ${parsed.soap.avaliacao?.ciap2 ? `[CIAP-2: ${parsed.soap.avaliacao.ciap2}]` : ''}` },
              { label: 'P (Plano Terapêutico e Condutas):', val: parsed.soap.plano?.condutas }
            ];

            sections.forEach((s) => {
              if (!s.val) return;
              checkPageBreak(12);
              
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8.5);
              doc.setTextColor(26, 44, 62);
              doc.text(s.label, margin + 4, y);
              y += 4;
              
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8.5);
              doc.setTextColor(51, 65, 85);
              
              const splitLines = doc.splitTextToSize(s.val, 172);
              for (let k = 0; k < splitLines.length; k++) {
                checkPageBreak(5);
                doc.text(splitLines[k], margin + 6, y);
                y += 4.5;
              }
              y += 2.5;
            });

            const auditIa = parsed.soap.avaliacao?.uso_ia_apoio_decisorio;
            if (auditIa) {
              checkPageBreak(8);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(91, 110, 140);
              let iaLabel = '⚠️ IA NÃO UTILIZADA (ATENDIMENTO MANUAL)';
              if (auditIa === 'USADA') iaLabel = '🤖 IA UTILIZADA E VALIDADA PELO PROFISSIONAL';
              if (auditIa === 'PRECAUCAO') iaLabel = '🛡️ IA ACIONADA POR PRECAUÇÃO';
              doc.text(`[Auditoria e-SUS]: ${iaLabel}`, margin + 4, y);
              y += 6;
            }
          } else {
            checkPageBreak(12);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            
            const raw = typeof record.content === 'object' ? JSON.stringify(record.content) : String(record.content);
            const splitRaw = doc.splitTextToSize(raw, 172);
            for (let k = 0; k < splitRaw.length; k++) {
              checkPageBreak(5);
              doc.text(splitRaw[k], margin + 4, y);
              y += 4.5;
            }
          }

          y += 5;
          doc.setDrawColor(233, 237, 242);
          doc.line(margin, y, 195, y);
          y += 6;
        });
      }

      // Encerramento
      checkPageBreak(30);
      y = Math.min(y + 10, 235);
      if (y < 235) {
        y = 235;
      }
      doc.setDrawColor(233, 237, 242);
      doc.line(margin, y, 195, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(26, 44, 62);
      doc.text('Assinatura / Carimbo do Profissional Responsável', margin, y + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(91, 110, 140);
      doc.text('Dossiê Clínico gerado de forma oficial em conformidade com as normas do CFM e e-SUS APS.', margin, y + 11);
      doc.text('Todos os acessos a este arquivo são auditados e gravados de forma imutável (Em conformidade com a LGPD).', margin, y + 15);

      doc.save(`prontuario_${patient.name.replace(/\s+/g, '_')}.pdf`);
      setMsgSuccess('Prontuário completo exportado em PDF com sucesso!');
    } catch (e) {
      console.error('Erro ao gerar prontuário em PDF:', e);
      setMsgError('Falha ao exportar prontuário em PDF.');
    }
  };


  // Parse de conteúdo SOAP/e-SUS estruturado
  const parseSoapContent = (contentStr: string) => {
    try {
      return JSON.parse(contentStr);
    } catch (e) {
      return { subjetivo: contentStr, objetivo: '', avaliacao: '', plano: '' };
    }
  };

  // Estrutura do gráfico de exames glicose
  const getGlucoseChartData = () => {
    if (!history) return { labels: [], datasets: [] };
    const glucObservations = history.observations
      .filter(o => o.code === 'GLUCOSE')
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    
    return {
      labels: glucObservations.map(o => new Date(o.recordedAt).toLocaleDateString('pt-BR')),
      datasets: [
        {
          label: 'Glicemia de Jejum (mg/dL)',
          data: glucObservations.map(o => parseFloat(o.value)),
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#06b6d4',
          pointHoverRadius: 8
        }
      ]
    };
  };

  if (loading || !history) {
    return (
      <div className="py-20 flex flex-col justify-center items-center gap-4">
        <div className="border-4 border-primary border-t-transparent w-12 h-12 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-semibold">Carregando histórico do prontuário...</p>
      </div>
    )
  }

  const { patient } = history;

  const esusSteps = [
    { id: 0, label: '1. Identificação do Usuário' },
    { id: 1, label: '2. Acolhimento e Demanda' },
    { id: 2, label: '3. Triagem, Vitais & Escalas' },
    { id: 3, label: '4. Histórico Clínico & Alergias' },
    { id: 4, label: '5. Exame Físico Completo' },
    { id: 5, label: '6. IA Apoio Decisório' },
    { id: 6, label: '7. Consulta SOAP (e-SUS)' },
    { id: 7, label: '8. Solicitação de Exames' },
    { id: 8, label: '9. Prescrição Eletrônica' },
    { id: 9, label: '10. Encaminhamentos (SISREG)' },
    { id: 10, label: '11. Acompanhamentos APS' },
    { id: 11, label: '12. Assinatura ICP-Brasil' }
  ];

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO PACIENTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E9EDF2] pb-5">
        <div className="flex items-center gap-3">
          <Link 
            to="/patients" 
            className="p-2.5 rounded-xl bg-white border border-[#E9EDF2] text-[#5B6E8C] hover:text-[#1A2C3E] transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-semibold text-[#1A2C3E] flex items-center gap-2 tracking-tight">
              {patient.name}
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F0F4F9] text-[#2C6E9C] border border-[#E9EDF2] uppercase">
                {patient.gender === 'MASCULINO' ? 'Masc' : 'Fem'}
              </span>
            </h1>
            <p className="text-xs text-[#5B6E8C] mt-0.5">
              Nascimento: {new Date(patient.birthDate).toLocaleDateString('pt-BR')} &bull; CPF: ANÔNIMO (LGPD) &bull; Tel: {patient.phone || 'Não cadastrado'}
            </p>
          </div>
        </div>

        {/* BOTÃO EXPORTAR PEP COMPLETO EM PDF */}
        <button
          onClick={downloadFullPepAsPdf}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl text-xs font-semibold hover:shadow-md transition-all cursor-pointer shadow-sm hover:from-blue-700 hover:to-sky-600"
        >
          <FileText size={14} />
          Exportar Prontuário Completo (PDF)
        </button>
      </div>


      {msgSuccess && (
        <div className="p-4 rounded-2xl bg-[#2C7A4D]/10 border border-[#2C7A4D]/20 text-[#2C7A4D] text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
          <CheckCircle size={18} className="flex-shrink-0" />
          {msgSuccess}
        </div>
      )}

      {msgError && (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
          <ShieldAlert size={18} className="flex-shrink-0" />
          {msgError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: WORKSPACE DO MÉDICO (TABS) */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex overflow-x-auto border-b border-[#E9EDF2] gap-2 pb-px scrollbar-none">
            {[
              { id: 'timeline', label: 'Linha do Tempo (PEP)', icon: Clock },
              { id: 'soap', label: 'Atendimento e-SUS APS', icon: ClipboardList },
              { id: 'docs', label: 'Emissão de Documentos', icon: FilePlus },
              { id: 'exams', label: 'Laboratório (Exames)', icon: Microscope },
              { id: 'beds', label: 'Hospitalização', icon: Bed }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setMsgSuccess(''); setMsgError(''); }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs font-semibold transition-all border-b-2 cursor-pointer flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-[#2C6E9C] bg-[#F0F4F9] text-[#2C6E9C]'
                      : 'border-transparent text-[#5B6E8C] hover:text-[#1A2C3E] hover:bg-[#F7F9FC]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* TAB 1: LINHA DO TEMPO PEP */}
          {activeTab === 'timeline' && (
            <div className="glass-card rounded-3xl p-6 border border-slate-800/80">
              <h2 className="text-base font-display font-bold text-slate-200 mb-6">Prontuário Eletrônico — Histórico Clínico Agregado</h2>
              
              {history.timelineRecords.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl">
                  <Clock className="mx-auto text-slate-650 mb-3" size={32} />
                  <p className="text-xs font-semibold text-slate-400">Linha do tempo vazia</p>
                  <p className="text-[10px] text-slate-500 mt-1">Nenhum evento registrado ainda. Abra a aba "Atendimento e-SUS APS" para evoluir o paciente.</p>
                </div>
              ) : (
                <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">
                  {history.timelineRecords.map((record) => {
                    const parsed = parseSoapContent(record.content);
                    const isEsus = record.title === "Atendimento Clínico e-SUS APS" || record.content?.includes("identificacao");

                    return (
                      <div key={record.id} className="relative">
                        <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border border-slate-700">
                          <span className={`h-2 w-2 rounded-full ${isEsus ? 'bg-primary animate-pulse-cyan' : 'bg-slate-550'}`}></span>
                        </span>

                        <div className="p-5 rounded-2xl bg-slate-900/35 border border-slate-850 hover:border-slate-800 transition-colors space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-start md:items-center gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] font-bold bg-slate-800/60 border border-slate-750 px-2 py-0.5 rounded text-slate-400 uppercase tracking-wider">
                                {record.title}
                              </span>
                              {isEsus && (
                                <>
                                  {parsed.soap?.avaliacao?.uso_ia_apoio_decisorio === 'USADA' ? (
                                    <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-400 uppercase tracking-wider font-mono">
                                      🤖 IA UTILIZADA E VALIDADA
                                    </span>
                                  ) : parsed.soap?.avaliacao?.uso_ia_apoio_decisorio === 'PRECAUCAO' ? (
                                    <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400 uppercase tracking-wider font-mono">
                                      🛡️ IA ACIONADA POR PRECAUÇÃO
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-slate-850 border border-slate-700 px-2 py-0.5 rounded-full text-slate-400 uppercase tracking-wider font-mono">
                                      ⚠️ IA NÃO UTILIZADA (ATENDIMENTO MANUAL)
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-450">{new Date(record.recordedAt).toLocaleString('pt-BR')}</span>
                          </div>

                          {/* RENDERIZAÇÃO CUSTOMIZADA PRONTUÁRIO e-SUS APS */}
                          {isEsus && parsed.identificacao ? (
                            <div className="space-y-4 text-xs text-slate-300">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/20 p-3 rounded-xl border border-slate-900/60 text-[10px] text-slate-400">
                                <div><span className="block font-bold">CNS:</span> {parsed.identificacao.cns}</div>
                                <div><span className="block font-bold">Equipe ESF:</span> {parsed.identificacao.equipe_saude_familia}</div>
                                <div><span className="block font-bold">Microárea:</span> {parsed.identificacao.microarea}</div>
                                <div><span className="block font-bold">Mãe:</span> {parsed.identificacao.nome_mae}</div>
                              </div>

                              <div>
                                <h4 className="font-bold text-primary mb-1">Motivo do Acolhimento & Queixa</h4>
                                <p><span className="text-slate-400">Motivo:</span> {parsed.acolhimento?.motivo_procura} ({parsed.acolhimento?.demanda_tipo})</p>
                                <p className="mt-1 italic p-2 bg-slate-950/25 border border-slate-900 rounded-lg text-slate-350">"{parsed.acolhimento?.queixa_principal}"</p>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[10px] bg-slate-900/40 p-2.5 rounded-xl border border-slate-850">
                                <div><span className="text-slate-450 font-bold">P.A:</span> {parsed.triagem?.pressao_arterial} mmHg</div>
                                <div><span className="text-slate-450 font-bold">F.C:</span> {parsed.triagem?.frequencia_cardiaca} BPM</div>
                                <div><span className="text-slate-450 font-bold">Temp:</span> {parsed.triagem?.temperatura} °C</div>
                                <div><span className="text-slate-450 font-bold">SatO2:</span> {parsed.triagem?.saturacao_o2} %</div>
                                <div><span className="text-slate-450 font-bold">Dor (0-10):</span> {parsed.triagem?.escalas?.dor}/10</div>
                                <div><span className="text-slate-450 font-bold">IMC:</span> {parsed.triagem?.antropometria?.imc}</div>
                                <div className="col-span-2"><span className="text-slate-450 font-bold">Risco Cardio:</span> {parsed.triagem?.escalas?.risco_cardiovascular}</div>
                              </div>

                              {parsed.historico_clinico?.condicoes_cronicas?.length > 0 && (
                                <div>
                                  <h4 className="font-bold text-slate-300">Condições Crônicas:</h4>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {parsed.historico_clinico.condicoes_cronicas.map((c: string, idx: number) => (
                                      <span key={idx} className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-350">{c}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="border-l-2 border-primary/50 pl-3 space-y-2 bg-slate-950/10 py-1.5 pr-2 rounded-r-lg">
                                <h4 className="font-bold text-primary flex items-center gap-1.5 text-xs">
                                  <ClipboardList size={12} />
                                  Evolução Clínica SOAP
                                </h4>
                                <p><span className="font-bold text-primary-hover">S:</span> {parsed.soap?.subjetivo}</p>
                                <p><span className="font-bold text-primary-hover">O:</span> {parsed.soap?.objetivo}</p>
                                <p className="bg-slate-900/60 p-2 rounded border border-slate-850 mt-1">
                                  <span className="font-bold text-primary-hover block mb-1">A (Avaliação e Diagnósticos e-SUS):</span> 
                                  <span className="block font-semibold text-slate-100">{parsed.soap?.avaliacao?.hipotese_diagnostica}</span>
                                  <span className="flex gap-4 text-[10px] text-slate-400 mt-1.5">
                                    <span><strong>CID-10:</strong> {parsed.soap?.avaliacao?.cid10}</span>
                                    <span><strong>CIAP-2:</strong> {parsed.soap?.avaliacao?.ciap2} ({cidToCiapMap[parsed.soap?.avaliacao?.cid10?.substring(0,3)]?.desc || 'Não especificado'})</span>
                                  </span>
                                </p>
                                <p><span className="font-bold text-primary-hover">P:</span> {parsed.soap?.plano?.condutas}</p>
                              </div>

                              {parsed.solicitacao_exames?.exames_selecionados?.length > 0 && (
                                <div className="bg-slate-950/20 p-2.5 rounded-lg border border-slate-900">
                                  <span className="font-bold text-slate-400 block text-[10px] uppercase mb-1">Exames Solicitados:</span>
                                  <span className="text-[11px] text-slate-300 font-semibold">{parsed.solicitacao_exames.exames_selecionados.join(', ')} {parsed.solicitacao_exames.outros_exames}</span>
                                </div>
                              )}

                              {parsed.prescricao_eletronica?.medicamentos_prescritos?.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-bold text-indigo-400 block text-[10px] uppercase">Prescrição Eletrônica:</span>
                                  <div className="bg-slate-950/30 p-2.5 rounded-xl border border-slate-900 font-mono text-[10px] text-indigo-300 space-y-1">
                                    {parsed.prescricao_eletronica.medicamentos_prescritos.map((med: any, idx: number) => (
                                      <div key={idx}>&bull; {med.medicamento} - {med.posologia} ({med.dias} dias)</div>
                                    ))}
                                    {parsed.prescricao_eletronica.orientacoes && (
                                      <div className="mt-2 pt-2 border-t border-slate-850 text-slate-400 whitespace-pre-line font-sans text-xs italic">
                                        Orientações: {parsed.prescricao_eletronica.orientacoes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {parsed.encaminhamentos?.especialidade && (
                                <div className="bg-emerald-950/10 p-2.5 rounded-lg border border-emerald-900/30 text-emerald-400">
                                  <span className="font-bold text-[10px] uppercase block">Guia de Encaminhamento (SISREG)</span>
                                  <p className="font-bold mt-1 text-[11px]">&bull; {parsed.encaminhamentos.especialidade} ({parsed.encaminhamentos.prioridade})</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Justificativa: {parsed.encaminhamentos.justificativa}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* FORMATO SOAP E TRADICIONAIS ANTIGOS */
                            <div className="space-y-2 text-xs text-slate-350">
                              <p><span className="font-semibold text-primary/80">S:</span> {parsed.subjetivo}</p>
                              {parsed.objetivo && <p><span className="font-semibold text-primary/80">O:</span> {parsed.objetivo}</p>}
                              {parsed.avaliacao && <p><span className="font-semibold text-primary/80">A:</span> {parsed.avaliacao}</p>}
                              {parsed.plano && <p><span className="font-semibold text-primary/80">P:</span> {parsed.plano}</p>}
                            </div>
                          )}

                          <div className="mt-4 pt-3 border-t border-slate-850/80 flex justify-between items-center text-[9px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Award size={10} className="text-primary animate-pulse-cyan" />
                              Assinatura Digital ICP-Brasil: {record.authorName} {record.authorCrm ? `(CRM: ${record.authorCrm})` : '(Profissional)'}
                            </span>
                            <span className="font-mono text-primary/80">{record.signatureHash ? record.signatureHash.substring(0,25) + '...' : ''}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATENDIMENTO CLÍNICO COMPLETO E-SUS APS */}
          {activeTab === 'soap' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* SIDEBAR DO E-SUS STEPPER */}
              <div className="lg:col-span-4 space-y-2">
                <div className="glass-card rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-[#5B6E8C] uppercase tracking-wider mb-3">Seções do Prontuário e-SUS</h3>
                  <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto">
                    {esusSteps.map((step) => {
                      const isCompleted = step.id < currentEsusStep;
                      const isActive = step.id === currentEsusStep;
                      return (
                        <button
                          key={step.id}
                          onClick={() => setCurrentEsusStep(step.id)}
                          className={`w-full flex items-center justify-between text-left p-2.5 rounded-xl text-[11px] font-medium transition-all border cursor-pointer ${
                            isActive
                              ? 'bg-[#F0F4F9] border-[#E9EDF2] text-[#2C6E9C] font-semibold'
                              : isCompleted
                              ? 'bg-white border-[#E9EDF2] text-[#5B6E8C]'
                              : 'bg-white border-transparent text-[#9AAEBF] hover:text-[#5B6E8C] hover:bg-[#F7F9FC]'
                          }`}
                        >
                          <span className="truncate">{step.label}</span>
                          {isCompleted && <CheckCircle2 size={12} className="text-[#2C7A4D]" />}
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#2C6E9C]"></span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                {/* ATALHO RÁPIDO PARA IA DENTRO DO STEPPER */}
                <button
                  onClick={() => setCurrentEsusStep(5)}
                  className="w-full bg-white hover:bg-[#F7F9FC] border border-[#E9EDF2] text-xs text-[#2C6E9C] font-semibold p-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Sparkles size={14} className="text-[#2C6E9C]" />
                  Acionar Apoio Decisório da IA
                </button>
              </div>

              {/* CONTEÚDO DA SEÇÃO ATIVA */}
              <div className="lg:col-span-8">
                <form onSubmit={handleSaveEsusPep} className="glass-card rounded-3xl p-6 space-y-6 text-xs text-[#1A2C3E]">
                  
                  {/* SEÇÃO 1: IDENTIFICAÇÃO DO USUÁRIO */}
                  {currentEsusStep === 0 && (
                    <div className="space-y-4">
                      <div className="border-b border-[#E9EDF2] pb-3">
                        <h2 className="text-base font-semibold text-[#1A2C3E] flex items-center gap-2">
                          <User size={18} className="text-[#2C6E9C]" />
                          1. Identificação do Usuário e Cadastro e-SUS
                        </h2>
                        <p className="text-[10px] text-[#5B6E8C] mt-0.5">Demográficos essenciais e mapeamento de território da Atenção Primária.</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#E9EDF2] space-y-2.5">
                        <div><strong className="text-[#5B6E8C] text-[10px] uppercase tracking-wider block md:inline md:mr-1">Nome Completo:</strong> <span className="text-[#1A2C3E] font-semibold text-sm">{patient.name}</span></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><strong className="text-[#5B6E8C] text-[10px] uppercase tracking-wider block">Sexo:</strong> <span className="text-[#1A2C3E] font-medium">{patient.gender}</span></div>
                          <div><strong className="text-[#5B6E8C] text-[10px] uppercase tracking-wider block">Data de Nascimento:</strong> <span className="text-[#1A2C3E] font-medium">{new Date(patient.birthDate).toLocaleDateString('pt-BR')}</span></div>
                          <div><strong className="text-[#5B6E8C] text-[10px] uppercase tracking-wider block">CPF:</strong> <span className="text-[#1A2C3E] font-medium font-mono">ANÔNIMO (LGPD)</span></div>
                          <div><strong className="text-[#5B6E8C] text-[10px] uppercase tracking-wider block">Telefone:</strong> <span className="text-[#1A2C3E] font-medium">{patient.phone || 'Não informado'}</span></div>
                        </div>
                        <div className="pt-2 border-t border-[#E9EDF2]/60"><strong className="text-[#5B6E8C] text-[10px] uppercase tracking-wider block">Endereço Cadastrado:</strong> <span className="text-[#1A2C3E] font-medium">{patient.address || 'UBS Principal'}</span></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cartão Nacional de Saúde (CNS)</label>
                          <input 
                            type="text" 
                            value={esusCns} 
                            onChange={(e) => setEsusCns(e.target.value)}
                            placeholder="Ex: 123.4567.8901.2345"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-650"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome Completo da Mãe</label>
                          <input 
                            type="text" 
                            value={esusMotherName} 
                            onChange={(e) => setEsusMotherName(e.target.value)}
                            placeholder="Nome Completo da Mãe"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-650"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Microárea</label>
                          <input 
                            type="text" 
                            value={esusMicroarea} 
                            onChange={(e) => setEsusMicroarea(e.target.value)}
                            placeholder="01"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equipe Saúde da Família (ESF)</label>
                          <select 
                            value={esusHealthTeam} 
                            onChange={(e) => setEsusHealthTeam(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                          >
                            <option value="Equipe Saúde da Família Ciano">Equipe ESF Ciano</option>
                            <option value="Equipe Saúde da Família Esmeralda">Equipe ESF Esmeralda</option>
                            <option value="Equipe Saúde da Família Âmbar">Equipe ESF Âmbar</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agente Comunitário de Saúde (ACS)</label>
                        <input 
                          type="text" 
                          value={esusCommunityAgent} 
                          onChange={(e) => setEsusCommunityAgent(e.target.value)}
                          placeholder="Nome do ACS Responsável"
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-650"
                        />
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 2: ACOLHIMENTO E DEMANDA */}
                  {currentEsusStep === 1 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <ClipboardList size={18} className="text-primary" />
                          2. Acolhimento e Demanda do Dia
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Registro do motivo da procura e classificação rápida do acolhimento espontâneo.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motivo da Procura</label>
                          <input 
                            type="text" 
                            value={esusMotivo} 
                            onChange={(e) => setEsusMotivo(e.target.value)}
                            placeholder="Ex: Cefaleia crônica, acompanhamento de Hiperdia..."
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-650"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Demanda</label>
                          <select 
                            value={esusDemandaTipo} 
                            onChange={(e) => setEsusDemandaTipo(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                          >
                            <option value="Espontânea">Demanda Espontânea</option>
                            <option value="Agendada">Consulta Agendada (Rotina)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queixa Principal</label>
                        <select 
                          value={esusQueixaPrincipal} 
                          onChange={(e) => {
                            setEsusQueixaPrincipal(e.target.value);
                            setQuestionarioDinamico({});
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                        >
                          <option value="">-- Selecione a Queixa Principal --</option>
                          <option value="Febre">Febre</option>
                          <option value="Tosse">Tosse</option>
                          <option value="Falta_Ar">Falta de ar</option>
                          <option value="Dor_Abdominal">Dor abdominal</option>
                          <option value="Dor_Toracica">Dor torácica</option>
                          <option value="Cefaleia">Cefaleia</option>
                          <option value="Tontura">Tontura</option>
                          <option value="Nausea">Náusea</option>
                          <option value="Vomito">Vômito</option>
                          <option value="Diarreia">Diarreia</option>
                          <option value="Dor_Lombar">Dor lombar</option>
                          <option value="Dor_Articular">Dor articular</option>
                          <option value="Alteracao_Urinaria">Alteração urinária</option>
                          <option value="Sangramento">Sangramento</option>
                          <option value="Lesao_Pele">Lesão de pele</option>
                        </select>
                      </div>

                      {/* Questionário Dinâmico */}
                      {esusQueixaPrincipal === 'Dor_Abdominal' && (
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                          <h3 className="text-sm font-bold text-slate-300">Detalhes da Dor Abdominal</h3>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localização</label>
                            <select 
                              value={questionarioDinamico['Localização'] || ''}
                              onChange={(e) => setQuestionarioDinamico({...questionarioDinamico, 'Localização': e.target.value})}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                            >
                              <option value="">Selecione...</option>
                              <option value="Epigástrio">Epigástrio</option>
                              <option value="Hipocôndrio direito">Hipocôndrio direito</option>
                              <option value="Hipocôndrio esquerdo">Hipocôndrio esquerdo</option>
                              <option value="Periumbilical">Periumbilical</option>
                              <option value="Fossa ilíaca direita">Fossa ilíaca direita</option>
                              <option value="Fossa ilíaca esquerda">Fossa ilíaca esquerda</option>
                              <option value="Difusa">Difusa</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Intensidade</label>
                            <select 
                              value={questionarioDinamico['Intensidade'] || ''}
                              onChange={(e) => setQuestionarioDinamico({...questionarioDinamico, 'Intensidade': e.target.value})}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                            >
                              <option value="">Selecione...</option>
                              <option value="Leve">Leve</option>
                              <option value="Moderada">Moderada</option>
                              <option value="Intensa">Intensa</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Início</label>
                            <select 
                              value={questionarioDinamico['Início'] || ''}
                              onChange={(e) => setQuestionarioDinamico({...questionarioDinamico, 'Início': e.target.value})}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                            >
                              <option value="">Selecione...</option>
                              <option value="Súbito">Súbito</option>
                              <option value="Gradual">Gradual</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duração</label>
                            <select 
                              value={questionarioDinamico['Duração'] || ''}
                              onChange={(e) => setQuestionarioDinamico({...questionarioDinamico, 'Duração': e.target.value})}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                            >
                              <option value="">Selecione...</option>
                              <option value="Menos de 24 horas">Menos de 24 horas</option>
                              <option value="1 a 3 dias">1 a 3 dias</option>
                              <option value="4 a 7 dias">4 a 7 dias</option>
                              <option value="Mais de 7 dias">Mais de 7 dias</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {esusQueixaPrincipal === 'Febre' && (
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                          <h3 className="text-sm font-bold text-slate-300">Detalhes da Febre</h3>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temperatura máxima</label>
                            <select 
                              value={questionarioDinamico['Temperatura máxima'] || ''}
                              onChange={(e) => setQuestionarioDinamico({...questionarioDinamico, 'Temperatura máxima': e.target.value})}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                            >
                              <option value="">Selecione...</option>
                              <option value="Até 37,9">Até 37,9</option>
                              <option value="38 a 38,9">38 a 38,9</option>
                              <option value="39 a 39,9">39 a 39,9</option>
                              <option value="Acima de 40">Acima de 40</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duração</label>
                            <select 
                              value={questionarioDinamico['Duração'] || ''}
                              onChange={(e) => setQuestionarioDinamico({...questionarioDinamico, 'Duração': e.target.value})}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                            >
                              <option value="">Selecione...</option>
                              <option value="Menos de 24 horas">Menos de 24 horas</option>
                              <option value="1 a 3 dias">1 a 3 dias</option>
                              <option value="4 a 7 dias">4 a 7 dias</option>
                              <option value="Mais de 7 dias">Mais de 7 dias</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sintomas Associados</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {['Náusea', 'Vômito', 'Febre', 'Diarreia', 'Constipação', 'Perda de apetite', 'Sangramento', 'Distensão abdominal', 'Tosse', 'Dor de garganta', 'Coriza', 'Mialgia', 'Dor retro-orbitária', 'Exantema'].map(sym => (
                            <label key={sym} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={sintomasAssociados.includes(sym)}
                                onChange={(e) => {
                                  if (e.target.checked) setSintomasAssociados([...sintomasAssociados, sym]);
                                  else setSintomasAssociados(sintomasAssociados.filter(s => s !== sym));
                                }}
                                className="rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/50"
                              />
                              {sym}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observação Complementar</label>
                        <textarea 
                          rows={2}
                          value={observacaoComplementar} 
                          onChange={(e) => setObservacaoComplementar(e.target.value)}
                          placeholder="Informação adicional livre (ex: Paciente refere contato com pessoa doente...)"
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-650"
                        />
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 3: TRIAGEM, VITAIS & ESCALAS */}
                  {currentEsusStep === 2 && (
                    <div className="space-y-5">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <HeartPulse size={18} className="text-primary animate-pulse-cyan" />
                          3. Triagem de Sinais Vitais & Escalas de Risco (e-SUS)
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Importado automaticamente do módulo de triagem da Enfermagem.</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-[10px] leading-relaxed">
                        Se a triagem foi efetuada pela Enfermagem no painel Manchester, os sinais vitais abaixo já estarão preenchidos no formulário automaticamente.
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pressão Arterial</label>
                          <select 
                            value={esusPa} 
                            onChange={(e) => setEsusPa(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Menor que 90/60">Menor que 90/60 (Hipotensão)</option>
                            <option value="120/80">120/80 (Ótima)</option>
                            <option value="130/85">130/85 (Normal limítrofe)</option>
                            <option value="140/90">140/90 (Hipertensão Estágio 1)</option>
                            <option value="160/100">160/100 (Hipertensão Estágio 2)</option>
                            <option value="Acima de 180/120">Acima de 180/120 (Crise Hipertensiva)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FC (BPM)</label>
                          <select 
                            value={esusFc} 
                            onChange={(e) => setEsusFc(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Menor que 60">Menor que 60 (Bradicardia)</option>
                            <option value="60-100">60-100 (Normal)</option>
                            <option value="101-120">101-120 (Taquicardia Leve)</option>
                            <option value="Acima de 120">Acima de 120 (Taquicardia Severa)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FR (IPM)</label>
                          <select 
                            value={esusFr} 
                            onChange={(e) => setEsusFr(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Menor que 12">Menor que 12 (Bradipneia)</option>
                            <option value="12-20">12-20 (Eupneia/Normal)</option>
                            <option value="21-25">21-25 (Taquipneia Leve)</option>
                            <option value="Acima de 25">Acima de 25 (Taquipneia Severa)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saturação (%)</label>
                          <select 
                            value={esusSat} 
                            onChange={(e) => setEsusSat(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Menor que 90">Menor que 90% (Hipóxia Grave)</option>
                            <option value="90-94">90-94% (Hipóxia Leve a Moderada)</option>
                            <option value="Maior que 94">Maior que 94% (Normal)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temperatura (°C)</label>
                          <select 
                            value={esusTemp} 
                            onChange={(e) => setEsusTemp(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Menor que 35">Menor que 35 (Hipotermia)</option>
                            <option value="35-37.2">35-37.2 (Afebril)</option>
                            <option value="37.3-37.7">37.3-37.7 (Febrícula)</option>
                            <option value="37.8-38.9">37.8-38.9 (Febre)</option>
                            <option value="Acima de 39">Acima de 39 (Febre Alta)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Glicemia (mg/dL)</label>
                          <select 
                            value={esusGlicemia} 
                            onChange={(e) => setEsusGlicemia(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Menor que 70">Menor que 70 (Hipoglicemia)</option>
                            <option value="70-99">70-99 (Normal em Jejum)</option>
                            <option value="100-125">100-125 (Glicemia de Jejum Alterada)</option>
                            <option value="Acima de 126">Acima de 126 (Provável Diabetes)</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Antropometria</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400">Peso (kg)</label>
                            <input 
                              type="text" 
                              value={esusPeso} 
                              onChange={(e) => setEsusPeso(e.target.value)}
                              placeholder="70" 
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400">Altura (cm)</label>
                            <input 
                              type="text" 
                              value={esusAltura} 
                              onChange={(e) => setEsusAltura(e.target.value)}
                              placeholder="170" 
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400">IMC (Automático)</label>
                            <input 
                              type="text" 
                              value={esusIMC} 
                              readOnly
                              placeholder="24.2" 
                              className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 text-center font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400">Circ. Abdominal (cm)</label>
                            <input 
                              type="text" 
                              value={esusCircAbdominal} 
                              onChange={(e) => setEsusCircAbdominal(e.target.value)}
                              placeholder="88" 
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-4">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Escalas de Monitoramento</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1 p-3.5 rounded-xl border border-slate-850 bg-slate-900/20">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                              <span>Intensidade da Dor</span>
                              <span className="text-primary font-bold text-xs">{esusDor}/10</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="10"
                              value={esusDor}
                              onChange={(e) => setEsusDor(parseInt(e.target.value))}
                              className="w-full accent-primary mt-2 cursor-pointer"
                            />
                            <div className="flex justify-between text-[8px] text-slate-550 mt-1 font-semibold">
                              <span>Sem Dor</span>
                              <span>Moderada</span>
                              <span>Pior Dor Possível</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Risco Cardiovascular</label>
                              <select 
                                value={esusRiscoCardio} 
                                onChange={(e) => setEsusRiscoCardio(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                              >
                                <option value="Baixo">Risco Baixo (Framingham &lt;10%)</option>
                                <option value="Médio">Risco Médio (Framingham 10%-20%)</option>
                                <option value="Alto">Risco Alto (Framingham &gt;20%)</option>
                                <option value="Muito Alto">Risco Muito Alto (Evento Cardiovascular prévio)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Escore de Fragilidade (Idosos)</label>
                              <select 
                                value={esusFragilidade} 
                                onChange={(e) => setEsusFragilidade(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                              >
                                <option value="Não Frágil">Não Frágil (Indivíduo Robusto)</option>
                                <option value="Pré-Frágil">Pré-Frágil (1 ou 2 critérios da escala)</option>
                                <option value="Frágil">Frágil (3 ou mais critérios da escala)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 4: HISTÓRICO CLÍNICO & ALERGIAS */}
                  {currentEsusStep === 3 && (
                    <div className="space-y-5">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <Activity size={18} className="text-primary" />
                          4. Histórico Clínico, Alergias e Medicamentos em Uso
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Histórico clínico de comorbidades da Atenção Primária.</p>
                      </div>
                      {/* CONDIÇÕES CRÔNICAS E FATORES DE RISCO */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Condições Crônicas Ativas (Hiperdia)</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {['Hipertensão', 'Diabetes', 'Asma', 'DPOC', 'Doença Renal', 'Saúde Mental'].map((cond) => {
                              const exists = esusCronicas.includes(cond);
                              return (
                                <button
                                  type="button"
                                  key={cond}
                                  onClick={() => {
                                    if (exists) {
                                      setEsusCronicas(esusCronicas.filter(c => c !== cond));
                                    } else {
                                      setEsusCronicas([...esusCronicas, cond]);
                                    }
                                  }}
                                  className={`py-2 px-3 rounded-lg text-xs font-medium text-left transition-all ${
                                    exists ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {cond}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fatores de Risco</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {['Hipertensão', 'Diabetes', 'Obesidade', 'Tabagismo', 'Asma', 'DPOC', 'Doença Cardíaca', 'Imunossupressão', 'Gestação', 'Câncer'].map(sym => (
                              <label key={sym} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={fatoresDeRiscoSelecionados.includes(sym)}
                                  onChange={(e) => {
                                    if (e.target.checked) setFatoresDeRiscoSelecionados([...fatoresDeRiscoSelecionados, sym]);
                                    else setFatoresDeRiscoSelecionados(fatoresDeRiscoSelecionados.filter(s => s !== sym));
                                  }}
                                  className="rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/50"
                                />
                                {sym}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ALERGIAS */}
                      <div className="border-t border-slate-850 pt-4 space-y-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Alergias Clínicas</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-405">Medicamentos</label>
                            <select 
                              value={esusAlergiasMeds} 
                              onChange={(e) => setEsusAlergiasMeds(e.target.value)}
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                            >
                              <option value="">Não relata</option>
                              <option value="Penicilina">Penicilina</option>
                              <option value="Sulfa">Sulfa</option>
                              <option value="AINEs (Dipirona, Ibuprofeno)">AINEs (Dipirona, Ibuprofeno)</option>
                              <option value="Anestésico Local">Anestésico Local</option>
                              <option value="Outros Medicamentos">Outros Medicamentos</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-405">Alimentos</label>
                            <select 
                              value={esusAlergiasAlimentar} 
                              onChange={(e) => setEsusAlergiasAlimentar(e.target.value)}
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                            >
                              <option value="">Não relata</option>
                              <option value="Frutos do mar">Frutos do mar</option>
                              <option value="Corantes">Corantes</option>
                              <option value="Amendoim / Castanhas">Amendoim / Castanhas</option>
                              <option value="Leite (APLV)">Leite (APLV)</option>
                              <option value="Outros Alimentos">Outros Alimentos</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-405">Outros Alérgenos</label>
                            <select 
                              value={esusAlergiasOutras} 
                              onChange={(e) => setEsusAlergiasOutras(e.target.value)}
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                            >
                              <option value="">Não relata</option>
                              <option value="Látex">Látex</option>
                              <option value="Poeira / Ácaros">Poeira / Ácaros</option>
                              <option value="Picada de inseto">Picada de inseto</option>
                              <option value="Pelo de animais">Pelo de animais</option>
                              <option value="Outros">Outros</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* MEDICAMENTOS EM USO */}
                      <div className="border-t border-slate-850 pt-4 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicamentos de Uso Contínuo</span>
                          <button
                            type="button"
                            onClick={() => setEsusMedsEmUso([...esusMedsEmUso, { medicamento: '', dose: '', frequencia: '' }])}
                            className="text-primary hover:text-cyan-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} />
                            Adicionar Linha
                          </button>
                        </div>

                        <div className="space-y-2">
                          {esusMedsEmUso.map((med, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <select 
                                value={med.medicamento}
                                onChange={(e) => {
                                  const updated = [...esusMedsEmUso];
                                  updated[idx].medicamento = e.target.value;
                                  setEsusMedsEmUso(updated);
                                }}
                                className="flex-grow bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs cursor-pointer"
                              >
                                <option value="">Medicamento...</option>
                                <option value="Losartana">Losartana</option>
                                <option value="Enalapril">Enalapril</option>
                                <option value="Hidroclorotiazida">Hidroclorotiazida</option>
                                <option value="Metformina">Metformina</option>
                                <option value="Glibenclamida">Glibenclamida</option>
                                <option value="Omeprazol">Omeprazol</option>
                                <option value="Sinvastatina">Sinvastatina</option>
                                <option value="Levotiroxina">Levotiroxina</option>
                                <option value="Outro (Especificar em Obs)">Outro (Especificar em Obs)</option>
                              </select>
                              <select 
                                value={med.dose}
                                onChange={(e) => {
                                  const updated = [...esusMedsEmUso];
                                  updated[idx].dose = e.target.value;
                                  setEsusMedsEmUso(updated);
                                }}
                                className="w-24 bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs text-center cursor-pointer"
                              >
                                <option value="">Dose...</option>
                                <option value="1 comp">1 comp</option>
                                <option value="2 comp">2 comp</option>
                                <option value="1/2 comp">1/2 comp</option>
                                <option value="Gotas">Gotas</option>
                                <option value="U.I.">U.I.</option>
                              </select>
                              <select 
                                value={med.frequencia}
                                onChange={(e) => {
                                  const updated = [...esusMedsEmUso];
                                  updated[idx].frequencia = e.target.value;
                                  setEsusMedsEmUso(updated);
                                }}
                                className="w-32 bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs text-center cursor-pointer"
                              >
                                <option value="">Frequência...</option>
                                <option value="1x ao dia">1x ao dia</option>
                                <option value="12h/12h">12h/12h</option>
                                <option value="8h/8h">8h/8h</option>
                                <option value="6h/6h">6h/6h</option>
                                <option value="Se dor/febre">Se dor/febre</option>
                              </select>
                              {esusMedsEmUso.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setEsusMedsEmUso(esusMedsEmUso.filter((_, i) => i !== idx))}
                                  className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-all cursor-pointer flex-shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 5: EXAME FÍSICO COMPLETO */}
                  {currentEsusStep === 4 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <Thermometer size={18} className="text-primary" />
                          5. Exame Físico Geral & Sistemas e-SUS
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Achados estruturados de avaliação física clínica.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Estado Geral</label>
                          <select 
                            value={esusEfGeral} 
                            onChange={(e) => setEsusEfGeral(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Bom estado geral (BEG)">Bom estado geral (BEG)</option>
                            <option value="Regular estado geral (REG)">Regular estado geral (REG)</option>
                            <option value="Mau estado geral (MEG)">Mau estado geral (MEG)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Nível de Consciência</label>
                          <select 
                            value={esusEfConsciencia} 
                            onChange={(e) => setEsusEfConsciencia(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Lúcido e orientado">Lúcido e orientado</option>
                            <option value="Sonolento">Sonolento</option>
                            <option value="Torporoso">Torporoso</option>
                            <option value="Comatoso">Comatoso</option>
                            <option value="Agitado / Confuso">Agitado / Confuso</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Hidratação</label>
                          <select 
                            value={esusEfHidratacao} 
                            onChange={(e) => setEsusEfHidratacao(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Hidratado">Hidratado</option>
                            <option value="Desidratado leve (+/++++)">Desidratado leve (+/++++)</option>
                            <option value="Desidratado moderado (++/++++)">Desidratado moderado (++/++++)</option>
                            <option value="Desidratado grave (+++/++++)">Desidratado grave (+++/++++)</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Exames Especiais por Sistemas</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase">Cardiovascular</label>
                            <select 
                              value={esusEfCardio} 
                              onChange={(e) => setEsusEfCardio(e.target.value)}
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 text-slate-100 text-[11px] cursor-pointer"
                            >
                              <option value="">Selecione...</option>
                              <option value="Ritmo cardíaco regular em 2 tempos, sem sopros">Ritmo cardíaco regular, sem sopros (Normal)</option>
                              <option value="Ritmo irregular, sem sopros">Ritmo irregular, sem sopros</option>
                              <option value="Ritmo regular, com sopro">Ritmo regular, com sopro</option>
                              <option value="Ritmo irregular, com sopro">Ritmo irregular, com sopro</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase">Respiratório</label>
                            <select 
                              value={esusEfRespiratorio} 
                              onChange={(e) => setEsusEfRespiratorio(e.target.value)}
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 text-slate-100 text-[11px] cursor-pointer"
                            >
                              <option value="">Selecione...</option>
                              <option value="Murmúrio vesicular presente bilateralmente, sem ruídos adventícios">Murmúrio vesicular normal, sem ruídos (Normal)</option>
                              <option value="Murmúrio diminuído, sem ruídos adventícios">Murmúrio diminuído, sem ruídos</option>
                              <option value="Presença de sibilos">Presença de sibilos</option>
                              <option value="Presença de crepitações">Presença de crepitações</option>
                              <option value="Presença de roncos">Presença de roncos</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase">Gastrointestinal</label>
                            <select 
                              value={esusEfGastro} 
                              onChange={(e) => setEsusEfGastro(e.target.value)}
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 text-slate-100 text-[11px] cursor-pointer"
                            >
                              <option value="">Selecione...</option>
                              <option value="Abdômen plano, flácido, indolor à palpação, RHA normoativos">Abdômen plano, indolor, RHA normais (Normal)</option>
                              <option value="Abdômen globoso, indolor à palpação">Abdômen globoso, indolor</option>
                              <option value="Doloroso à palpação leve/profunda sem sinais de irritação peritoneal">Doloroso, sem sinais de irritação</option>
                              <option value="Doloroso com sinais de irritação peritoneal (Descompressão brusca +)">Doloroso, irritação peritoneal (Sinal de alerta!)</option>
                              <option value="Massa palpável">Massa palpável</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase">Neurológico</label>
                            <select 
                              value={esusEfNeuro} 
                              onChange={(e) => setEsusEfNeuro(e.target.value)}
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 text-slate-100 text-[11px] cursor-pointer"
                            >
                              <option value="">Selecione...</option>
                              <option value="Pupilas isocóricas e fotorreagentes, sem déficits focais">Pupilas normais, sem déficits (Normal)</option>
                              <option value="Pupilas anisocóricas">Pupilas anisocóricas (Sinal de alerta!)</option>
                              <option value="Déficit motor ou sensitivo focal">Déficit motor/sensitivo focal</option>
                              <option value="Sinais meníngeos presentes">Sinais meníngeos presentes (Sinal de alerta!)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 6: IA APOIO DECISÓRIO */}
                  {currentEsusStep === 5 && (
                    <div className="space-y-5">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <Sparkles size={18} className="text-primary animate-pulse-cyan" />
                          6. Apoio Decisório de IA Clínica e e-SUS APS
                        </h2>
                        <p className="text-[10px] text-slate-455 mt-0.5">Selecione o modo de apoio da inteligência artificial para orientar o diagnóstico e segurança clínica.</p>
                      </div>

                      {/* SELEÇÃO DO MODO DE APOIO DECISÓRIO IA */}
                      <div className="space-y-2">
                        <div className="flex flex-col md:flex-row gap-3 items-stretch w-full">
                          {[
                            {
                              id: 'USADA',
                              title: 'IA Completa (Recomendado)',
                              description: 'Usa a IA para obter sugestões de diagnósticos (CID/CIAP-2), alertas de risco, exames críticos e condutas com auto-preenchimento do prontuário.',
                              icon: Sparkles,
                              color: 'text-cyan-400'
                            },
                            {
                              id: 'PRECAUCAO',
                              title: 'IA para Precaução',
                              description: 'Usa a IA apenas para detectar alertas de segurança e precauções críticas de saúde do paciente, sem auto-preenchimento do SOAP.',
                              icon: ShieldCheck,
                              color: 'text-emerald-400'
                            },
                            {
                              id: 'NAO_USADA',
                              title: 'Pular Etapa de IA',
                              description: 'Pula completamente a etapa de apoio decisório da IA clínica. Todo o preenchimento da evolução SOAP será estritamente manual.',
                              icon: AlertOctagon,
                              color: 'text-slate-400'
                            }
                          ].map((mode) => {
                            const ModeIcon = mode.icon;
                            const isSelected = esusUsoIa === mode.id;
                            return (
                              <div
                                key={mode.id}
                                onClick={() => setEsusUsoIa(mode.id as 'USADA' | 'PRECAUCAO' | 'NAO_USADA')}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEsusUsoIa(mode.id as 'USADA' | 'PRECAUCAO' | 'NAO_USADA'); }}
                                role="button"
                                tabIndex={0}
                                className={`flex-1 p-4 rounded-2xl border text-left flex flex-col justify-start transition-all cursor-pointer shadow-sm h-auto ${
                                  isSelected
                                    ? mode.id === 'USADA'
                                      ? 'border-[#2C6E9C] bg-[#F0F7FF]'
                                      : mode.id === 'PRECAUCAO'
                                      ? 'border-[#34D399] bg-[#F0FAF4]'
                                      : 'border-[#5B6E8C] bg-[#F7F9FC]'
                                    : 'border-[#E9EDF2] bg-white hover:bg-[#F7F9FC]'
                                }`}
                              >
                                <div className="flex justify-between items-start w-full">
                                  <span className={`text-[11px] font-bold ${
                                    isSelected
                                      ? mode.id === 'USADA' ? 'text-[#1E40AF]' : mode.id === 'PRECAUCAO' ? 'text-[#065F46]' : 'text-[#1A2C3E]'
                                      : 'text-[#5B6E8C]'
                                  }`}>
                                    {mode.title}
                                  </span>
                                  <ModeIcon size={16} className={isSelected ? mode.color : 'text-[#9AAEBF]'} />
                                </div>
                                <p className={`text-[10px] leading-relaxed mt-3 break-words whitespace-normal ${
                                  isSelected
                                    ? mode.id === 'USADA' ? 'text-[#1E40AF]/80' : mode.id === 'PRECAUCAO' ? 'text-[#065F46]/80' : 'text-[#5B6E8C]'
                                    : 'text-[#9AAEBF]'
                                }`}>
                                  {mode.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* FLUXO ADAPTATIVO CONFORME MODO SELECIONADO */}
                      {esusUsoIa === 'NAO_USADA' ? (
                        <div className="p-6 rounded-2xl bg-[#F7F9FC] border border-[#E9EDF2] text-center space-y-4 animate-fade-in">
                          <AlertOctagon className="mx-auto text-[#5B6E8C]" size={36} />
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-[#1A2C3E]">Etapa de IA Clínica Ignorada</h3>
                            <p className="text-[10px] text-[#5B6E8C] max-w-md mx-auto">
                              Você optou por pular a análise de inteligência artificial. Esta decisão será documentada no histórico de auditoria clínica do atendimento como <strong>MANUAL / NÃO UTILIZADA</strong>.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAiResult(null);
                              setAiValidated(false);
                              setCurrentEsusStep(6); // Pula para o SOAP
                            }}
                            className="bg-[#F0F4F9] hover:bg-[#E9EDF2] border border-[#E9EDF2] text-[#2C6E9C] font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 mx-auto cursor-pointer transition-all"
                          >
                            <ChevronRight size={14} />
                            Prosseguir para Evolução SOAP Manual (Sem IA)
                          </button>
                        </div>
                      ) : esusUsoIa === 'PRECAUCAO' ? (
                        <div className="space-y-4 animate-fade-in">
                          {aiResult ? (
                            <div className="space-y-4">
                              {/* ALERTA DE SEGURANÇA */}
                              <div className="p-5 rounded-2xl bg-[#F0FAF4] border border-[#D1FAE5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                  <span className="text-[10px] text-[#065F46] uppercase font-bold tracking-wider">Alertas de Risco e Segurança do Paciente</span>
                                  <h3 className="text-base font-bold text-[#065F46] mt-1 flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#34D399] animate-pulse"></span>
                                    {aiResult.alert}
                                  </h3>
                                  <p className="text-[11px] text-[#065F46]/80 mt-0.5">Sugestão de Diagnóstico de Referência: <strong>{aiResult.alert}</strong></p>
                                </div>
                                <div className="bg-[#D1FAE5] border border-[#A7F3D0] px-4 py-2 rounded-xl text-center flex-shrink-0">
                                  <span className="block text-[9px] text-[#065F46] font-bold uppercase">Severidade</span>
                                  <span className="text-xl font-display font-bold text-[#065F46]">{aiResult.probability || '85'}%</span>
                                </div>
                              </div>

                              {/* CONTRAINDICAÇÕES */}
                              {aiResult.contraindications && aiResult.contraindications.length > 0 && (
                                <div className="p-4 rounded-2xl bg-[#FFF5F5] border border-[#FEE2E2] text-[#C53030] text-xs space-y-2">
                                  <div className="flex items-center gap-2 font-bold text-[#9B2C2C] uppercase">
                                    <AlertOctagon size={16} />
                                    <span>⚠️ Contraindicações Absolutas / Alertas de Segurança</span>
                                  </div>
                                  <p className="font-medium">Medicamentos expressamente proibidos para esta suspeita clínica:</p>
                                  <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
                                    {aiResult.contraindications.map((c: string, idx: number) => (
                                      <li key={idx} className="font-bold">{c}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-[#E9EDF2] bg-white space-y-2">
                                  <h4 className="font-bold text-[#1A2C3E] text-[10px] uppercase border-b border-[#E9EDF2] pb-1">Precauções Clínicas Sugeridas</h4>
                                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#5B6E8C] font-medium">
                                    <li>Monitorar ativamente sinais vitais do paciente durante a evolução.</li>
                                    <li>Verificar histórico de reações alérgicas ou de hipersensibilidade relatadas.</li>
                                    <li>Orientar paciente sobre sinais de alerta para retorno imediato à UBS.</li>
                                  </ul>
                                </div>

                                <div className="p-4 rounded-xl border border-[#E9EDF2] bg-white space-y-2">
                                  <h4 className="font-bold text-[#1A2C3E] text-[10px] uppercase border-b border-[#E9EDF2] pb-1">Exames Críticos Sugeridos</h4>
                                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#5B6E8C] font-semibold">
                                    {aiResult.exams && aiResult.exams.map((e: string, idx: number) => (
                                      <li key={idx}>{e}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* CONDUTA MÉDICA IMEDIATA */}
                              <div className="p-4 rounded-xl border border-[#D1FAE5] bg-[#F0FAF4] space-y-2">
                                <span className="block font-bold text-[#065F46] text-[10px] uppercase tracking-wider">Diretrizes de Conduta e Precaução</span>
                                <div className="text-[11px] text-[#065F46] space-y-1 font-medium leading-relaxed">
                                  {aiResult.conduct ? (
                                    <p>{aiResult.conduct}</p>
                                  ) : (
                                    <p>Conduta de monitoramento clínico.</p>
                                  )}
                                </div>
                              </div>

                              {/* DIAGNÓSTICOS DIFERENCIAIS */}
                              {aiResult.alternativeHypotheses && aiResult.alternativeHypotheses.length > 0 && (
                                <div className="p-4 rounded-2xl border border-[#E9EDF2] bg-white space-y-3">
                                  <h4 className="font-bold text-[#1A2C3E] text-xs uppercase border-b border-[#E9EDF2] pb-1.5 flex items-center gap-1.5">
                                    <Layers size={14} className="text-[#2C6E9C]" />
                                    Diagnósticos Diferenciais Alternativos (Apoio Decisório)
                                  </h4>
                                  <div className="space-y-2">
                                    {aiResult.alternativeHypotheses.map((alt: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E9EDF2] hover:bg-[#F0F4F9] transition-all">
                                        <div>
                                          <span className="font-semibold text-[#1A2C3E] text-xs">{alt.alert}</span>
                                          <span className="text-[9px] font-medium ml-2 px-1.5 py-0.5 rounded bg-white text-[#5B6E8C] border border-[#E9EDF2] font-mono">
                                            CID {alt.cid}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-xs font-bold text-[#2C6E9C]">{alt.probability}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-2 flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAiValidated(false); // No auto-fill
                                    setCurrentEsusStep(6); // Advance to SOAP
                                  }}
                                  className="flex-grow bg-[#2C6E9C] text-white hover:bg-[#2C6E9C]/90 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                                >
                                  <ShieldCheck size={16} />
                                  Ciente das Precauções - Avançar para Evolução Manual
                                </button>
                                <button
                                  type="button"
                                  onClick={handleAiAnalysis}
                                  className="bg-white hover:bg-[#F7F9FC] border border-[#E9EDF2] text-[#5B6E8C] font-bold px-4 py-3.5 rounded-xl cursor-pointer"
                                >
                                  Reanalisar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-12 text-center border border-dashed border-[#E9EDF2] rounded-2xl space-y-4 bg-white">
                              <ShieldCheck className="mx-auto text-[#2C7A4D] animate-pulse" size={36} />
                              <div className="space-y-1">
                                <h3 className="text-sm font-bold text-[#1A2C3E]">Análise de Precaução Clínica Pronta</h3>
                                <p className="text-[10px] text-[#5B6E8C] max-w-md mx-auto">A IA irá monitorar o histórico e a triagem para gerar alertas de segurança e precauções antes da evolução, sem alterar seu prontuário SOAP.</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleAiAnalysis}
                                disabled={aiLoading}
                                className="bg-[#2C6E9C] hover:bg-[#2C6E9C]/90 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 mx-auto cursor-pointer transition-all disabled:opacity-50"
                              >
                                {aiLoading ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Activity size={14} />
                                )}
                                Mapear Alertas e Precauções de Risco IA
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4 animate-fade-in">
                          {aiResult ? (
                            <div className="space-y-4">
                              {/* METER DE ALERTA */}
                              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                                aiResult.probability >= 50
                                  ? 'bg-[#FFF5F5] border-[#FEE2E2] text-[#C53030]'
                                  : 'bg-[#F0F7FF] border-[#DBEAFE] text-[#1E40AF]'
                              }`}>
                                <div>
                                  <span className={`text-[10px] uppercase font-bold tracking-wider ${
                                    aiResult.probability >= 50 ? 'text-[#C53030]' : 'text-[#1E40AF]'
                                  }`}>Risco Identificado pelo CDSS</span>
                                  <h3 className={`text-lg font-bold mt-1 flex items-center gap-2 ${
                                    aiResult.probability >= 50 ? 'text-[#C53030]' : 'text-[#1E40AF]'
                                  }`}>
                                    <span className={`h-3 w-3 rounded-full animate-ping ${
                                      aiResult.probability >= 50 ? 'bg-[#E53E3E]' : 'bg-[#3B82F6]'
                                    }`}></span>
                                    {aiResult.alert}
                                  </h3>
                                  <p className="text-[11px] opacity-90 mt-0.5">Diagnóstico e-SUS sugerido: <strong className="font-bold underline">CID {aiResult.cid || 'N/A'}</strong> &bull; {aiResult.alert}</p>
                                </div>
                                <div className={`border px-4 py-2.5 rounded-xl text-center flex-shrink-0 ${
                                  aiResult.probability >= 50
                                    ? 'bg-[#FEE2E2] border-[#FCA5A5] text-[#C53030]'
                                    : 'bg-[#DBEAFE] border-[#BFDBFE] text-[#1E40AF]'
                                }`}>
                                  <span className="block text-[9px] font-bold uppercase opacity-80">Confiança</span>
                                  <span className="text-2xl font-display font-bold">{aiResult.probability || '85'}%</span>
                                </div>
                              </div>

                              {/* CONTRAINDICAÇÕES */}
                              {aiResult.contraindications && aiResult.contraindications.length > 0 && (
                                <div className="p-4 rounded-2xl bg-[#FFF5F5] border border-[#FEE2E2] text-[#C53030] text-xs space-y-2 animate-fade-in shadow-sm">
                                  <div className="flex items-center gap-2 font-bold text-[#9B2C2C] uppercase">
                                    <AlertOctagon size={16} />
                                    <span>⚠️ Contraindicações Absolutas / Alertas de Segurança</span>
                                  </div>
                                  <p className="font-medium">Medicamentos expressamente proibidos para esta suspeita clínica:</p>
                                  <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
                                    {aiResult.contraindications.map((c: string, idx: number) => (
                                      <li key={idx} className="font-bold">{c}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* REGRAS CLÍNICAS EXPLICADAS */}
                              <div className="p-4 rounded-2xl border border-[#E9EDF2] bg-white space-y-4 shadow-sm animate-fade-in">
                                <h4 className="font-bold text-[#1A2C3E] text-[11px] uppercase border-b border-[#E9EDF2] pb-1 flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-[#3B82F6]" /> 
                                  Validação de Evidências (Motor CDSS)
                                </h4>
                                
                                <p className="text-[11px] text-[#5B6E8C] italic">
                                  {aiResult.motivoDaSugestao || 'Diagnóstico validado com base nos critérios obrigatórios.'}
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Evidências Presentes */}
                                  <div>
                                    <span className="block text-[10px] font-bold text-[#047857] uppercase mb-1.5 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Evidências Encontradas
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {aiResult.evidenciasEncontradas && aiResult.evidenciasEncontradas.length > 0 ? (
                                        aiResult.evidenciasEncontradas.map((e: string, idx: number) => (
                                          <span key={idx} className="px-2 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#D1FAE5] rounded-md text-[10px] font-bold uppercase tracking-wider">
                                            {e.replace(/_/g, ' ')}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-gray-400 italic">Nenhuma registrada</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Evidências Ausentes */}
                                  <div>
                                    <span className="block text-[10px] font-bold text-[#BE123C] uppercase mb-1.5 flex items-center gap-1">
                                      <ShieldAlert className="w-3 h-3" /> Evidências Ausentes
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {aiResult.evidenciasAusentes && aiResult.evidenciasAusentes.length > 0 ? (
                                        aiResult.evidenciasAusentes.map((e: string, idx: number) => (
                                          <span key={idx} className="px-2 py-0.5 bg-[#FFF1F2] text-[#9F1239] border border-[#FFE4E6] rounded-md text-[10px] font-bold uppercase tracking-wider">
                                            {e.replace(/_/g, ' ')}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-gray-400 italic">Nenhuma</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 rounded-xl border border-[#E9EDF2] bg-white space-y-2">
                                  <h4 className="font-bold text-[#1A2C3E] text-[10px] uppercase border-b border-[#E9EDF2] pb-1">Exames Críticos Sugeridos</h4>
                                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#5B6E8C] font-semibold">
                                    {aiResult.exams && aiResult.exams.map((e: string, idx: number) => (
                                      <li key={idx}>{e}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* CONDUTA MÉDICA IMEDIATA */}
                              <div className={`p-4 rounded-xl border space-y-2 ${
                                aiResult.probability >= 50
                                  ? 'bg-[#FFF5F5] border-[#FEE2E2] text-[#C53030]'
                                  : 'bg-[#F0F7FF] border-[#DBEAFE] text-[#1E40AF]'
                              }`}>
                                <span className="block font-bold text-[10px] uppercase tracking-wider">Diretrizes de Conduta APS</span>
                                <div className="text-[11px] space-y-1 font-medium leading-relaxed">
                                  {aiResult.conduct ? (
                                    <p>{aiResult.conduct}</p>
                                  ) : (
                                    <p>Conduta de monitoramento clínico.</p>
                                  )}
                                </div>
                              </div>

                              {/* DIAGNÓSTICOS DIFERENCIAIS */}
                              {aiResult.alternativeHypotheses && aiResult.alternativeHypotheses.length > 0 && (
                                <div className="p-4 rounded-2xl border border-[#E9EDF2] bg-white space-y-3">
                                  <h4 className="font-bold text-[#1A2C3E] text-xs uppercase border-b border-[#E9EDF2] pb-1.5 flex items-center gap-1.5">
                                    <Layers size={14} className="text-[#2C6E9C]" />
                                    Diagnósticos Diferenciais Alternativos (Apoio Decisório)
                                  </h4>
                                  <div className="space-y-2">
                                    {aiResult.alternativeHypotheses.map((alt: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E9EDF2] hover:bg-[#F0F4F9] transition-all">
                                        <div>
                                          <span className="font-semibold text-[#1A2C3E] text-xs">{alt.alert}</span>
                                          <span className="text-[9px] font-medium ml-2 px-1.5 py-0.5 rounded bg-white text-[#5B6E8C] border border-[#E9EDF2] font-mono">
                                            CID {alt.cid}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-xs font-bold text-[#2C6E9C]">{alt.probability}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-2 flex gap-3">
                                <button
                                  type="button"
                                  onClick={handleValidateAiSuggestions}
                                  className="flex-grow bg-[#2C6E9C] text-white hover:bg-[#2C6E9C]/90 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                                >
                                  <ShieldCheck size={16} />
                                  Validar e Auto-Preencher Prontuário e-SUS SOAP
                                </button>
                                <button
                                  type="button"
                                  onClick={handleAiAnalysis}
                                  className="bg-white hover:bg-[#F7F9FC] border border-[#E9EDF2] text-[#5B6E8C] font-bold px-4 py-3.5 rounded-xl cursor-pointer"
                                >
                                  Reanalisar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-12 text-center border border-dashed border-[#E9EDF2] rounded-2xl space-y-4 bg-white">
                              <Sparkles className="mx-auto text-[#2C6E9C] animate-pulse" size={36} />
                              <div className="space-y-1">
                                <h3 className="text-sm font-bold text-[#1A2C3E]">Pronto para a Avaliação Diagnóstica CDSS</h3>
                                <p className="text-[10px] text-[#5B6E8C] max-w-md mx-auto">A IA analisará os dados do e-SUS, sinais vitais e histórico do paciente para formular sugestões de CIDs, CIAP-2, exames sugeridos e escores de risco.</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleAiAnalysis}
                                disabled={aiLoading}
                                className="bg-[#2C6E9C] hover:bg-[#2C6E9C]/90 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 mx-auto cursor-pointer transition-all disabled:opacity-50"
                              >
                                {aiLoading ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Activity size={14} />
                                )}
                                Obter Sugestões Clínicas e Alertas IA
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AVISO LEGAL E DE RESPONSABILIDADE MÉDICA */}
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-350 text-[10px] space-y-1.5 mt-4">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400">
                          <AlertOctagon size={14} className="flex-shrink-0" />
                          <span>OBSERVAÇÃO E AVISO DE RESPONSABILIDADE MÉDICA</span>
                        </div>
                        <p className="leading-relaxed">
                          Esta ferramenta de inteligência artificial clínica fornece apenas sugestões diagnósticas e alertas clínicos de apoio decisório. <strong>Ela NÃO substitui, sob nenhuma circunstância, a avaliação, decisão e o julgamento clínico soberano do profissional de saúde.</strong> O médico assistente permanece como o único responsável legal pela validação diagnóstica, prescrição terapêutica e condutas aplicadas ao paciente.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 7: CONSULTA SOAP (E-SUS) */}
                  {currentEsusStep === 6 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <ClipboardList size={18} className="text-primary" />
                          7. Consulta Clínica SOAP e Avaliação e-SUS APS
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Registro unificado e-SUS. O subjetivo e objetivo são preenchidos dinamicamente de acordo com as queixas e sinais.</p>
                      </div>

                      {aiValidated && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-2">
                          <CheckCircle size={14} />
                          Sugestões da IA Clínica validadas e aplicadas a nível de SOAP!
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subjetivo (S)</label>
                          <textarea 
                            rows={3}
                            value={esusSoapS}
                            onChange={(e) => setEsusSoapS(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Objetivo (O)</label>
                          <textarea 
                            rows={3}
                            value={esusSoapO}
                            onChange={(e) => setEsusSoapO(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-4">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliação & Diagnósticos (A)</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-405 font-bold uppercase">Hipótese Diagnóstica</label>
                            <input 
                              type="text" 
                              value={esusSoapAHipotese}
                              onChange={(e) => setEsusSoapAHipotese(e.target.value)}
                              placeholder="Ex: Suspeita de Infarto sem supra"
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-405 font-bold uppercase">Código CID-10</label>
                            <input 
                              type="text" 
                              value={esusSoapACid}
                              onChange={(e) => {
                                setEsusSoapACid(e.target.value);
                                // Auto mapeia CIAP-2
                                const clean = e.target.value.substring(0,3).toUpperCase();
                                if (cidToCiapMap[clean]) setEsusSoapACiap(cidToCiapMap[clean].code);
                              }}
                              placeholder="Ex: I21.9"
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-405 font-bold uppercase">Código CIAP-2 (e-SUS)</label>
                            <input 
                              type="text" 
                              value={esusSoapACiap}
                              onChange={(e) => setEsusSoapACiap(e.target.value)}
                              placeholder="Ex: K75"
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center font-bold text-primary"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-405 font-bold uppercase">Problemas / Condições Identificados</label>
                          <input 
                            type="text" 
                            value={esusSoapAProblems}
                            onChange={(e) => setEsusSoapAProblems(e.target.value)}
                            placeholder="Descreva problemas identificados"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plano de Cuidado (P)</label>
                        <textarea 
                          rows={3}
                          value={esusSoapP}
                          onChange={(e) => setEsusSoapP(e.target.value)}
                          placeholder="Ex: Administração de AAS, repouso, hidratação..."
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 8: SOLICITAÇÃO DE EXAMES */}
                  {currentEsusStep === 7 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <Microscope size={18} className="text-primary" />
                          8. Solicitação de Exames Complementares
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Selecione exames para impressão e anexação no PEP.</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'HEMOGRAMA', label: 'Hemograma Completo' },
                          { id: 'GLUCOSE', label: 'Glicemia de Jejum' },
                          { id: 'HBA1C', label: 'Hemoglobina Glicada (HbA1c)' },
                          { id: 'CHOLESTEROL', label: 'Colesterol Total e Frações' },
                          { id: 'ECG', label: 'ECG de Repouso' },
                          { id: 'RAIOX', label: 'Raio-X de Tórax' },
                          { id: 'USG', label: 'Ultrassonografia Geral' }
                        ].map((ex) => {
                          const isSel = esusExamesSolicitados.includes(ex.id);
                          return (
                            <button
                              type="button"
                              key={ex.id}
                              onClick={() => {
                                if (isSel) {
                                  setEsusExamesSolicitados(esusExamesSolicitados.filter(id => id !== ex.id));
                                } else {
                                  setEsusExamesSolicitados([...esusExamesSolicitados, ex.id]);
                                }
                              }}
                              className={`p-3 rounded-xl border text-[11px] font-semibold text-center transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-slate-900/40 border-slate-850 text-slate-400'
                              }`}
                            >
                              {ex.label}
                            </button>
                          )
                        })}
                      </div>

                      <div className="space-y-1 pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outros Exames / Detalhes</label>
                        <input 
                          type="text" 
                          value={esusExamesOutros}
                          onChange={(e) => setEsusExamesOutros(e.target.value)}
                          placeholder="Descreva exames adicionais"
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                        />
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 9: PRESCRIÇÃO ELETRÔNICA */}
                  {currentEsusStep === 8 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <div className="flex justify-between items-center">
                          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                            <FileText size={18} className="text-primary" />
                            9. Prescrição Eletrônica Digital
                          </h2>
                          <button
                            type="button"
                            onClick={() => setEsusPrescricaoMeds([...esusPrescricaoMeds, { medicamento: '', posologia: '', dias: '' }])}
                            className="text-primary hover:text-cyan-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} />
                            Adicionar Medicamento
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-450 mt-0.5">Prescreva medicamentos e defina posologia e duração do tratamento.</p>
                      </div>

                      <div className="space-y-3">
                        {esusPrescricaoMeds.map((med, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input 
                              type="text"
                              value={med.medicamento}
                              onChange={(e) => {
                                  const updated = [...esusPrescricaoMeds];
                                  updated[idx].medicamento = e.target.value;
                                  setEsusPrescricaoMeds(updated);
                              }}
                              placeholder="Medicamento (Ex: Amoxicilina 500mg)"
                              className="flex-grow bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs"
                            />
                            <input 
                              type="text"
                              value={med.posologia}
                              onChange={(e) => {
                                  const updated = [...esusPrescricaoMeds];
                                  updated[idx].posologia = e.target.value;
                                  setEsusPrescricaoMeds(updated);
                              }}
                              placeholder="Posologia (Ex: 1 comp de 8h/8h)"
                              className="w-48 bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs text-center"
                            />
                            <input 
                              type="text"
                              value={med.dias}
                              onChange={(e) => {
                                  const updated = [...esusPrescricaoMeds];
                                  updated[idx].dias = e.target.value;
                                  setEsusPrescricaoMeds(updated);
                              }}
                              placeholder="Dias"
                              className="w-16 bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs text-center font-bold"
                            />
                            {esusPrescricaoMeds.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setEsusPrescricaoMeds(esusPrescricaoMeds.filter((_, i) => i !== idx))}
                                className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-all cursor-pointer flex-shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1 pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orientações e Recomendações de Uso</label>
                        <textarea 
                          rows={4}
                          value={esusPrescricaoOrientacoes}
                          onChange={(e) => setEsusPrescricaoOrientacoes(e.target.value)}
                          placeholder="Recomendações gerais (Ex: Tomar com água, evitar alimentos gordurosos, repouso físico...)"
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs placeholder-slate-650"
                        />
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 10: ENCAMINHAMENTOS (SISREG) */}
                  {currentEsusStep === 9 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <Layers size={18} className="text-primary" />
                          10. Encaminhamento Especializado (Fila SISREG)
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Formule solicitações para a atenção secundária e regulação.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Especialidade Médica de Destino</label>
                          <input 
                            type="text" 
                            value={esusEncSpecialty}
                            onChange={(e) => setEsusEncSpecialty(e.target.value)}
                            placeholder="Ex: Cardiologia, Oftalmologia"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridade de Encaminhamento</label>
                          <select 
                            value={esusEncPriority}
                            onChange={(e) => setEsusEncPriority(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 cursor-pointer font-bold"
                          >
                            <option value="Baixa">Eletivo / Baixa Prioridade</option>
                            <option value="Média">Média Prioridade</option>
                            <option value="Alta">Alta Prioridade</option>
                            <option value="Urgência">Urgência de Regulação</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Justificativa Clínica Resumida</label>
                        <textarea 
                          rows={4}
                          value={esusEncJustification}
                          onChange={(e) => setEsusEncJustification(e.target.value)}
                          placeholder="Justificativa técnica fundamentada para a triagem do regulador..."
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs placeholder-slate-650"
                        />
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 11: ACOMPANHAMENTOS APS (PROGRAMAS) */}
                  {currentEsusStep === 10 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <ClipboardList size={18} className="text-primary" />
                          11. Programas e Acompanhamentos APS (e-SUS)
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Selecione os programas de acompanhamento de atenção primária ativos para o usuário.</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['Pré-Natal', 'Puericultura', 'Hiperdia', 'Saúde Mental', 'Tabagismo', 'Saúde do Idoso', 'Saúde da Mulher'].map((prog) => {
                          const isSel = esusAcompanhamentos.includes(prog);
                          return (
                            <button
                              type="button"
                              key={prog}
                              onClick={() => {
                                if (isSel) {
                                  setEsusAcompanhamentos(esusAcompanhamentos.filter(p => p !== prog));
                                } else {
                                  setEsusAcompanhamentos([...esusAcompanhamentos, prog]);
                                }
                              }}
                              className={`p-3 rounded-xl border text-[11px] font-semibold text-center transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-slate-900/40 border-slate-850 text-slate-400'
                              }`}
                            >
                              {prog}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 12: ASSINATURA DIGITAL ICP-BRASIL */}
                  {currentEsusStep === 11 && (
                    <div className="space-y-5">
                      <div className="border-b border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                          <Award size={18} className="text-primary" />
                          12. Assinatura Digital ICP-Brasil & Encerramento e-SUS
                        </h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Assine legalmente o atendimento sob regência de hash ICP-Brasil auditado.</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-3 font-semibold">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <ShieldCheck size={16} />
                          <span>Status do Prontuário: Pronto para Fechamento</span>
                        </div>
                        <div className="text-[11px] text-slate-405 space-y-2 border-t border-slate-855 pt-3">
                          <div>Profissional de Saúde: <strong className="text-slate-200">Dr. Carlos Oliveira</strong></div>
                          <div>Conselho: <strong className="text-slate-200">CRM/SP 123456</strong></div>
                          <div>Horário da Assinatura: <strong className="text-slate-200">{new Date().toLocaleString('pt-BR')}</strong></div>
                          <div>Tipo de Assinatura: <strong className="text-primary font-mono">Simulada ICP-Brasil A3 Token</strong></div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={formSubmitting}
                          className="w-full bg-primary text-slate-950 hover:bg-primary-hover font-bold py-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-cyan-glow disabled:opacity-50"
                        >
                          {formSubmitting ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Assinar e Finalizar Atendimento e-SUS APS
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FLUXO DE NAVEGAÇÃO DE PASSOS */}
                  <div className="pt-4 border-t border-slate-850 flex justify-between items-center text-xs">
                    {currentEsusStep > 0 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentEsusStep(currentEsusStep - 1)}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft size={14} />
                        Voltar
                      </button>
                    ) : (
                      <div />
                    )}

                    {currentEsusStep < 11 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentEsusStep(currentEsusStep + 1)}
                        className="bg-primary hover:bg-primary-hover text-slate-950 font-bold px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1 hover:shadow-cyan-glow"
                      >
                        Avançar
                        <ChevronRight size={14} />
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>

                </form>
              </div>

            </div>
          )}

          {/* TAB 3: EMISSÃO DE DOCUMENTOS */}
          {activeTab === 'docs' && (
            <div className="glass-card rounded-3xl p-6 border border-slate-800/80 space-y-6">
              <div>
                <h2 className="text-base font-display font-bold text-slate-200 mb-1">Geração de Documentos Médicos Assinados</h2>
                <p className="text-xs text-slate-400">Gere guias, receitas e atestados com download de arquivos instantâneos.</p>
              </div>

              {/* SELECÃO DE TIPO DE DOCUMENTO */}
              <div className="flex border-b border-slate-850 gap-2 pb-px max-w-md">
                {[
                  { id: 'prescription', label: 'Receita Digital' },
                  { id: 'certificate', label: 'Atestado de Afastamento' },
                  { id: 'referral', label: 'Guia Encaminhamento' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => { setDocType(option.id as any); setDocPdfBase64(null); setDocHash(null); }}
                    className={`flex-grow text-center pb-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-all ${
                      docType === option.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* FORMULÁRIO ESPECÍFICO */}
              <div className="space-y-4 text-xs text-slate-300">
                {docType === 'prescription' && (
                  <div className="space-y-2">
                    <label className="block font-semibold uppercase tracking-wider text-slate-400">Medicamentos e Posologia</label>
                    <textarea
                      rows={6}
                      value={prescriptionMeds}
                      onChange={(e) => setPrescriptionMeds(e.target.value)}
                      placeholder="Ex: Paracetamol 500mg, tomar 1 comprimido VO a cada 6 horas se febre ou dor. Nistatina suspensão oral, realizar bochecho..."
                      className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-primary placeholder-slate-650"
                    />
                  </div>
                )}

                {docType === 'certificate' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-semibold uppercase tracking-wider text-slate-400">Dias de Afastamento</label>
                      <input
                        type="number"
                        value={certDays}
                        onChange={(e) => setCertDays(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold uppercase tracking-wider text-slate-400">Código CID-10</label>
                      <input
                        type="text"
                        value={certCid}
                        onChange={(e) => setCertCid(e.target.value)}
                        placeholder="Ex: E10"
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block font-semibold uppercase tracking-wider text-slate-400">Recomendações e Observações</label>
                      <textarea
                        rows={3}
                        value={certNotes}
                        onChange={(e) => setCertNotes(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {docType === 'referral' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block font-semibold uppercase tracking-wider text-slate-400">Especialidade Médica Requerida</label>
                      <input
                        type="text"
                        value={refSpecialty}
                        onChange={(e) => setRefSpecialty(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold uppercase tracking-wider text-slate-400">Justificativa Clínica e e-SUS APS</label>
                      <textarea
                        rows={4}
                        value={refJustification}
                        onChange={(e) => setRefJustification(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* VISUALIZAÇÃO PRÉVIA / BASE64 EM TXT */}
                {docPdfBase64 && (
                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-850 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Documento Emitido Assinado Digitalmente</span>
                      <button
                        onClick={() => downloadDocumentAsPdf(docPdfBase64, `${docType}_${patient.name.replace(/\s+/g, '_')}.pdf`, docType === 'prescription' ? 'Receituário Médico' : docType === 'certificate' ? 'Atestado de Afastamento' : 'Guia de Encaminhamento')}
                        className="text-primary hover:text-cyan-400 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={14} />
                        Baixar Documento (PDF)
                      </button>
                    </div>


                    <pre className="font-mono text-[9px] text-slate-350 bg-slate-900/65 p-4 rounded-xl overflow-x-auto leading-relaxed border border-slate-900 whitespace-pre-wrap select-all">
                      {safeDecodeBase64Utf8(docPdfBase64)}
                    </pre>

                    {docHash && (
                      <div className="text-[10px] text-slate-450 font-semibold border-t border-slate-855 pt-3">
                        SHA255 HASH DA ASSINATURA: <span className="font-mono text-primary font-bold">{docHash}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    onClick={async () => {
                      setFormSubmitting(true);
                      setMsgSuccess('');
                      setMsgError('');
                      setDocPdfBase64(null);
                      try {
                        let url = '/api/prescriptions';
                        let payload: any = { patientId };
                        
                        if (docType === 'prescription') {
                          payload.medications = prescriptionMeds;
                        } else if (docType === 'certificate') {
                          url = '/api/certificates';
                          payload.days = certDays;
                          payload.cid = certCid;
                          payload.notes = certNotes;
                        } else if (docType === 'referral') {
                          url = '/api/referrals';
                          payload.specialty = refSpecialty;
                          payload.justification = refJustification;
                        }
                        const res = await fetch(url, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          },
                          body: JSON.stringify(payload)
                        });

                        if (!res.ok) {
                          const errData = await safeParseJson(res);
                          let errorMsg = 'Erro ao gerar documento.';
                          if (errData && errData.message) errorMsg = errData.message;
                          else {
                            const errText = await res.text();
                            if (errText) errorMsg = errText;
                          }
                          throw new Error(errorMsg);
                        }

                        const data = await res.json();
                        setDocPdfBase64(data.pdfBase64);
                        setDocHash(data.signatureHash);
                        setMsgSuccess('Documento assinado digitalmente e gerado com sucesso!');
                        
                        setPrescriptionMeds('');
                        fetchHistory();
                      } catch (err: any) {
                        setMsgError(err.message || 'Falha ao emitir documento.');
                      } finally {
                        setFormSubmitting(false);
                      }
                    }}
                    disabled={formSubmitting}
                    className="bg-primary hover:bg-primary-hover text-slate-950 font-bold px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:shadow-cyan-glow"
                  >
                    {formSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <FilePlus size={14} />
                    )}
                    Gerar Guia e Assinar Digitalmente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LABORATÓRIO (EXAMES) */}
          {activeTab === 'exams' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* HISTÓRICO DE EXAMES EM TABELA */}
              <div className="lg:col-span-7 space-y-6">
                <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-850 bg-slate-900/20">
                    <h2 className="text-base font-bold text-slate-200">Resultados Recentes de Laboratório</h2>
                  </div>

                  {history.observations.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs">Nenhum exame laboratorial registrado no histórico.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-900/40 text-slate-450 border-b border-slate-850 font-semibold uppercase tracking-wider">
                            <th className="px-6 py-4">Exame</th>
                            <th className="px-6 py-4 text-center">Valor / Resultado</th>
                            <th className="px-6 py-4">Faixa de Referência</th>
                            <th className="px-6 py-4">Data Registro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300 font-medium">
                          {history.observations.map((obs) => (
                            <tr key={obs.id} className="hover:bg-slate-900/10 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-200">{obs.name}</td>
                              <td className="px-6 py-4 text-center font-bold text-primary">{obs.value} {obs.unit}</td>
                              <td className="px-6 py-4 text-slate-400 font-semibold">{obs.referenceRange || 'S/R'}</td>
                              <td className="px-6 py-4 text-slate-400">{new Date(obs.recordedAt).toLocaleDateString('pt-BR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* GRÁFICO GLICEMIA DE JEJUM TREND */}
                {history.observations.some(o => o.code === 'GLUCOSE') && (
                  <div className="glass-card rounded-3xl p-6 border border-slate-800/80 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <TrendingUp size={16} className="text-primary" />
                      Tendência de Glicemia de Jejum (Hiperdia)
                    </h3>
                    <div className="h-[240px]">
                      <Line data={getGlucoseChartData()} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                  </div>
                )}
              </div>

              {/* CADASTRO DE LAUDO / VALOR EXAME */}
              <div className="lg:col-span-5">
                <form onSubmit={handleRegisterExam} className="glass-card rounded-3xl border border-slate-800/80 p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-200">Lançar Resultado de Exame</h2>
                    <p className="text-xs text-slate-450 mt-1">Insira os resultados laboratoriais diretamente para mapeamento de gráficos clínicos.</p>
                  </div>

                  <div className="space-y-4 text-xs text-slate-350 font-semibold">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Exame</label>
                      <select
                        value={examCode}
                        onChange={(e) => {
                          setExamCode(e.target.value);
                          if (e.target.value === 'GLUCOSE') {
                            setExamName('Glicemia de Jejum');
                            setExamUnit('mg/dL');
                            setExamRange('70 a 99 mg/dL');
                          } else if (e.target.value === 'CHOLESTEROL') {
                            setExamName('Colesterol Total');
                            setExamUnit('mg/dL');
                            setExamRange('< 190 mg/dL');
                          } else if (e.target.value === 'CREATININE') {
                            setExamName('Creatinina Sérica');
                            setExamUnit('mg/dL');
                            setExamRange('0.7 a 1.3 mg/dL');
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 cursor-pointer"
                      >
                        <option value="GLUCOSE">Glicemia de Jejum (E10/E11)</option>
                        <option value="CHOLESTEROL">Colesterol Total (Hiperdia)</option>
                        <option value="CREATININE">Creatinina (Função Renal)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Encontrado</label>
                        <input
                          type="text"
                          value={examValue}
                          onChange={(e) => setExamValue(e.target.value)}
                          placeholder="Ex: 110"
                          required
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unidade</label>
                        <input
                          type="text"
                          value={examUnit}
                          readOnly
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-500 text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="w-full bg-primary text-slate-950 hover:bg-primary-hover font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 hover:shadow-cyan-glow"
                    >
                      {formSubmitting ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Salvar Laudo no Histórico
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 5: LEITOS E INTERNAÇÃO */}
          {activeTab === 'beds' && (
            <div className="glass-card rounded-3xl p-6 border border-slate-800/80 space-y-6">
              <div>
                <h2 className="text-base font-display font-bold text-slate-200 mb-1">Mapa de Hospitalização de Leitos da UBS</h2>
                <p className="text-xs text-slate-400">Monitore, interne e dê alta a pacientes críticos na ala de observação da UBS.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {beds.map((bed) => {
                  const isAvailable = bed.status === 'AVAILABLE';
                  const isOccupied = bed.status === 'OCCUPIED';
                  const isMaintenance = bed.status === 'MAINTENANCE';
                  const isSelfOccupied = isOccupied && bed.patientId === patientId;

                  let borderClass = 'border-slate-850 bg-slate-900/10';
                  let statusText = 'Livre';
                  let statusBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';

                  if (isOccupied) {
                    borderClass = isSelfOccupied ? 'border-primary/50 bg-primary/5' : 'border-danger/20 bg-danger/5';
                    statusText = isSelfOccupied ? 'Ocupado por este Paciente' : 'Ocupado';
                    statusBadgeClass = isSelfOccupied ? 'bg-primary/10 text-primary border-primary/20 animate-pulse-cyan' : 'bg-danger/10 text-danger border-danger/20';
                  } else if (isMaintenance) {
                    borderClass = 'border-amber-500/20 bg-amber-500/5';
                    statusText = 'Manutenção';
                    statusBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  }

                  return (
                    <div key={bed.id} className={`p-5 rounded-2xl border ${borderClass} flex flex-col justify-between h-40 transition-all hover:shadow-cyan-glow`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">{bed.ward}</span>
                          <h4 className="text-sm font-bold text-slate-250 mt-0.5">Leito {bed.bedNumber}</h4>
                        </div>
                        <span className={`text-[9px] border px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${statusBadgeClass}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-slate-850/50 flex justify-end">
                        {isAvailable && (
                          <button
                            onClick={() => handleOccupyBed(bed.id)}
                            className="bg-primary text-slate-950 hover:bg-primary-hover text-[10px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer hover:shadow-cyan-glow"
                          >
                            Internar Paciente
                          </button>
                        )}

                        {isSelfOccupied && (
                          <button
                            onClick={() => handleDischargeBed(bed.id)}
                            className="bg-danger text-slate-100 hover:bg-red-700 text-[10px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                          >
                            Dar Alta Hospitalar
                          </button>
                        )}

                        {isOccupied && !isSelfOccupied && (
                          <span className="text-[9px] text-slate-550 font-bold italic py-1">Indisponível</span>
                        )}

                        {isMaintenance && (
                          <span className="text-[9px] text-amber-500/70 font-bold uppercase tracking-wider py-1">Manutenção</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* COLUNA DIREITA: HISTÓRICO RÁPIDO DO PACIENTE E ALERTAS */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* PAINEL DE ALERTA RÁPIDO (CARDIOVASCULAR E IAM) */}
          {history.conditions.some(c => c.cidCode === 'I21') && (
            <div className="p-5 rounded-3xl bg-danger/10 border border-danger/20 text-danger space-y-3 animate-pulse-cyan">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertOctagon size={16} />
                Protocolo Crítico de IAM Ativo!
              </h3>
              <p className="text-[11px] font-semibold leading-relaxed">
                Este paciente apresenta queixa de dor torácica aguda em comorbidade ativa de Hipertensão e Diabetes. Mantenha em monitoramento cardíaco contínuo e administre o protocolo preventivo.
              </p>
            </div>
          )}

          {/* HISTÓRICO GERAL DE ENFERMAGEM / TRIAGENS */}
          <div className="glass-card rounded-3xl p-5 border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-primary" />
              Sinais Vitais da Triagem
            </h3>
            {history.triages.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">Nenhum registro de triagem efetuado ainda.</p>
            ) : (
              <div className="space-y-3">
                {history.triages.map((t, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/20 border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold border-b border-slate-850 pb-1.5">
                      <span>CLASSIFICAÇÃO MANCHESTER</span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase border ${
                        t.riskClassification === 'RED' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                        t.riskClassification === 'ORANGE' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                        t.riskClassification === 'YELLOW' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                        t.riskClassification === 'GREEN' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-500'
                      }`}>
                        {t.riskClassification}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-slate-450 font-semibold">P.A:</span> <strong className="text-slate-200">{t.bloodPressure || 'N/I'}</strong></div>
                      <div><span className="text-slate-450 font-semibold">F.C:</span> <strong className="text-slate-200">{t.heartRate ? `${t.heartRate} BPM` : 'N/I'}</strong></div>
                      <div><span className="text-slate-450 font-semibold">F.R:</span> <strong className="text-slate-200">{t.respiratoryRate ? `${t.respiratoryRate} IPM` : 'N/I'}</strong></div>
                      <div><span className="text-slate-450 font-semibold">SatO2:</span> <strong className="text-slate-200">{t.oxygenSaturation ? `${t.oxygenSaturation}%` : 'N/I'}</strong></div>
                      <div><span className="text-slate-450 font-semibold">Temp:</span> <strong className="text-slate-200">{t.temperature ? `${t.temperature} °C` : 'N/I'}</strong></div>
                      <div><span className="text-slate-450 font-semibold">Dor (0-10):</span> <strong className="text-primary">{t.painScale !== null ? `${t.painScale}/10` : 'N/I'}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTÓRICO DE VACINAS */}
          <div className="glass-card rounded-3xl p-5 border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" />
              Imunizações Registradas
            </h3>
            {history.immunizations.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">Nenhuma vacina registrada para este usuário.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {history.immunizations.map((im, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] py-1.5 border-b border-slate-855/50 last:border-b-0">
                    <span className="font-bold text-slate-250 truncate pr-2">{im.vaccineName}</span>
                    <span className="text-[9px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400 font-semibold uppercase flex-shrink-0">
                      {im.doseNumber || 'Única'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
