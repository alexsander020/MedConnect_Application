import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import {
  DollarSign,
  Clock,
  MessageSquare,
  Send,
  Check,
  Loader2,
  FileText,
  AlertCircle,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const SPECIES_LABELS = {
  DOG: 'Canina (Cão)',
  CAT: 'Felina (Gato)',
  BIRD: 'Ave',
  REPTILE: 'Réptil',
  SMALL_MAMMAL: 'Pequeno Mamífero',
  EQUINE: 'Equina (Cavalo)'
};

const COMMON_VET_FORMS = [
  'Biscoito Palatável / Medicamentoso',
  'Pasta Oral / Gel Comestível',
  'Suspensão Oral / Xarope',
  'Cápsula Manipulada',
  'Gel Transdérmico (Orelha/Pele)',
  'Solução Otológica / Tópica',
  'Pomada / Creme Dermatológico'
];

const COMMON_VET_FLAVORS = [
  'Sabor Carne Bovina',
  'Sabor Frango Grelhado',
  'Sabor Bacon',
  'Sabor Peixe / Atum',
  'Sabor Fígado',
  'Sabor Doce de Leite',
  'Sem Aromatização (Neutro)'
];

export default function SendQuote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [notes, setNotes] = useState('');
  const [pharmaceuticalForm, setPharmaceuticalForm] = useState('');
  const [flavoring, setFlavoring] = useState('');
  const [estimatedPreparationDays, setEstimatedPreparationDays] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Consulta os dados da receita médica/veterinária
  const {
    data: prescription,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['prescription', id],
    queryFn: async () => {
      const res = await api.get(`/prescriptions/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  const isVet = prescription?.kind === 'VETERINARY';

  // Envio da cotação
  const quoteMutation = useMutation({
    mutationFn: async ({
      prescriptionId,
      price,
      deliveryDays,
      notes,
      pharmaceuticalForm,
      flavoring,
      estimatedPreparationDays
    }) => {
      const res = await api.post('/quotes', {
        prescriptionId,
        price,
        deliveryDays,
        notes,
        ...(pharmaceuticalForm ? { pharmaceuticalForm } : {}),
        ...(flavoring ? { flavoring } : {}),
        ...(estimatedPreparationDays ? { estimatedPreparationDays } : {})
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
      queryClient.invalidateQueries({ queryKey: ['availablePrescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription', id] });
      setSubmitted(true);
      toast.success(
        isVet
          ? 'Proposta veterinária enviada ao tutor com sucesso!'
          : 'Proposta enviada ao paciente com sucesso!'
      );
      setTimeout(() => navigate('/pharmacy/requests'), 2000);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || 'Erro ao enviar cotação.';
      toast.error(msg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const numericPrice = parseFloat(String(price).replace(',', '.'));
    if (!numericPrice || numericPrice <= 0) {
      toast.warning('Informe um valor válido em reais para a proposta.');
      return;
    }

    quoteMutation.mutate({
      prescriptionId: id,
      price: numericPrice,
      deliveryDays: days ? parseInt(days, 10) : undefined,
      notes: notes.trim() || undefined,
      pharmaceuticalForm: pharmaceuticalForm.trim() || undefined,
      flavoring: flavoring.trim() || undefined,
      estimatedPreparationDays: estimatedPreparationDays ? parseInt(estimatedPreparationDays, 10) : undefined
    });
  };

  if (submitted) {
    return (
      <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="page" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '80vh', textAlign: 'center',
          position: 'relative', zIndex: 1
        }}>
          <div className="glass-panel animate-scale-in" style={{
            padding: 'var(--space-10) var(--space-8)',
            maxWidth: '420px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 'var(--space-6)',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
            }}>
              <Check size={40} color="white" />
            </div>
            <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, marginBottom: 'var(--space-2)', color: 'var(--gray-900)' }}>
              Proposta Enviada!
            </h2>
            <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-sm)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
              {isVet
                ? 'O tutor do animal receberá a notificação em tempo real com o valor, formulação e prazo informados.'
                : 'O cliente receberá a notificação em tempo real com o valor e prazo informados.'}
            </p>
            <span className="badge badge-success">
              Retornando ao mural de receitas...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header title={isVet ? "Enviar Proposta Veterinária" : "Enviar Proposta de Cotação"} showBack />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Loader2 className="animate-spin" size={36} color="var(--primary-600)" />
        </div>
      </div>
    );
  }

  if (isError || !prescription) {
    return (
      <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header title="Enviar Proposta de Cotação" showBack />
        <div className="page" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <AlertCircle size={40} color="var(--error)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Receita não encontrada</h3>
            <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>
              Esta receita pode já ter sido finalizada ou cancelada pelo paciente ou tutor.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/pharmacy/requests')}>
              Voltar às Solicitações
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dados do animal e prescritor
  const pet = prescription.pet;
  const weightKg = pet?.weightGrams ? `${(pet.weightGrams / 1000).toFixed(2).replace('.', ',')} kg` : null;

  return (
    <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />

      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        <Header title={isVet ? "Enviar Proposta Veterinária" : "Enviar Proposta de Cotação"} showBack />

        <div className="page" style={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Card Resumo da Receita */}
          <div className="glass-card animate-slide-down" style={{
            padding: 'var(--space-5)', marginBottom: 'var(--space-6)',
            borderTop: isVet ? '4px solid #0284c7' : '4px solid #0d9488'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>
                    {isVet ? (pet?.name || 'Animal Paciente') : (prescription.patient?.anonymousId || `Receita #${prescription.id.slice(0, 8).toUpperCase()}`)}
                  </h3>
                  <span style={{
                    background: isVet ? '#e0f2fe' : '#ccfbf1',
                    color: isVet ? '#0369a1' : '#0f766e',
                    border: isVet ? '1px solid #7dd3fc' : '1px solid #99f6e4',
                    padding: '2px 8px', borderRadius: '12px',
                    fontSize: '11px', fontWeight: 800
                  }}>
                    {isVet ? 'Veterinário' : 'Humano'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '4px 0 0' }}>
                  Cadastrada em {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className="badge badge-info">
                Aguardando Orçamento
              </span>
            </div>

            {/* Dados do animal e prescritor */}
            {isVet && (
              <div style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginTop: '12px',
                fontSize: '13px',
                color: '#334155'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Espécie / Raça:</span>
                    <strong>{SPECIES_LABELS[pet?.species] || pet?.species || 'Animal'}</strong> • {pet?.breed || 'SRD'}
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Peso do Paciente:</span>
                    <strong>{weightKg || 'Não informado'}</strong>
                  </div>
                </div>

                {prescription.prescriberName && (
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Médico Veterinário Prescritor: </span>
                    <strong>{prescription.prescriberName}</strong> (CRMV-{prescription.prescriberUf} {prescription.prescriberCrmv})
                  </div>
                )}
              </div>
            )}

            {/* Alerta de notificação de controle veterinário */}
            {isVet && prescription.vetDocumentType === 'CONTROLLED_NOTIFICATION' && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '10px 12px',
                borderRadius: '8px',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#92400e',
                fontWeight: 600
              }}>
                <AlertTriangle size={16} color="#d97706" />
                <span>
                  Receita com Notificação de Receita Veterinária (Nº {prescription.controlledNotificationNumber || 'anexo'})
                </span>
              </div>
            )}

            <div style={{ background: 'rgba(243, 244, 246, 0.7)', padding: '10px 14px', borderRadius: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isVet ? 'Fórmula Veterinária Prescrita:' : 'Especificação médica da fórmula:'}
              </span>
              <p style={{ fontSize: '13px', color: 'var(--gray-800)', fontWeight: 600, margin: '4px 0 0' }}>
                {prescription.notes || (isVet ? 'Fórmula sob prescrição veterinária anexada' : 'Fórmula sob prescrição médica anexada')}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: 'var(--gray-900)' }}>
              {isVet ? 'Dados da Proposta Veterinária' : 'Dados da Proposta Farmacêutica'}
            </h3>

            {/* Campos Específicos para Manipulação Veterinária */}
            {isVet && (
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
                  Especificações Galênicas Veterinárias
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  {/* Forma Farmacêutica */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      Forma Farmacêutica Ofertada
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      list="vet-forms"
                      placeholder="Ex: Biscoito Palatável, Pasta Oral..."
                      value={pharmaceuticalForm}
                      onChange={(e) => setPharmaceuticalForm(e.target.value)}
                    />
                    <datalist id="vet-forms">
                      {COMMON_VET_FORMS.map((f, i) => (
                        <option key={i} value={f} />
                      ))}
                    </datalist>
                  </div>

                  {/* Aromatização / Sabor */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      Aromatização / Palatabilizante
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      list="vet-flavors"
                      placeholder="Ex: Sabor Carne, Frango..."
                      value={flavoring}
                      onChange={(e) => setFlavoring(e.target.value)}
                    />
                    <datalist id="vet-flavors">
                      {COMMON_VET_FLAVORS.map((fl, i) => (
                        <option key={i} value={fl} />
                      ))}
                    </datalist>
                  </div>

                  {/* Prazo de manipulação */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      Tempo de Manipulação (dias)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      className="form-input"
                      id="prep-days-input"
                      placeholder="Ex: 2"
                      value={estimatedPreparationDays}
                      onChange={(e) => setEstimatedPreparationDays(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Valor em Reais */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Valor Total da Proposta (R$) *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={18} color="var(--gray-400)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 89,90"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px', display: 'block' }}>
                O valor é armazenado e processado com precisão e exibido em reais ao cliente.
              </span>
            </div>

            {/* Prazo de Entrega Total */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Prazo de Entrega Total (dias úteis)</label>
              <div style={{ position: 'relative' }}>
                <Clock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="form-input"
                  id="delivery-days-input"
                  placeholder="Ex: 2"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            {/* Observações Farmacêuticas */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">
                {isVet ? 'Instruções de Posologia e Conservação Veterinária' : 'Observações e Recomendações Farmacêuticas'}
              </label>
              <textarea
                className="form-input form-textarea"
                rows={3}
                placeholder={
                  isVet
                    ? "Ex: Conservar em geladeira após aberto. Administrar misturado ao alimento..."
                    : "Ex: Insumos puros com laudo analítico, embalagem âmbar com proteção UV..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={quoteMutation.isPending}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {quoteMutation.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enviando Orçamento...
                </>
              ) : (
                <>
                  <Send size={18} />
                  {isVet ? 'Enviar Proposta ao Tutor' : 'Enviar Proposta ao Paciente'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
