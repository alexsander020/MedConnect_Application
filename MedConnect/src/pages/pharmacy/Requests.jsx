import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockPharmacyRequests } from '../../data/mockData';
import { Clock, MapPin, Eye, Send } from 'lucide-react';

export default function Requests() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending');

    const filtered = mockPharmacyRequests.filter(r =>
        activeTab === 'pending' ? r.status === 'pending' : r.status === 'quoted'
    );

    return (
        <div className="max-w-container-max mx-auto space-y-lg pb-24 md:pb-0">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-outline-variant mb-lg">
                <button 
                    className={`pb-sm px-sm font-label-md transition-colors ${activeTab === 'pending' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`} 
                    onClick={() => setActiveTab('pending')}
                >
                    Pendentes ({mockPharmacyRequests.filter(r => r.status === 'pending').length})
                </button>
                <button 
                    className={`pb-sm px-sm font-label-md transition-colors ${activeTab === 'quoted' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`} 
                    onClick={() => setActiveTab('quoted')}
                >
                    Cotadas ({mockPharmacyRequests.filter(r => r.status === 'quoted').length})
                </button>
            </div>

            {/* Requests */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                {filtered.map((req) => (
                    <div key={req.id} className="bg-surface rounded-xl border border-outline-variant soft-shadow p-lg flex flex-col hover-shadow transition-shadow">
                        {/* Header */}
                        <div className="flex items-center gap-sm mb-md">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {req.user.initials}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-on-surface">{req.user.name}</h4>
                                <div className="flex items-center gap-1 mt-1 text-on-surface-variant">
                                    <MapPin size={12} />
                                    <span className="text-label-sm">{req.location}</span>
                                </div>
                            </div>
                            {req.status === 'pending' ? (
                                <span className="bg-error/10 text-error px-2 py-1 rounded font-bold text-[10px] uppercase">Nova</span>
                            ) : (
                                <span className="bg-secondary/10 text-secondary px-2 py-1 rounded font-bold text-[10px] uppercase">Cotada</span>
                            )}
                        </div>

                        {/* Prescription */}
                        <div className="bg-surface-container-low rounded-lg p-md mb-md">
                            <p className="text-label-sm text-on-surface-variant mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">receipt_long</span> Receita
                            </p>
                            <p className="text-body-sm font-semibold">{req.prescription}</p>
                        </div>

                        {/* Medications */}
                        <div className="mb-md flex-1">
                            <p className="text-label-sm text-on-surface-variant mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">medication</span> Medicamentos
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {req.medications.map((med, i) => (
                                    <span key={i} className="bg-primary/10 text-primary px-2 py-1 rounded text-label-sm font-semibold">{med}</span>
                                ))}
                            </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 mb-md text-on-surface-variant">
                            <Clock size={14} />
                            <span className="text-label-sm">{req.createdAt}</span>
                        </div>

                        {/* Quoted price (if quoted) */}
                        {req.status === 'quoted' && (
                            <div className="bg-primary/5 rounded-lg p-md mb-md border border-primary/20">
                                <p className="text-label-sm text-on-surface-variant">Valor enviado</p>
                                <p className="text-headline-md font-headline-md text-primary font-bold">
                                    R$ {req.quotedPrice.toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-sm mt-auto pt-md border-t border-outline-variant">
                            <button className="flex-1 py-sm px-md rounded-lg border border-outline text-on-surface-variant font-bold flex items-center justify-center gap-1 hover:bg-surface-container-low transition-colors">
                                <Eye size={16} /> Ver
                            </button>
                            {req.status === 'pending' && (
                                <button className="flex-1 py-sm px-md rounded-lg bg-primary text-on-primary font-bold flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors"
                                    onClick={() => navigate(`/pharmacy/send-quote/${req.id}`)}>
                                    <Send size={16} /> Cotar
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
