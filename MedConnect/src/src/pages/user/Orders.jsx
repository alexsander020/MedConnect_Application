import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import { mockOrders, orderStatuses } from '../../data/mockData';
import { Search, Filter } from 'lucide-react';

export default function Orders() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('active');
    const [search, setSearch] = useState('');

    const filteredOrders = mockOrders.filter((order) => {
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

                {/* Orders list */}
                {filteredOrders.length === 0 ? (
                    <div className="empty-state animate-scale-in">
                        <Filter size={64} />
                        <h3>Nenhum pedido encontrado</h3>
                        <p>
                            {activeTab === 'active'
                                ? 'Você não tem pedidos ativos no momento'
                                : 'Nenhum pedido concluído ainda'}
                        </p>
                    </div>
                ) : (
                    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {filteredOrders.map((order) => {
                            const status = orderStatuses[order.status];
                            return (
                                <div
                                    key={order.id}
                                    className="card animate-slide-up"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/order/${order.id}`)}
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
                                        {order.price && (
                                            <span className="font-bold text-primary">
                                                R$ {order.price.toFixed(2).replace('.', ',')}
                                            </span>
                                        )}
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
