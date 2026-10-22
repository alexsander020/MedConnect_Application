import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { Search, Filter } from 'lucide-react';
import { api } from '../../services/api';

const statusConfig = {
    PENDING: { label: 'Pendente', color: 'info' },
    REVIEWING: { label: 'Em Análise', color: 'info' },
    QUOTED: { label: 'Cotado', color: 'warning' },
    ACCEPTED: { label: 'Aprovado', color: 'primary' },
    PRODUCTION: { label: 'Em Produção', color: 'warning' },
    DELIVERY: { label: 'Em Entrega', color: 'info' },
    DELIVERED: { label: 'Finalizado', color: 'success' },
    CANCELLED: { label: 'Cancelado', color: 'error' },
    ANALYSIS: { label: 'Em Análise', color: 'info' },
    APPROVED: { label: 'Aprovado', color: 'primary' },
};

export default function Orders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const [search, setSearch] = useState('');

    const fetchOrders = useCallback(() => {
        setLoading(true);
        setError(null);
        api.get('/orders/my')
            .then(res => {
                if (Array.isArray(res.data)) {
                    const formatted = res.data.map(o => ({
                        id: o.id.slice(0, 8).toUpperCase(),
                        rawId: o.id,
                        status: o.status,
                        createdAt: new Date(o.createdAt).toLocaleDateString('pt-BR'),
                        price: o.quote?.price || 0,
                        pharmacy: o.quote?.pharmacy ? {
                            name: o.quote.pharmacy.name,
                            initials: o.quote.pharmacy.name.substring(0, 2).toUpperCase()
                        } : null,
                        medications: o.quote?.prescription?.notes
                            ? [o.quote.prescription.notes]
                            : ['Receita Médica Anexada']
                    }));
                    setOrders(formatted);
                } else {
                    setOrders([]);
                }
            })
            .catch(err => {
                console.error('Erro ao carregar pedidos:', err);
                setError(err?.response?.data?.error || 'Não foi possível carregar os pedidos. Verifique sua conexão.');
                setOrders([]);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const filteredOrders = orders.filter((order) => {
        const matchTab = activeTab === 'active'
            ? order.status !== 'DELIVERED'
            : order.status === 'DELIVERED';
        const matchSearch = search === '' ||
            order.id.toLowerCase().includes(search.toLowerCase()) ||
            order.medications.some(m => m.toLowerCase().includes(search.toLowerCase()));
        return matchTab && matchSearch;
    });

    return (
        <div className="app-container">
            <Header title="Meus Pedidos" />

            <div className="page">
                {/* Tabs */}
                <div className="tabs animate-slide-down" style={{ marginBottom: 'var(--space-4)' }}>
                    <button className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
                        Ativos
                    </button>
                    <button className={`tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
                        Concluídos
                    </button>
                </div>

                {/* Search */}
                <div className="search-bar animate-slide-up" style={{ marginBottom: 'var(--space-5)' }}>
                    <Search />
                    <input
                        className="form-input"
                        placeholder="Buscar pedido..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Content area: Loading, Error or List */}
                {loading ? (
                    <LoadingState message="Carregando seus pedidos..." />
                ) : error ? (
                    <ErrorState
                        title="Erro ao carregar pedidos"
                        message={error}
                        onRetry={fetchOrders}
                    />
                ) : filteredOrders.length === 0 ? (
                    <EmptyState
                        icon={Filter}
                        title="Nenhum pedido encontrado"
                        description={
                            activeTab === 'active'
                                ? 'Você não tem pedidos ativos no momento'
                                : 'Nenhum pedido concluído ainda'
                        }
                    />
                ) : (
                    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {filteredOrders.map((order) => {
                            const status = statusConfig[order.status] || { label: order.status, color: 'info' };
                            return (
                                <div
                                    key={order.id}
                                    className="card animate-slide-up"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/order/${order.rawId || order.id}`)}
                                >
                                    <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
                                        <div>
                                            <h4 className="font-semibold text-sm">{order.id}</h4>
                                            <p className="text-xs text-gray mt-1">{order.createdAt}</p>
                                        </div>
                                        <span className={`badge badge-dot badge-${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <p className="text-sm" style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-3)' }}>
                                        {order.medications.join(', ')}
                                    </p>

                                    <div className="flex justify-between items-center">
                                        {order.pharmacy ? (
                                             <div className="flex items-center gap-2">
                                                <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '9px' }}>
                                                    {order.pharmacy.initials}
                                                </div>
                                                <span className="text-xs text-gray">{order.pharmacy.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray">Aguardando propostas...</span>
                                        )}
                                        {order.price ? (
                                            <span className="font-bold text-primary">
                                                R$ {Number(order.price).toFixed(2).replace('.', ',')}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
