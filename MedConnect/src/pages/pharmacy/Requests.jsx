import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import {
  Clock,
  MapPin,
  Eye,
  Send,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { usePublicConfig } from '../../hooks/usePublicConfig';

const SPECIES_LABELS = {
  DOG: 'Canina (Cão)',
  CAT: 'Felina (Gato)',
  BIRD: 'Ave',
  REPTILE: 'Réptil',
  SMALL_MAMMAL: 'Pequeno Mamífero',
  EQUINE: 'Equina (Cavalo)'
};

export default function Requests() {
  const navigate = useNavigate();
  const { vetEnabled } = usePublicConfig();

  const [requests, setRequests] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [kindFilter, setKindFilter] = useState('ALL'); // 'ALL' | 'HUMAN' | 'VETERINARY'

  const fetchCapabilities = useCallback(async () => {
    if (!vetEnabled) return [];
    try {
      const res = await api.get('/pharmacy/capabilities');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }, [vetEnabled]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [reqRes, caps] = await Promise.all([
        api.get('/prescriptions/pharmacy'),
        fetchCapabilities()
      ]);

      setCapabilities(caps);

      if (Array.isArray(reqRes.data)) {
        const formatted = reqRes.data.map((p) => {
          const isQuoted = p.quotes && p.quotes.length > 0;
          const myQuote = isQuoted ? p.quotes[0] : null;
          const isVet = p.kind === 'VETERINARY';

          const patientName = isVet
            ? (p.animal?.name || 'Animal Paciente')
            : (p.patient?.anonymousId || 'Paciente Anônimo');

          const initials = isVet ? 'PET' : 'PA';

          // Idade aproximada em anos/meses
          let ageFormatted = null;
          const months = p.approximateAgeMonths ?? p.animal?.approximateAgeMonths;
          if (typeof months === 'number') {
            if (months < 12) {
              ageFormatted = `${months} ${months === 1 ? 'mês' : 'meses'}`;
            } else {
              const years = Math.floor(months / 12);
              const remainingMonths = months % 12;
              ageFormatted = remainingMonths > 0
                ? `${years}a ${remainingMonths}m`
                : `${years} ${years === 1 ? 'ano' : 'anos'}`;
            }
          }

          // Peso em kg
          const weightG = p.weightGrams ?? p.animal?.weightGrams;
          const weightKgFormatted = typeof weightG === 'number'
            ? `${(weightG / 1000).toFixed(2).replace('.', ',')} kg`
            : null;

          return {
            id: p.id,
            kind: p.kind || 'HUMAN',
            user: {
              name: patientName,
              initials: initials
            },
            animal: p.animal || null,
            speciesLabel: isVet ? (SPECIES_LABELS[p.species || p.animal?.species] || p.species || 'Animal') : null,
            breed: p.animal?.breed || 'SRD',
            weightKgFormatted,
            ageFormatted,
            prescriber: p.prescriber || null,
            requiresManualDocumentCheck: Boolean(p.requiresManualDocumentCheck),
            pharmaceuticalForm: p.pharmaceuticalForm || null,
            flavoring: p.flavoring || null,
            location: isVet ? 'Região do Tutor (Oculta até aprovação)' : 'Região do Paciente (Oculta até aprovação)',
            prescription: isVet ? 'Fórmula Magistral Veterinária' : 'Fórmula Médica Solicitada',
            medications: [p.notes || (isVet ? 'Fórmula sob prescrição veterinária' : 'Fórmula sob prescrição médica')],
            createdAt: new Date(p.createdAt).toLocaleDateString('pt-BR'),
            status: isQuoted ? 'quoted' : 'pending',
            quotedPrice: myQuote?.price || 0,
            fileUrl: null
          };
        });
        setRequests(formatted);
      } else {
        setRequests([]);
      }
    } catch (err) {
      const errData = err?.response?.data?.error;
      const msg =
        (typeof errData === 'string' ? errData : errData?.message) ||
        'Não foi possível carregar as oportunidades de receita. Tente novamente.';
      setError(msg);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [fetchCapabilities]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const vetCap = capabilities.find((c) => c.type === 'VETERINARY_COMPOUNDING');
  const isVetVerified = vetCap?.status === 'VERIFIED';

  // Filtragem combinada por status de cotação e tipo de receita
  const filtered = requests.filter((r) => {
    const matchStatus = activeTab === 'pending' ? r.status === 'pending' : r.status === 'quoted';
    if (!matchStatus) return false;

    if (kindFilter === 'HUMAN') return r.kind === 'HUMAN';
    if (kindFilter === 'VETERINARY') return r.kind === 'VETERINARY';
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const quotedCount = requests.filter((r) => r.status === 'quoted').length;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header / Filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
            Mural de Oportunidades
          </h2>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginTop: 2 }}>
            Receitas de pacientes e animais aguardando propostas de manipulação
          </p>
        </div>

        {/* Tabs de Status */}
        <div className="glass-tab-container" style={{ width: 'auto', minWidth: '280px' }}>
          <button
            type="button"
            className={`glass-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            type="button"
            className={`glass-tab ${activeTab === 'quoted' ? 'active' : ''}`}
            onClick={() => setActiveTab('quoted')}
          >
            Cotadas ({quotedCount})
          </button>
        </div>
      </div>

      {/* Seletor de Tipo (Humano / Veterinário) visível apenas se VET_ENABLED */}
      {vetEnabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-700)' }}>
            Filtrar Tipo:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn ${kindFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={() => setKindFilter('ALL')}
            >
              Todas
            </button>
            <button
              type="button"
              className={`btn ${kindFilter === 'HUMAN' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={() => setKindFilter('HUMAN')}
            >
              Humanas
            </button>
            <button
              type="button"
              className={`btn ${kindFilter === 'VETERINARY' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setKindFilter('VETERINARY')}
            >
              Veterinárias
              {isVetVerified && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Banner de Explicação / Bloqueio quando a farmácia escolhe o filtro veterinário sem ser VERIFIED */}
      {vetEnabled && kindFilter === 'VETERINARY' && !isVetVerified && (
        <div className="glass-card animate-slide-up" style={{
          padding: '28px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
          border: '1.5px solid #bae6fd',
          borderRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: '#0284c7', color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <ShieldCheck size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Habilitação Sanitária Veterinária Necessária
                </h3>
                {vetCap?.status && (
                  <span className="badge" style={{
                    background: vetCap.status === 'PENDING_VERIFICATION' ? '#fef3c7' : '#fee2e2',
                    color: vetCap.status === 'PENDING_VERIFICATION' ? '#b45309' : '#b91c1c',
                    fontWeight: 700, fontSize: '11px'
                  }}>
                    {vetCap.status === 'PENDING_VERIFICATION'
                      ? 'EM ANÁLISE'
                      : vetCap.status === 'SUSPENDED'
                        ? 'SUSPENSA'
                        : 'RECUSADA'}
                  </span>
                )}
              </div>

              {vetCap?.status === 'PENDING_VERIFICATION' ? (
                <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: '6px 0 16px' }}>
                  Sua solicitação de capacidade veterinária (Registro MAPA {vetCap.mapaRegistrationNumber}) já foi enviada e está sob conferência documental pelo administrador. Assim que verificada, você poderá visualizar e cotar receitas veterinárias aqui.
                </p>
              ) : vetCap?.status === 'SUSPENDED' ? (
                <p style={{ fontSize: '13px', color: '#b45309', lineHeight: 1.5, margin: '6px 0 16px', fontWeight: 600 }}>
                  Sua habilitação veterinária foi suspensa administrativamente: "{vetCap.rejectionReason || 'Suspensão cautelar'}". Novos orçamentos veterinários estão bloqueados, mas pedidos existentes seguem seu curso.
                </p>
              ) : vetCap?.status === 'REJECTED' ? (
                <p style={{ fontSize: '13px', color: '#b91c1c', lineHeight: 1.5, margin: '6px 0 16px', fontWeight: 600 }}>
                  Sua solicitação anterior foi recusada: "{vetCap.rejectionReason}". É necessário reenviar os documentos retificados para liberar o mural.
                </p>
              ) : (
                <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: '6px 0 16px' }}>
                  Conforme as normas do MAPA (Decreto nº 5.053/2004 e IN nº 11/2005) e do CRMV, para receber e manipular formulações veterinárias sua farmácia precisa comprovar o Registro no MAPA, CRMV da empresa e RT farmacêutico habilitado.
                </p>
              )}

              <button
                className="btn btn-primary"
                onClick={() => navigate('/pharmacy/veterinary-capability')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
              >
                {vetCap ? 'Ver Detalhes da Habilitação' : 'Solicitar Habilitação MAPA/CRMV'}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests Area */}
      {loading ? (
        <LoadingState message="Carregando receitas para cotação..." />
      ) : error ? (
        <ErrorState
          title="Erro ao carregar receitas"
          message={error}
          onRetry={fetchRequests}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`Nenhuma receita ${activeTab === 'pending' ? 'pendente' : 'cotada'}`}
          description={
            kindFilter === 'VETERINARY' && !isVetVerified
              ? 'Habilite sua farmácia para manipulação veterinária para receber oportunidades de pets.'
              : 'Novas solicitações de pacientes e tutores aparecerão aqui em tempo real.'
          }
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 'var(--space-5)'
        }}>
          {filtered.map((req) => {
            const isVet = req.kind === 'VETERINARY';

            return (
              <div
                key={req.id}
                className="glass-card animate-slide-up"
                style={{
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  borderTop: isVet ? '4px solid #0284c7' : '4px solid #0d9488'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: isVet
                      ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
                      : 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)',
                    color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, fontSize: isVet ? '11px' : '15px',
                    boxShadow: isVet ? '0 4px 12px rgba(2, 132, 199, 0.25)' : '0 4px 12px rgba(13, 148, 136, 0.2)'
                  }}>
                    {req.user.initials}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ fontWeight: 800, fontSize: 'var(--font-base)', color: 'var(--gray-900)', margin: 0 }} className="truncate">
                        {req.user.name}
                      </h4>
                      {/* Selo Humano vs Veterinário */}
                      <span style={{
                        background: isVet ? '#e0f2fe' : '#ccfbf1',
                        color: isVet ? '#0369a1' : '#0f766e',
                        border: isVet ? '1px solid #7dd3fc' : '1px solid #99f6e4',
                        padding: '2px 8px', borderRadius: '12px',
                        fontSize: '10px', fontWeight: 800
                      }}>
                        {isVet ? 'Veterinário' : 'Humano'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>
                      <MapPin size={12} color="var(--gray-400)" />
                      {/* Proteção LGPD: região aproximada, sem dados de contato antes do aceite */}
                      <span className="truncate">{req.location}</span>
                    </div>
                  </div>

                  {req.status === 'pending' ? (
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)',
                      border: '1px solid rgba(239, 68, 68, 0.2)', padding: '3px 8px',
                      borderRadius: 'var(--radius-full)', fontSize: '10px', fontWeight: 700
                    }}>
                      NOVA
                    </span>
                  ) : (
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.1)', color: 'var(--secondary-600)',
                      border: '1px solid rgba(99, 102, 241, 0.2)', padding: '3px 8px',
                      borderRadius: 'var(--radius-full)', fontSize: '10px', fontWeight: 700
                    }}>
                      COTADA
                    </span>
                  )}
                </div>

                {/* Resumo Veterinário Específico (quando kind === VETERINARY) */}
                {isVet && (
                  <div style={{
                    background: '#f8fafc',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    color: '#334155'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Espécie / Raça:</span>
                        <strong>{req.speciesLabel}</strong> • {req.breed}
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Peso / Idade:</span>
                        <strong>{req.weightKgFormatted || 'N/I'}</strong> {req.ageFormatted ? `• ${req.ageFormatted}` : ''}
                      </div>
                    </div>

                    {req.prescriber && (
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>Prescritor Veterinário: </span>
                        <strong>{req.prescriber.name}</strong> (CRMV-{req.prescriber.uf} {req.prescriber.crmv})
                      </div>
                    )}
                  </div>
                )}

                {/* Alerta "Conferir documento" para receita controlada */}
                {isVet && req.requiresManualDocumentCheck && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#92400e',
                    fontWeight: 600
                  }}>
                    <AlertTriangle size={15} color="#d97706" />
                    <span>Conferir documento: Notificação de Receita Veterinária</span>
                  </div>
                )}

                {/* Prescription info */}
                <div className="glass-panel" style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'rgba(255, 255, 255, 0.65)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <FileText size={18} color={isVet ? '#0284c7' : 'var(--primary-600)'} />
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-800)' }}>
                    {req.prescription}
                  </span>
                </div>

                {/* Observações / Fórmulas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '2px 0' }}>
                  {req.medications.map((med, i) => (
                    <span
                      key={i}
                      style={{
                        background: isVet ? 'rgba(2, 132, 199, 0.08)' : 'rgba(20, 184, 166, 0.08)',
                        color: isVet ? '#0369a1' : 'var(--primary-800)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-xs)',
                        fontWeight: 600
                      }}
                    >
                      {med}
                    </span>
                  ))}
                </div>

                {/* Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gray-400)', fontSize: '11px' }}>
                  <Clock size={12} />
                  <span>Publicada em {req.createdAt}</span>
                </div>

                {/* Quoted Price if already sent */}
                {req.status === 'quoted' && (
                  <div style={{
                    padding: 'var(--space-3)',
                    background: isVet ? 'rgba(2, 132, 199, 0.08)' : 'rgba(20, 184, 166, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: isVet ? '1px solid rgba(2, 132, 199, 0.2)' : '1px solid rgba(20, 184, 166, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--gray-600)', fontWeight: 600 }}>Proposta Enviada:</span>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: isVet ? '#0369a1' : 'var(--primary-700)' }}>
                      R$ {Number(req.quotedPrice).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto', paddingTop: 'var(--space-3)', borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: 'var(--font-xs)', fontWeight: 600,
                      borderRadius: 'var(--radius-lg)', background: 'white'
                    }}
                    onClick={() => {
                      if (req.fileUrl) {
                        window.open(req.fileUrl, '_blank');
                      } else {
                        alert('Conforme as normas de privacidade (LGPD), a imagem da receita e os dados de contato do tutor são liberados após o aceite da cotação.');
                      }
                    }}
                  >
                    <Eye size={15} />
                    Ver Receita
                  </button>

                  {req.status === 'pending' && (
                    <button
                      type="button"
                      className="btn btn-glass-primary"
                      style={{
                        flex: 1.2, padding: '8px 14px', fontSize: 'var(--font-xs)', fontWeight: 700,
                        borderRadius: 'var(--radius-lg)'
                      }}
                      onClick={() => navigate(`/pharmacy/send-quote/${req.id}`)}
                    >
                      <Send size={15} />
                      Enviar Cotação
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
