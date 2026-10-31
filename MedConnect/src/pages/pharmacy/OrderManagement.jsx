import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { orderStatuses } from '../../constants/status';
import {
  MapPin,
  ChevronRight,
  Package,
  Truck,
  CheckCircle2,
  Loader2,
  Phone,
  User,
  ShieldCheck,
  Calendar
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

export default function OrderManagement() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [updatingId, setUpdatingId] = useState(null);

  const statusFlow = ['PRODUCTION', 'DELIVERY', 'DELIVERED'];

  const getNextStatus = (currentStatus) => {
    const idx = statusFlow.indexOf(currentStatus);
    return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  // Consulta de pedidos reais da farmácia via TanStack Query
  const {
    data: rawOrders = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['pharmacyOrders'],
    queryFn: async () => {
      const res = await api.get('/orders/my');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Mutação de avanço de status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }) => {
      const res = await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      return res.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
      const nextLabel = orderStatuses[updatedOrder.status]?.label || updatedOrder.status;
      toast.success(`Pedido #${updatedOrder.id.slice(0, 8).toUpperCase()} atualizado para: ${nextLabel}`);
      setUpdatingId(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || 'Não foi possível atualizar o status do pedido.';
      toast.error(msg);
      setUpdatingId(null);
    }
  });

  const handleAdvanceStatus = (orderId, currentStatus) => {
    const next = getNextStatus(currentStatus);
    if (!next) return;

    setUpdatingId(orderId);
    updateStatusMutation.mutate({ orderId, nextStatus: next });
  };

  const formattedOrders = rawOrders.map((o) => {
    const presc = o.quote?.prescription || o.prescription || {};
    const isVet = presc.kind === 'VETERINARY';
    const pet = presc.pet || o.pet || null;
    const client = presc.patient || o.patient || {};

    const displayName = isVet
      ? (pet?.name ? `${pet.name} (Tutor: ${client.name || 'Tutor'})` : (client.name || 'Tutor'))
      : (client.name || 'Paciente');

    const initials = isVet ? 'PET' : (client.name ? client.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'PA');

    const weightKg = pet?.weightGrams ? `${(pet.weightGrams / 1000).toFixed(2).replace('.', ',')} kg` : null;

    return {
      id: `#${o.id.slice(0, 8).toUpperCase()}`,
      rawId: o.id,
      isVet,
      patient: displayName,
      tutorName: client.name || 'Tutor não identificado',
      tutorPhone: client.phone || 'Telefone não informado',
      initials: initials || 'PA',
      address: o.deliveryAddress || client.address || 'Endereço registrado na cotação',
      petName: pet?.name || 'Animal Paciente',
      speciesLabel: pet?.species ? (SPECIES_LABELS[pet.species] || pet.species) : null,
      breed: pet?.breed || 'SRD',
      weightKg,
      prescriber: presc.prescriberName
        ? `${presc.prescriberName} (CRMV-${presc.prescriberUf || 'SP'} ${presc.prescriberCrmv || ''})`
        : null,
      pharmaceuticalForm: o.quote?.pharmaceuticalForm || null,
      flavoring: o.quote?.flavoring || null,
      medications: [presc.notes || (isVet ? 'Fórmula manipulada veterinária' : 'Fórmula sob prescrição médica')],
      status: o.status,
      price: o.quote?.price || (o.quote?.priceCents ? (o.quote.priceCents / 100).toFixed(2) : (o.totalAmount || 0)),
      deliveryEstimate: o.quote?.deliveryDays ? `${o.quote.deliveryDays} dias úteis` : '2 dias',
      createdAt: new Date(o.createdAt).toLocaleDateString('pt-BR')
    };
  });

  const filtered = formattedOrders.filter((o) =>
    activeTab === 'active' ? o.status !== 'DELIVERED' : o.status === 'DELIVERED'
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PRODUCTION': return <Package size={15} />;
      case 'DELIVERY': return <Truck size={15} />;
      case 'DELIVERED': return <CheckCircle2 size={15} />;
      default: return <Package size={15} />;
    }
  };

  const getNextLabel = (status) => {
    switch (status) {
      case 'PRODUCTION': return 'Despachar para Entrega';
      case 'DELIVERY': return 'Confirmar Entrega';
      default: return null;
    }
  };

  return (
    <div className="max-w-container-max mx-auto space-y-lg pb-24 md:pb-0" style={{ padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
            Gestão de Pedidos e Manipulação
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0 }}>
            Acompanhe a linha de produção das fórmulas e atualize o status para o paciente ou tutor.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--gray-100)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setActiveTab('active')}
          >
            Em Andamento ({formattedOrders.filter((o) => o.status !== 'DELIVERED').length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'delivered' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setActiveTab('delivered')}
          >
            Concluídos ({formattedOrders.filter((o) => o.status === 'DELIVERED').length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 size={36} className="animate-spin" color="var(--primary-600)" style={{ margin: '0 auto' }} />
        </div>
      ) : isError ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <p className="text-sm font-semibold text-gray" style={{ marginBottom: '12px' }}>
            Erro ao carregar os pedidos da farmácia.
          </p>
          <button className="btn btn-primary" onClick={() => refetch()}>Tentar Novamente</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <Package size={44} color="var(--gray-300)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-800)', marginBottom: '4px' }}>
            Nenhum pedido encontrado nesta aba
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0 }}>
            {activeTab === 'active'
              ? 'Você não tem pedidos em produção ou entrega no momento.'
              : 'Nenhum pedido finalizado ainda.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((order) => {
            const nextLabel = getNextLabel(order.status);
            const isUpdating = updatingId === order.rawId;
            const statusConfig = orderStatuses[order.status] || orderStatuses.PRODUCTION;

            return (
              <div
                key={order.rawId}
                className="card animate-slide-up"
                style={{
                  padding: '20px',
                  background: 'white',
                  borderTop: order.isVet ? '4px solid #0284c7' : '4px solid #0d9488'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="avatar"
                      style={{
                        background: order.isVet ? '#e0f2fe' : 'var(--primary-50)',
                        color: order.isVet ? '#0369a1' : 'var(--primary-700)',
                        fontWeight: 700,
                        width: '42px',
                        height: '42px',
                        fontSize: order.isVet ? '12px' : '14px'
                      }}
                    >
                      {order.initials}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                          {order.patient}
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--gray-400)', fontWeight: 600 }}>
                          {order.id}
                        </span>
                        {/* Selo Veterinário */}
                        {order.isVet && (
                          <span style={{
                            background: '#e0f2fe', color: '#0369a1',
                            border: '1px solid #7dd3fc', padding: '2px 8px',
                            borderRadius: '12px', fontSize: '10px', fontWeight: 800
                          }}>
                            Veterinário
                          </span>
                        )}
                      </div>

                      {/* Dados de Contato e Entrega do Tutor/Paciente (Liberados após aceite da cotação) */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--gray-600)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="var(--gray-400)" /> {order.address}
                        </span>
                        {order.tutorPhone && order.tutorPhone !== 'Telefone não informado' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={13} color="var(--gray-400)" /> {order.tutorPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge badge-dot badge-${statusConfig.color}`} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      {statusConfig.label}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gray-900)' }}>
                      R$ {Number(order.price).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Resumo do Animal Paciente (se veterinário) */}
                {order.isVet && (
                  <div style={{
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '14px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Animal / Espécie:</span>
                        <strong>{order.petName}</strong> ({order.speciesLabel || 'Espécie não informada'} • {order.breed})
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Peso do Animal:</span>
                        <strong>{order.weightKg || 'Não informado'}</strong>
                      </div>
                      {order.prescriber && (
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Médico Veterinário:</span>
                          <strong>{order.prescriber}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ background: 'rgba(249, 250, 251, 0.8)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Fórmula Prescrita:
                  </span>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-800)', margin: '2px 0 0' }}>
                    {order.medications.join(', ')}
                  </p>
                </div>

                {nextLabel && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={isUpdating}
                      onClick={() => handleAdvanceStatus(order.rawId, order.status)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 16px' }}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        <>
                          {getStatusIcon(order.status)}
                          {nextLabel}
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
