import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import { mockPharmacyRequests } from '../../data/mockData';
import { Clock, MapPin, Eye, Send, ChevronRight } from 'lucide-react';

export default function Requests() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending');

    const filtered = mockPharmacyRequests.filter(r =>
        activeTab === 'pending' ? r.status === 'pending' : r.status === 'quoted'
    );

    return (
        <div className="app-container">
            <Header title="Solicitações" />

            <div className="page">
                {/* Tabs */}
                <div className="tabs animate-slide-down" style={{ marginBottom: 'var(--space-5)' }}>
                    <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                        Pendentes ({mockPharmacyRequests.filter(r => r.status === 'pending').length})
                    </button>
                    <button className={`tab ${activeTab === 'quoted' ? 'active' : ''}`} onClick={() => setActiveTab('quoted')}>
                        Cotadas ({mockPharmacyRequests.filter(r => r.status === 'quoted').length})
                    </button>
                </div>

                {/* Requests */}
                <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {filtered.map((req) => (
                        <div key={req.id} className="card animate-slide-up">
                            {/* Header */}
                            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                                <div className="avatar" style={{
                                    background: 'var(--gradient-secondary)',
                                    width: '44px', height: '44px', fontSize: '14px',
                                }}>
                                    {req.user.initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 className="font-semibold">{req.user.name}</h4>
                                    <div className="flex items-center gap-1 mt-1">
                                        <MapPin size={12} color="var(--gray-400)" />
                                        <span className="text-xs text-gray">{req.location}</span>
                                    </div>
                                </div>
                                {req.status === 'pending' ? (
                                    <span className="badge badge-warning badge-dot">Nova</span>
                                ) : (
                                    <span className="badge badge-success badge-dot">Cotada</span>
                                )}
                            </div>

                            {/* Prescription */}
                            <div style={{
                                background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-3)', marginBottom: 'var(--space-3)',
                            }}>
                                <p className="text-xs text-gray" style={{ marginBottom: '4px' }}>📋 Receita</p>
                                <p className="text-sm font-semibold">{req.prescription}</p>
                            </div>

                            {/* Medications */}
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <p className="text-xs text-gray" style={{ marginBottom: '4px' }}>💊 Medicamentos</p>
                                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                    {req.medications.map((med, i) => (
                                        <span key={i} className="badge badge-primary">{med}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-1" style={{ marginBottom: 'var(--space-4)' }}>
                                <Clock size={12} color="var(--gray-400)" />
                                <span className="text-xs text-gray">{req.createdAt}</span>
                            </div>

                            {/* Quoted price (if quoted) */}
                            {req.status === 'quoted' && (
                                <div style={{
                                    background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--space-3)', marginBottom: 'var(--space-3)',
                                    border: '1px solid var(--primary-100)',
                                }}>
                                    <p className="text-xs text-gray">Valor enviado</p>
                                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--primary-700)' }}>
                                        R$ {req.quotedPrice.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                                    <Eye size={14} />
                                    Ver Receita
                                </button>
                                {req.status === 'pending' && (
                                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                                        onClick={() => navigate(`/pharmacy/send-quote/${req.id}`)}>
                                        <Send size={14} />
                                        Enviar Cotação
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
