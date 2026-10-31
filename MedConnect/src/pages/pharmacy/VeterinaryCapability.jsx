import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import {
  validarRegistroMapa,
  validarCrmv,
  validarCrf,
  UFS_BRASIL
} from '@medconnect/validation';
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  UploadCloud,
  FileText,
  Trash2,
  ArrowRight,
  ExternalLink,
  Loader2,
  Building2,
  UserCheck
} from 'lucide-react';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function VeterinaryCapability() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { vetEnabled, isLoading: loadingConfig } = usePublicConfig();

  const [formData, setFormData] = useState({
    mapaRegistrationNumber: '',
    crmvCompanyRegistration: '',
    crmvCompanyUf: 'SP',
    technicalResponsibleName: '',
    technicalResponsibleCrf: '',
    technicalResponsibleCrfUf: 'SP'
  });

  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  // Consulta capacidades regulatórias da farmácia
  const {
    data: capabilities = [],
    isLoading: loadingCapabilities,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['myCapabilities'],
    queryFn: async () => {
      const res = await api.get('/pharmacy/capabilities');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: vetEnabled
  });

  // Mutação para solicitar habilitação veterinária
  const requestMutation = useMutation({
    mutationFn: async (dataPayload) => {
      const form = new FormData();
      form.append('mapaRegistrationNumber', dataPayload.mapaRegistrationNumber.trim());
      form.append('crmvCompanyRegistration', dataPayload.crmvCompanyRegistration.trim());
      form.append('crmvCompanyUf', dataPayload.crmvCompanyUf);
      form.append('technicalResponsibleName', dataPayload.technicalResponsibleName.trim());
      form.append('technicalResponsibleCrf', dataPayload.technicalResponsibleCrf.trim());
      form.append('technicalResponsibleCrfUf', dataPayload.technicalResponsibleCrfUf);

      for (const file of evidenceFiles) {
        form.append('evidences', file);
      }

      const res = await api.post('/pharmacy/capabilities/veterinary', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCapabilities'] });
      queryClient.invalidateQueries({ queryKey: ['availablePrescriptions'] });
      setFormError('');
      setEvidenceFiles([]);
      setShowResubmitForm(false);
    },
    onError: (err) => {
      const errData = err?.response?.data?.error;
      const msg =
        (typeof errData === 'string' ? errData : errData?.message) ||
        'Falha ao enviar solicitação de habilitação veterinária.';
      setFormError(msg);
    }
  });

  if (loadingConfig || (vetEnabled && loadingCapabilities)) {
    return <LoadingState message="Carregando informações regulatórias..." />;
  }

  // Fail-closed se VET_ENABLED estiver desativado
  if (!vetEnabled) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={44} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
            Habilitação Veterinária Indisponível
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
            A plataforma MedConnect ainda não está recebendo prescrições veterinárias nesta região.
          </p>
          <button className="btn btn-outline" onClick={() => navigate('/pharmacy')}>
            Voltar ao Painel Principal
          </button>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <ErrorState
          title="Erro ao carregar dados de habilitação"
          message={error?.message || 'Não foi possível consultar suas credenciais sanitárias.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const vetCap = capabilities.find((c) => c.type === 'VETERINARY_COMPOUNDING');

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter((file) => {
        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        const isImage = file.type.startsWith('image/');
        return isPdf || isImage;
      });

      if (validFiles.length < filesArray.length) {
        setFormError('Apenas arquivos PDF, JPEG ou PNG são aceitos como evidência regulatória.');
      } else {
        setFormError('');
      }

      setEvidenceFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    }
  };

  const handleRemoveFile = (index) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.mapaRegistrationNumber.trim() || !validarRegistroMapa(formData.mapaRegistrationNumber.trim())) {
      setFormError('Informe um Registro MAPA válido no formato padrão (ex: SP-12345-6 ou número oficial).');
      return;
    }

    if (
      !formData.crmvCompanyRegistration.trim() ||
      !validarCrmv(formData.crmvCompanyRegistration.trim(), formData.crmvCompanyUf)
    ) {
      setFormError('Registro da empresa no CRMV e UF válida são obrigatórios.');
      return;
    }

    if (!formData.technicalResponsibleName.trim()) {
      setFormError('O nome do Farmacêutico Responsável Técnico é obrigatório.');
      return;
    }

    if (
      !formData.technicalResponsibleCrf.trim() ||
      !validarCrf(formData.technicalResponsibleCrf.trim(), formData.technicalResponsibleCrfUf)
    ) {
      setFormError('CRF e UF do Responsável Técnico são obrigatórios e devem ter formato válido.');
      return;
    }

    if (evidenceFiles.length === 0) {
      setFormError('É obrigatório anexar ao menos 1 documento comprobatório (licença MAPA, CRMV PJ ou CRF).');
      return;
    }

    setIsSubmitting(true);
    requestMutation.mutate(formData, {
      onSettled: () => setIsSubmitting(false)
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-8" style={{ padding: '24px 16px' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Habilitação para Manipulação Veterinária
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Capacidade regulatória MAPA e CRMV (Decreto nº 5.053/2004 e Instrução Normativa MAPA nº 11/2005)
              </p>
            </div>
          </div>
        </div>

        {vetCap?.status === 'VERIFIED' && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/pharmacy/requests')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Ver Receitas Veterinárias <ArrowRight size={16} />
          </button>
        )}
      </div>

      {/* CARD DE STATUS ATUAL (se já existe solicitação) */}
      {vetCap && !showResubmitForm && (
        <div className="glass-card animate-slide-up" style={{ padding: '28px', background: 'white' }}>
          {/* Status: PENDING_VERIFICATION */}
          {vetCap.status === 'PENDING_VERIFICATION' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(234, 179, 8, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Clock size={26} color="#d97706" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Solicitação em Análise pelo Administrador
                    </h2>
                    <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                      EM VERIFICAÇÃO
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
                    Enviada em {new Date(vetCap.createdAt).toLocaleDateString('pt-BR')} às {new Date(vetCap.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div style={{
                background: '#f8fafc', padding: '16px', borderRadius: '12px',
                border: '1px solid #e2e8f0', marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  O que acontece agora?
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                  <li>O administrador do MedConnect confere os documentos enviados e a regularidade do registro no MAPA.</li>
                  <li>A inscrição da empresa no CRMV e a regularidade do Responsável Técnico no CRF são conferidas no checklist regulatório.</li>
                  <li>Assim que homologada, o mural veterinário será liberado automaticamente para envio de cotações.</li>
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Registro MAPA:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{vetCap.mapaRegistrationNumber}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>CRMV Empresa:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{vetCap.crmvCompanyRegistration}/{vetCap.crmvCompanyUf}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Responsável Técnico:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {vetCap.technicalResponsibleName} (CRF {vetCap.technicalResponsibleCrf}/{vetCap.technicalResponsibleCrfUf})
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Evidências Anexadas:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {vetCap.evidenceFileKeys?.length || 0} documento(s) em cofre privado
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status: VERIFIED */}
          {vetCap.status === 'VERIFIED' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircle2 size={28} color="#10b981" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Habilitação Veterinária Ativa e Homologada
                    </h2>
                    <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                      VERIFICADA
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
                    Homologada pelo Administrador em {vetCap.verifiedAt ? new Date(vetCap.verifiedAt).toLocaleDateString('pt-BR') : 'Data recente'}
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '20px' }}>
                Sua farmácia está devidamente credenciada para manipular formulações para animais de companhia.
                Você já pode visualizar o mural de receitas veterinárias e enviar propostas orçamentárias diretamente aos tutores.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/pharmacy/requests')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Ir para Mural de Oportunidades <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Status: REJECTED */}
          {vetCap.status === 'REJECTED' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <XCircle size={28} color="#ef4444" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Solicitação Recusada pelo Administrador
                    </h2>
                    <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                      RECUSADA
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
                    Avaliada em {new Date(vetCap.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div style={{
                background: '#fef2f2', padding: '16px', borderRadius: '12px',
                border: '1px solid #fecaca', marginBottom: '20px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Motivo Informado pela Equipe Regulatória:
                </span>
                <p style={{ fontSize: '14px', color: '#7f1d1d', margin: 0, fontWeight: 600 }}>
                  "{vetCap.rejectionReason || 'Documentação ilegível ou registro com divergência cadastral.'}"
                </p>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                Você pode revisar seus dados e submeter uma nova solicitação acompanhada dos documentos retificados.
              </p>

              <button
                className="btn btn-primary"
                onClick={() => {
                  setFormData({
                    mapaRegistrationNumber: vetCap.mapaRegistrationNumber || '',
                    crmvCompanyRegistration: vetCap.crmvCompanyRegistration || '',
                    crmvCompanyUf: vetCap.crmvCompanyUf || 'SP',
                    technicalResponsibleName: vetCap.technicalResponsibleName || '',
                    technicalResponsibleCrf: vetCap.technicalResponsibleCrf || '',
                    technicalResponsibleCrfUf: vetCap.technicalResponsibleCrfUf || 'SP'
                  });
                  setShowResubmitForm(true);
                }}
              >
                Reenviar Solicitação com Correções
              </button>
            </div>
          )}

          {/* Status: SUSPENDED */}
          {vetCap.status === 'SUSPENDED' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(217, 119, 6, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Ban size={28} color="#d97706" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Capacidade de Manipulação Veterinária Suspensa
                    </h2>
                    <span className="badge" style={{ background: '#ffedd5', color: '#c2410c', fontWeight: 700 }}>
                      SUSPENSA
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
                    Ação administrativa aplicada em {new Date(vetCap.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div style={{
                background: '#fffbeb', padding: '16px', borderRadius: '12px',
                border: '1px solid #fde68a', marginBottom: '20px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Motivo da Suspensão:
                </span>
                <p style={{ fontSize: '14px', color: '#78350f', margin: 0, fontWeight: 600 }}>
                  "{vetCap.rejectionReason || 'Suspensão cautelar administrativa preventiva.'}"
                </p>
              </div>

              <div style={{
                background: '#f8fafc', padding: '16px', borderRadius: '12px',
                border: '1px solid #e2e8f0', marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Regras Aplicáveis à Suspensão (Art. 3.3):
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                  <li>Sua farmácia não recebe novas receitas veterinárias no mural.</li>
                  <li>Novas cotações veterinárias estão temporariamente bloqueadas.</li>
                  <li><strong>Pedidos e cotações já aprovados anteriormente seguem seu fluxo normal de produção e entrega</strong>, garantindo o tratamento contínuo dos animais.</li>
                </ul>
              </div>

              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Para regularizar a situação ou contestar a suspensão, entre em contato com o suporte regulatório: <strong>suporte@medconnect.com.br</strong>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO / REENVIO */}
      {(!vetCap || showResubmitForm) && (
        <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{ padding: '28px', background: 'white' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            {showResubmitForm ? 'Reenvio de Documentação Sanitária' : 'Solicitar Habilitação VETERINARY_COMPOUNDING'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
            Preencha os dados regulatórios e anexe as certidões necessárias para conferência pelo comitê regulatório.
          </p>

          {formError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '12px 16px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Registro MAPA */}
            <div>
              <label htmlFor="mapa-registration-input" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Número de Registro no MAPA *
              </label>
              <input
                id="mapa-registration-input"
                type="text"
                className="form-input"
                placeholder="Ex: SP-12345-6 ou 000123/2020"
                value={formData.mapaRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, mapaRegistrationNumber: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Conforme conste no certificado expedido pelo Ministério da Agricultura e Pecuária.
              </span>
            </div>

            {/* CRMV PJ */}
            <div>
              <label htmlFor="crmv-company-input" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Registro da Empresa no CRMV e UF *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="crmv-company-input"
                  type="text"
                  className="form-input"
                  placeholder="Ex: 12345-J"
                  value={formData.crmvCompanyRegistration}
                  onChange={(e) => setFormData({ ...formData, crmvCompanyRegistration: e.target.value })}
                  required
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                />
                <select
                  value={formData.crmvCompanyUf}
                  onChange={(e) => setFormData({ ...formData, crmvCompanyUf: e.target.value })}
                  style={{ width: '80px', padding: '10px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                >
                  {UFS_BRASIL.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* RT Nome */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="rt-name-input" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nome do Responsável Técnico (Farmacêutico) *
              </label>
              <input
                id="rt-name-input"
                type="text"
                className="form-input"
                placeholder="Ex: Dr. Roberto Guimarães"
                value={formData.technicalResponsibleName}
                onChange={(e) => setFormData({ ...formData, technicalResponsibleName: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
              />
            </div>

            {/* CRF RT */}
            <div>
              <label htmlFor="rt-crf-input" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                CRF do Responsável Técnico e UF *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="rt-crf-input"
                  type="text"
                  className="form-input"
                  placeholder="Ex: 65432"
                  value={formData.technicalResponsibleCrf}
                  onChange={(e) => setFormData({ ...formData, technicalResponsibleCrf: e.target.value })}
                  required
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                />
                <select
                  value={formData.technicalResponsibleCrfUf}
                  onChange={(e) => setFormData({ ...formData, technicalResponsibleCrfUf: e.target.value })}
                  style={{ width: '80px', padding: '10px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                >
                  {UFS_BRASIL.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Upload de Evidências */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Documentos de Evidência Sanitária (Upload Privado) *
            </label>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              Anexe certificados em PDF, JPEG ou PNG (Certificado MAPA, Certidão CRMV PJ, CRT do Farmacêutico).
              Máximo de 5 arquivos.
            </p>

            <div style={{
              border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '24px',
              textAlign: 'center', background: '#f8fafc', cursor: 'pointer'
            }}>
              <input
                id="evidence-upload"
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="evidence-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <UploadCloud size={36} color="#0284c7" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Clique para selecionar documentos comprobatórios
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  PDF, PNG ou JPG (até 10 MB por arquivo)
                </span>
              </label>
            </div>

            {evidenceFiles.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {evidenceFiles.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <FileText size={16} color="#0284c7" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }} className="truncate">
                        {file.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            {showResubmitForm && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowResubmitForm(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Transmitindo documentos ao comitê...
                </>
              ) : (
                'Enviar Solicitação para Conferência'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
