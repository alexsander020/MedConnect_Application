import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import {
  Upload,
  Camera,
  FileText,
  MapPin,
  Send,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  User,
  PawPrint,
  AlertCircle,
  Plus
} from 'lucide-react';
import { api } from '../../services/api';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { validarCrmv, UFS_BRASIL } from '@medconnect/validation';

export default function NewQuote() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { vetEnabled, vetControlledEnabled } = usePublicConfig();

  // 4.1 Home / Início do fluxo: Seletor "Para mim" / "Para meu pet"
  // Preserva "Para mim" (HUMAN) como padrão estrito
  const initialKind = vetEnabled && routeLocation.state?.kind === 'VETERINARY' ? 'VETERINARY' : 'HUMAN';
  const [kind, setKind] = useState(initialKind);

  // Campos comuns
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [healthConsent, setHealthConsent] = useState(true);

  // Campos exclusivos da Vertical Veterinária (Tarefa 4.3)
  const [selectedPetId, setSelectedPetId] = useState('');
  const [prescriberName, setPrescriberName] = useState('');
  const [prescriberCrmv, setPrescriberCrmv] = useState('');
  const [prescriberUf, setPrescriberUf] = useState('SP');
  const [vetDocumentType, setVetDocumentType] = useState('MAGISTRAL');
  const [controlledNotificationNumber, setControlledNotificationNumber] = useState('');
  const [flavoring, setFlavoring] = useState('');
  const [pharmaceuticalForm, setPharmaceuticalForm] = useState('');

  // Busca lista de pets da API real caso esteja no modo veterinário
  const {
    data: pets = [],
    isLoading: isLoadingPets,
    isError: isErrorPets
  } = useQuery({
    queryKey: ['myPets'],
    queryFn: async () => {
      const res = await api.get('/animals');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: vetEnabled && kind === 'VETERINARY'
  });

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Por favor, anexe o arquivo da sua receita.');
      return;
    }

    if (!healthConsent) {
      setError('É obrigatório autorizar o tratamento de dados para enviar a receita.');
      return;
    }

    // Validações específicas para receita veterinária
    if (kind === 'VETERINARY') {
      if (!selectedPetId) {
        setError('Por favor, selecione para qual pet é a receita.');
        return;
      }

      if (!prescriberName.trim()) {
        setError('O nome do médico veterinário prescritor é obrigatório.');
        return;
      }

      if (!prescriberCrmv.trim() || !validarCrmv(prescriberCrmv, prescriberUf)) {
        setError('Informe um CRMV válido para a UF selecionada (ex: número com 1 a 7 dígitos).');
        return;
      }

      if (vetDocumentType === 'CONTROLLED_NOTIFICATION') {
        if (!vetControlledEnabled) {
          setError('Receitas com notificação de controle especial veterinário não estão habilitadas no momento.');
          return;
        }
        if (!controlledNotificationNumber.trim()) {
          setError('O número da notificação de receita veterinária é obrigatório.');
          return;
        }
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consent', 'true');
      formData.append('kind', kind);

      if (notes) formData.append('notes', notes);
      if (location) formData.append('location', location);

      if (kind === 'VETERINARY') {
        formData.append('petId', selectedPetId);
        formData.append('prescriberName', prescriberName.trim());
        formData.append('prescriberCrmv', prescriberCrmv.trim());
        formData.append('prescriberUf', prescriberUf.trim().toUpperCase());
        formData.append('vetDocumentType', vetDocumentType);

        if (vetDocumentType === 'CONTROLLED_NOTIFICATION' && controlledNotificationNumber) {
          formData.append('controlledNotificationNumber', controlledNotificationNumber.trim());
        }

        if (flavoring) formData.append('flavoring', flavoring);
        if (pharmaceuticalForm) formData.append('pharmaceuticalForm', pharmaceuticalForm);
      }

      await api.post('/prescriptions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmitted(true);
      setTimeout(() => navigate('/orders'), 2000);
    } catch (err) {
      const errData = err.response?.data?.error;
      const msg =
        (typeof errData === 'string' ? errData : errData?.message) ||
        'Falha ao enviar receita. Verifique os dados e tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div
          className="page"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div
            className="glass-panel animate-scale-in"
            style={{
              padding: 'var(--space-10) var(--space-8)',
              maxWidth: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-6)',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Check size={44} color="white" />
            </div>
            <h2
              style={{
                fontSize: 'var(--font-2xl)',
                fontWeight: 800,
                marginBottom: 'var(--space-3)',
                color: 'var(--gray-900)'
              }}
            >
              Receita {kind === 'VETERINARY' ? 'Veterinária ' : ''}Enviada!
            </h2>
            <p
              style={{
                color: 'var(--gray-600)',
                fontSize: 'var(--font-sm)',
                lineHeight: 1.6,
                marginBottom: 'var(--space-6)'
              }}
            >
              Sua solicitação já está disponível para as farmácias credenciadas
              {kind === 'VETERINARY' ? ' com habilitação veterinária ativa' : ''}. Você receberá as propostas em instantes.
            </p>
            <span className="glass-pill glass-pill-primary">Redirecionando para seus pedidos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />

      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        <Header title="Nova Cotação" showBack />

        <div className="page" style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '90px' }}>
          {/* Header banner */}
          <div
            className="glass-card animate-slide-down"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-5)',
              padding: 'var(--space-4)',
              background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)',
              border: '1px solid rgba(20, 184, 166, 0.25)'
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(20, 184, 166, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={20} color="var(--primary-600)" />
            </div>
            <div>
              <p style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--primary-800)', margin: 0 }}>
                Orçamento 100% Gratuito e Seguro
              </p>
              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-600)', margin: 0 }}>
                Envie a receita e receba propostas em minutos das farmácias credenciadas
              </p>
            </div>
          </div>

          {/* 4.1 Seletor Claro: Para mim / Para meu pet (apenas se VET_ENABLED = true) */}
          {vetEnabled && (
            <div
              className="glass-card animate-slide-up"
              style={{
                padding: '8px',
                marginBottom: 'var(--space-5)',
                display: 'flex',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.85)'
              }}
            >
              <button
                type="button"
                className={`btn ${kind === 'HUMAN' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setKind('HUMAN')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                <User size={18} /> Para mim
              </button>
              <button
                type="button"
                className={`btn ${kind === 'VETERINARY' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setKind('VETERINARY')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                <PawPrint size={18} /> Para meu pet
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Se for VETERINÁRIA: Escolher Pet e dados do prescritor */}
            {kind === 'VETERINARY' && (
              <div
                className="glass-card animate-slide-up"
                style={{
                  padding: 'var(--space-4)',
                  marginBottom: 'var(--space-5)',
                  background: 'rgba(240, 253, 244, 0.65)',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 800, color: 'var(--gray-900)', margin: 0, fontSize: '13px' }}>
                    🐾 Selecione o Pet *
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => navigate('/my-pets')}
                    style={{ fontSize: '12px', color: 'var(--primary-700)', padding: '2px 8px', fontWeight: 600 }}
                  >
                    <Plus size={14} style={{ display: 'inline', marginRight: 2 }} /> Gerenciar Pets
                  </button>
                </div>

                {isLoadingPets ? (
                  <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Carregando seus animais...</p>
                ) : isErrorPets ? (
                  <p style={{ fontSize: '12px', color: 'var(--error)' }}>Não foi possível carregar os animais.</p>
                ) : pets.length === 0 ? (
                  <div
                    style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      border: '1px dashed var(--gray-300)'
                    }}
                  >
                    <p style={{ fontSize: '13px', color: 'var(--gray-700)', margin: '0 0 8px', fontWeight: 600 }}>
                      Você ainda não cadastrou nenhum pet.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate('/my-pets')}
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      Cadastrar Pet Agora
                    </button>
                  </div>
                ) : (
                  <select
                    className="glass-input"
                    style={{ width: '100%', marginBottom: '14px' }}
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o animal paciente...</option>
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.species} • {(p.weightGrams / 1000).toFixed(1)} kg)
                      </option>
                    ))}
                  </select>
                )}

                {/* Dados do Médico Veterinário Prescritor */}
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gray-800)', marginTop: '8px', marginBottom: '8px' }}>
                  👨‍⚕️ Dados do Médico Veterinário Prescritor
                </h4>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Nome Completo do Veterinário *
                  </label>
                  <input
                    type="text"
                    className="glass-input"
                    style={{ width: '100%' }}
                    placeholder="Ex: Dra. Mariana Costa"
                    value={prescriberName}
                    onChange={(e) => setPrescriberName(e.target.value)}
                    required={kind === 'VETERINARY'}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      CRMV *
                    </label>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ width: '100%' }}
                      placeholder="Ex: 12345"
                      value={prescriberCrmv}
                      onChange={(e) => setPrescriberCrmv(e.target.value)}
                      required={kind === 'VETERINARY'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      UF *
                    </label>
                    <select
                      className="glass-input"
                      style={{ width: '100%' }}
                      value={prescriberUf}
                      onChange={(e) => setPrescriberUf(e.target.value)}
                    >
                      {UFS_BRASIL.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tipo de Documento */}
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Tipo de Documento Veterinário
                  </label>
                  <select
                    className="glass-input"
                    style={{ width: '100%' }}
                    value={vetDocumentType}
                    onChange={(e) => setVetDocumentType(e.target.value)}
                  >
                    <option value="MAGISTRAL">Receita Magistral Veterinária</option>
                    {vetControlledEnabled && (
                      <option value="CONTROLLED_NOTIFICATION">Notificação de Receita Veterinária (Controle Especial)</option>
                    )}
                  </select>
                </div>

                {vetDocumentType === 'CONTROLLED_NOTIFICATION' && vetControlledEnabled && (
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      Número da Notificação de Receita *
                    </label>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ width: '100%' }}
                      placeholder="Ex: NOT-2026-98765"
                      value={controlledNotificationNumber}
                      onChange={(e) => setControlledNotificationNumber(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Forma e Aromatização desejada */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      Forma Farmacêutica (opcional)
                    </label>
                    <select
                      className="glass-input"
                      style={{ width: '100%' }}
                      value={pharmaceuticalForm}
                      onChange={(e) => setPharmaceuticalForm(e.target.value)}
                    >
                      <option value="">A critério da farmácia</option>
                      <option value="BISCOITO_MEDICAMENTOSO">Biscoito Medicamentoso</option>
                      <option value="PASTA_ORAL">Pasta Oral</option>
                      <option value="SUSPENSAO">Suspensão Líquida</option>
                      <option value="CAPSULA">Cápsula</option>
                      <option value="GEL_TRANSDERMICO">Gel Transdérmico</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      Sabor / Aromatização (opcional)
                    </label>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ width: '100%' }}
                      placeholder="Ex: Carne, Frango, Peixe"
                      value={flavoring}
                      onChange={(e) => setFlavoring(e.target.value)}
                    />
                  </div>
                </div>

                {/* Aviso Regulatório Importante */}
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '11px',
                    color: 'var(--gray-600)',
                    lineHeight: 1.4,
                    display: 'flex',
                    gap: '6px'
                  }}
                >
                  <AlertCircle size={14} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    <strong>Importante:</strong> A farmácia credenciada confere a receita e a plataforma não substitui a orientação do
                    médico veterinário.
                  </span>
                </div>
              </div>
            )}

            {/* Upload area */}
            <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
              <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)', marginBottom: 'var(--space-2)' }}>
                📋 Anexar {kind === 'VETERINARY' ? 'Receita Veterinária' : 'Receita Médica'} *
              </label>

              {!file ? (
                <label
                  className="glass-card animate-slide-up"
                  htmlFor="file-upload"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--space-10) var(--space-6)',
                    border: '2px dashed rgba(20, 184, 166, 0.4)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.75)'
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: 'rgba(20, 184, 166, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 'var(--space-4)',
                      boxShadow: '0 4px 15px rgba(20, 184, 166, 0.15)'
                    }}
                  >
                    <Upload size={30} color="var(--primary-600)" />
                  </div>
                  <p style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: 'var(--font-base)', margin: 0 }}>
                    <span style={{ color: 'var(--primary-600)' }}>Clique para enviar</span> ou arraste o arquivo
                  </p>
                  <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--font-xs)', color: 'var(--gray-400)', marginBottom: 0 }}>
                    Formatos aceitos: PDF, JPG ou PNG (até 10MB)
                  </p>
                  <input id="file-upload" type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              ) : (
                <div
                  className="glass-card animate-scale-in"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4) var(--space-5)',
                    background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%)',
                    border: '1.5px solid var(--primary-400)'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(20, 184, 166, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FileText size={24} color="var(--primary-700)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--gray-900)', margin: 0 }} className="truncate">
                      {file.name}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: 2, marginBottom: 0 }}>
                      {(file.size / 1024).toFixed(0)} KB • Pronto para envio
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => setFile(null)}
                    style={{ borderRadius: '50%' }}
                    aria-label="Remover arquivo"
                  >
                    <X size={18} color="var(--gray-400)" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick capture buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <label
                className="glass-card"
                htmlFor="camera-upload"
                style={{
                  flex: 1,
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'var(--font-sm)',
                  color: 'var(--gray-700)'
                }}
              >
                <Camera size={18} color="var(--primary-600)" />
                Tirar Foto
                <input
                  id="camera-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
              <label
                className="glass-card"
                htmlFor="gallery-upload"
                style={{
                  flex: 1,
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'var(--font-sm)',
                  color: 'var(--gray-700)'
                }}
              >
                <FileText size={18} color="var(--secondary-600)" />
                Galeria
                <input id="gallery-upload" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Location */}
            <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                📍 Sua Região de Entrega
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--gray-400)'
                  }}
                />
                <input
                  className="glass-input"
                  placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                  style={{ paddingLeft: '44px', width: '100%' }}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost text-sm mt-2"
                style={{ color: 'var(--primary-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => setLocation('São Paulo, SP - Localização Atual')}
              >
                <MapPin size={14} /> Usar localização atual aproximada
              </button>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
              <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                💬 Observações Adicionais (opcional)
              </label>
              <textarea
                className="glass-input"
                placeholder={
                  kind === 'VETERINARY'
                    ? 'Ex: Instruções de administração ao pet, preferências de consistência, etc.'
                    : 'Preferências específicas: cápsula vegetal, sabor morango, etc.'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--error)',
                  fontSize: 'var(--font-sm)',
                  marginBottom: 'var(--space-4)',
                  textAlign: 'center'
                }}
              >
                {error}
              </div>
            )}

            {/* 4.5 Consentimento Destacado (LGPD Art. 11) - Reutiliza texto versionado cobrindo tutor e pet */}
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(13, 148, 136, 0.08)',
                border: '1px solid rgba(13, 148, 136, 0.25)',
                marginBottom: 'var(--space-6)'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={healthConsent}
                  onChange={(e) => setHealthConsent(e.target.checked)}
                  style={{ marginTop: 3, accentColor: 'var(--primary-600)', width: 16, height: 16 }}
                  required
                />
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                  <strong>Termo de Consentimento para Tratamento de Dados (Versão v1.0.0):</strong>{' '}
                  {kind === 'VETERINARY'
                    ? 'Autorizo expressamente o tratamento dos dados da receita veterinária, identificação do animal de estimação e dados cadastrais do tutor para fins exclusivos de cotação de preços, verificação regulatória e manipulação farmacêutica pelas farmácias habilitadas, nos termos do Art. 11 da LGPD. Estou ciente de que posso revogar este consentimento a qualquer momento nas configurações do meu perfil.'
                    : 'Autorizo expressamente o tratamento desta prescrição médica e dados de saúde para fins exclusivos de cotação e manipulação farmacêutica, nos termos do Art. 11, I da LGPD. Estou ciente de que posso revogar este consentimento a qualquer momento nas configurações do meu perfil.'}
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="btn btn-glass-primary btn-lg btn-block"
              style={{ borderRadius: 'var(--radius-xl)', padding: '16px', fontWeight: 700, fontSize: '1rem' }}
              disabled={loading}
            >
              <Send size={18} />
              {loading ? 'Transmitindo receita às farmácias...' : 'Solicitar Orçamento Agora'}
            </button>
          </form>

          <div
            style={{
              marginTop: 'var(--space-6)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: 'var(--gray-500)',
              fontSize: 'var(--font-xs)'
            }}
          >
            <ShieldCheck size={16} color="var(--success)" />
            Receita enviada com sigilo profissional, validação de segurança e proteção de dados
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
