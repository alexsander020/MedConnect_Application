import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { ESPECIES_ANIMAIS, validarPesoGramas } from '@medconnect/validation';
import { Plus, Edit2, Trash2, PawPrint, AlertCircle, X, Check, Info } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const ESPECIES_LABELS = {
  DOG: 'Cachorro (Cão)',
  CAT: 'Gato (Felino)',
  BIRD: 'Ave / Pássaro',
  REPTILE: 'Réptil',
  SMALL_MAMMAL: 'Pequeno Mamífero (Roedor / Coelho)',
  EQUINE: 'Equino (Cavalo)',
  OTHER: 'Outro'
};

export default function MyPets() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { vetEnabled, isLoading: isLoadingConfig, vetAllowFoodProducing } = usePublicConfig();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('DOG');
  const [breed, setBreed] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isFoodProducing, setIsFoodProducing] = useState(false);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const {
    data: pets = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['myPets'],
    queryFn: async () => {
      const res = await api.get('/animals');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: vetEnabled
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingPet) {
        const res = await api.patch(`/animals/${editingPet.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/animals', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPets'] });
      toast.success(editingPet ? 'Animal atualizado com sucesso!' : 'Animal cadastrado com sucesso!');
      closeModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Falha ao salvar animal. Verifique os dados.';
      setFormError(msg);
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/animals/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPets'] });
      toast.success('Animal removido com sucesso!');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Falha ao remover animal.';
      toast.error(msg);
    }
  });

  if (!isLoadingConfig && !vetEnabled) {
    return <Navigate to="/dashboard" replace />;
  }

  const openNewModal = () => {
    setEditingPet(null);
    setName('');
    setSpecies('DOG');
    setBreed('');
    setWeightKg('');
    setBirthDate('');
    setIsFoodProducing(false);
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (pet) => {
    setEditingPet(pet);
    setName(pet.name || '');
    setSpecies(pet.species || 'DOG');
    setBreed(pet.breed || '');
    // Converter gramas para kg com até 2 casas decimais
    const kg = pet.weightGrams ? (pet.weightGrams / 1000).toFixed(2).replace(/\.?0+$/, '') : '';
    setWeightKg(kg);
    setBirthDate(pet.birthDate ? pet.birthDate.split('T')[0] : '');
    setIsFoodProducing(!!pet.isFoodProducing);
    setNotes(pet.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPet(null);
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('O nome do animal é obrigatório.');
      return;
    }

    // Validação de peso em kg para gramas
    const parsedKg = parseFloat(String(weightKg).replace(',', '.'));
    if (isNaN(parsedKg) || parsedKg <= 0) {
      setFormError('Informe um peso válido em kg (ex: 4.5 ou 12.35).');
      return;
    }

    const weightGrams = Math.round(parsedKg * 1000);
    if (!validarPesoGramas(weightGrams)) {
      setFormError('Peso deve estar entre 0.01 kg (10g) e 1500 kg.');
      return;
    }

    if (isFoodProducing && !vetAllowFoodProducing) {
      setFormError('Desculpe, ainda não atendemos manipulação para animais destinados à produção/consumo de alimentos.');
      return;
    }

    const payload = {
      name: name.trim(),
      species,
      breed: breed.trim() || undefined,
      weightGrams,
      birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
      isFoodProducing: Boolean(isFoodProducing),
      notes: notes.trim() || undefined
    };

    saveMutation.mutate(payload);
  };

  const handleDelete = (pet) => {
    if (window.confirm(`Tem certeza que deseja remover o animal "${pet.name}"?`)) {
      deleteMutation.mutate(pet.id);
    }
  };

  return (
    <div className="app-container">
      <Header title="Meus Pets" showBack />

      <div className="page" style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '90px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>
              Animais Cadastrados
            </h2>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', margin: '2px 0 0' }}>
              Gerencie seus pets para solicitar fórmulas veterinárias personalizadas.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openNewModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-lg)' }}
          >
            <Plus size={16} /> Cadastrar Pet
          </button>
        </div>

        {isLoading ? (
          <LoadingState message="Carregando seus animais..." />
        ) : isError ? (
          <ErrorState
            title="Erro ao carregar animais"
            message={error?.response?.data?.error?.message || 'Não foi possível carregar a lista de pets.'}
            onRetry={refetch}
          />
        ) : pets.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title="Nenhum pet cadastrado"
            description="Cadastre seu primeiro animal para solicitar receitas e manipulações veterinárias."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {pets.map((pet) => {
              const kg = (pet.weightGrams / 1000).toFixed(2).replace(/\.?0+$/, '');
              const speciesLabel = ESPECIES_LABELS[pet.species] || pet.species;
              return (
                <div key={pet.id} className="card animate-slide-up" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--success)'
                        }}
                      >
                        <PawPrint size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>
                            {pet.name}
                          </h3>
                          {pet.isFoodProducing && (
                            <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                              Produção / Alimentar
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-600)', margin: '2px 0 0' }}>
                          {speciesLabel} {pet.breed ? `• ${pet.breed}` : ''} • <strong>{kg} kg</strong>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => openEditModal(pet)}
                        aria-label={`Editar ${pet.name}`}
                        title="Editar"
                      >
                        <Edit2 size={16} color="var(--primary-600)" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleDelete(pet)}
                        aria-label={`Remover ${pet.name}`}
                        title="Remover"
                      >
                        <Trash2 size={16} color="var(--error)" />
                      </button>
                    </div>
                  </div>

                  {pet.birthDate && (
                    <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '8px', marginBottom: 0 }}>
                      Nascimento: {new Date(pet.birthDate).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {pet.notes && (
                    <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '6px', marginBottom: 0, fontStyle: 'italic' }}>
                      Obs: {pet.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '500px',
              width: '100%',
              background: 'white',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, margin: 0 }}>
                {editingPet ? 'Editar Animal' : 'Novo Animal'}
              </h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '10px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--error)',
                  fontSize: 'var(--font-xs)',
                  marginBottom: '16px'
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>
                  Nome do Animal *
                </label>
                <input
                  type="text"
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="Ex: Thor, Mel, Nina"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>
                    Espécie *
                  </label>
                  <select
                    className="glass-input"
                    style={{ width: '100%' }}
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                  >
                    {ESPECIES_ANIMAIS.map((sp) => (
                      <option key={sp} value={sp}>
                        {ESPECIES_LABELS[sp] || sp}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>
                    Raça (opcional)
                  </label>
                  <input
                    type="text"
                    className="glass-input"
                    style={{ width: '100%' }}
                    placeholder="Ex: Labrador, SRD, Siames"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>
                    Peso em kg * (ex: 4.5 ou 15)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1500"
                    className="glass-input"
                    style={{ width: '100%' }}
                    placeholder="Ex: 8.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>
                    Data de Nascimento (opcional)
                  </label>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ width: '100%' }}
                    max={new Date().toISOString().split('T')[0]}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Pergunta sobre animal de produção/alimentação */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: isFoodProducing ? 'rgba(245, 158, 11, 0.08)' : 'rgba(243, 244, 246, 0.6)',
                  border: `1px solid ${isFoodProducing ? 'rgba(245, 158, 11, 0.3)' : 'var(--gray-200)'}`,
                  marginBottom: '16px'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={isFoodProducing}
                    onChange={(e) => setIsFoodProducing(e.target.checked)}
                    style={{ accentColor: 'var(--warning)', width: 16, height: 16 }}
                  />
                  Este animal é destinado à produção ou alimentação humana?
                </label>
                {isFoodProducing && !vetAllowFoodProducing && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      <strong>Aviso regulatório:</strong> De acordo com normas do MAPA, a manipulação para animais destinados ao consumo requer habilitação específica. A MedConnect ainda não atende essa categoria. Desmarque para prosseguir apenas com animais de companhia.
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '13px' }}>
                  Observações de saúde / alergias (opcional)
                </label>
                <textarea
                  className="glass-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  rows={2}
                  placeholder="Ex: Alérgico a corante, preferência por sabor carne"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={saveMutation.isPending}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saveMutation.isPending || (isFoodProducing && !vetAllowFoodProducing)}
                >
                  {saveMutation.isPending ? 'Salvando...' : editingPet ? 'Atualizar Pet' : 'Salvar Pet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
