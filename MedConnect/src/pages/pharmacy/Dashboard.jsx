import { useNavigate } from 'react-router-dom';
import { mockPharmacyRequests, mockPharmacyOrders } from '../../data/mockData';

const productionQueue = [
    { id: '#8921', room: 'Lab Room 02', stage: 'Weighing', color: '#FFAB00', bg: '#FFAB00', progress: 25 },
    { id: '#8918', room: 'Lab Room 01', stage: 'Mixing', color: '#0052CC', bg: '#0052CC', progress: 60 },
    { id: '#8915', room: 'QC Station A', stage: 'Quality Control', color: '#36B37E', bg: '#36B37E', progress: 85 },
    { id: '#8910', room: 'Outbound Bay', stage: 'Ready for Delivery', color: '#36B37E', bg: '#36B37E', progress: 100 },
];

export default function PharmacyDashboard() {
    const navigate = useNavigate();

    const pendingRequests = mockPharmacyRequests.filter(r => r.status === 'pending');
    const inProductionOrders = mockPharmacyOrders.filter(o => o.status !== 'DELIVERED');

    return (
        <div className="max-w-container-max mx-auto space-y-lg pb-24 md:pb-0">
            {/* 1. Summary Section (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
                {/* KPI Card: Pending Quotes */}
                <div className="bg-surface p-lg rounded-xl border border-outline-variant soft-shadow flex flex-col gap-base hover-shadow transition-shadow cursor-pointer" onClick={() => navigate('/pharmacy/requests')}>
                    <div className="flex justify-between items-start">
                        <span className="text-label-md text-on-surface-variant">Pending Quotes</span>
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <span className="material-symbols-outlined text-primary">pending_actions</span>
                        </div>
                    </div>
                    <div className="text-headline-lg font-headline-lg text-on-surface">{pendingRequests.length}</div>
                    <div className="flex items-center gap-1 text-label-sm text-secondary font-bold">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        12% vs last week
                    </div>
                </div>

                {/* KPI Card: In Production */}
                <div className="bg-surface p-lg rounded-xl border border-outline-variant soft-shadow flex flex-col gap-base hover-shadow transition-shadow cursor-pointer" onClick={() => navigate('/pharmacy/orders')}>
                    <div className="flex justify-between items-start">
                        <span className="text-label-md text-on-surface-variant">In Production</span>
                        <div className="p-2 bg-secondary/10 rounded-lg">
                            <span className="material-symbols-outlined text-secondary">precision_manufacturing</span>
                        </div>
                    </div>
                    <div className="text-headline-lg font-headline-lg text-on-surface">{inProductionOrders.length}</div>
                    <div className="text-label-sm text-on-surface-variant">8 orders nearing QC</div>
                </div>

                {/* KPI Card: Monthly Revenue */}
                <div className="bg-surface p-lg rounded-xl border border-outline-variant soft-shadow flex flex-col gap-base">
                    <div className="flex justify-between items-start">
                        <span className="text-label-md text-on-surface-variant">Monthly Revenue</span>
                        <div className="p-2 bg-tertiary/10 rounded-lg">
                            <span className="material-symbols-outlined text-tertiary">payments</span>
                        </div>
                    </div>
                    <div className="text-headline-lg font-headline-lg text-on-surface">R$ 42.8k</div>
                    <div className="flex items-center gap-1 text-label-sm text-secondary font-bold">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        5.2% grow
                    </div>
                </div>

                {/* KPI Card: Average Rating */}
                <div className="bg-surface p-lg rounded-xl border border-outline-variant soft-shadow flex flex-col gap-base hover-shadow transition-shadow cursor-pointer" onClick={() => navigate('/pharmacy/reviews')}>
                    <div className="flex justify-between items-start">
                        <span className="text-label-md text-on-surface-variant">Average Rating</span>
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <span className="material-symbols-outlined text-yellow-600" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        </div>
                    </div>
                    <div className="text-headline-lg font-headline-lg text-on-surface">4.9/5.0</div>
                    <div className="text-label-sm text-on-surface-variant">98% customer satisfaction</div>
                </div>
            </div>

            {/* Layout: Recent Quotes and Production Queue */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
                {/* 2. Recent Quote Requests */}
                <div className="xl:col-span-2 bg-surface rounded-xl border border-outline-variant soft-shadow overflow-hidden flex flex-col">
                    <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-white/50 backdrop-blur-md">
                        <h3 className="font-headline-md text-headline-md text-on-surface">Recent Quote Requests</h3>
                        <button onClick={() => navigate('/pharmacy/requests')} className="text-primary font-label-md hover:underline">Ver todos</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low text-label-md text-on-surface-variant">
                                    <th className="px-lg py-md font-semibold">Paciente</th>
                                    <th className="px-lg py-md font-semibold">Medicação/Tipo</th>
                                    <th className="px-lg py-md font-semibold text-center">Data</th>
                                    <th className="px-lg py-md font-semibold text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant">
                                {pendingRequests.slice(0, 4).map((req, i) => {
                                    const colors = ['primary', 'secondary', 'tertiary', 'error'];
                                    const colorClass = colors[i % colors.length];
                                    return (
                                        <tr key={req.id} className="hover:bg-surface-container-lowest transition-colors">
                                            <td className="px-lg py-md">
                                                <div className="flex items-center gap-md">
                                                    <div className={`w-8 h-8 rounded-full bg-${colorClass}/10 flex items-center justify-center text-${colorClass} font-bold`}>
                                                        {req.user.initials}
                                                    </div>
                                                    <span className="font-medium text-on-surface">{req.user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-lg py-md text-on-surface-variant truncate max-w-[200px]">{req.medications.join(', ')}</td>
                                            <td className="px-lg py-md text-center text-on-surface-variant whitespace-nowrap">{req.createdAt}</td>
                                            <td className="px-lg py-md text-right">
                                                <button 
                                                    onClick={() => navigate('/pharmacy/requests')}
                                                    className="bg-primary-container text-on-primary py-xs px-md rounded-lg font-label-md transition-all active:scale-95 whitespace-nowrap"
                                                >
                                                    View & Quote
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Production Queue */}
                <div className="bg-surface rounded-xl border border-outline-variant soft-shadow flex flex-col h-full">
                    <div className="p-lg border-b border-outline-variant flex justify-between items-center">
                        <h3 className="font-headline-md text-headline-md text-on-surface">Production Queue</h3>
                        <button onClick={() => navigate('/pharmacy/orders')}><span className="material-symbols-outlined text-on-surface-variant">more_vert</span></button>
                    </div>
                    <div className="p-lg space-y-md overflow-y-auto no-scrollbar">
                        {productionQueue.map((item) => (
                            <div key={item.id} className="p-md rounded-lg border border-outline-variant bg-white flex flex-col gap-sm hover-shadow transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-on-surface">Ord {item.id}</p>
                                        <p className="text-label-sm text-on-surface-variant">{item.room}</p>
                                    </div>
                                    <div 
                                        className="px-2 py-1 rounded text-label-sm font-bold uppercase tracking-wider"
                                        style={{ backgroundColor: `${item.color}1A`, color: item.color }}
                                    >
                                        {item.stage}
                                    </div>
                                </div>
                                <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full transition-all duration-1000" style={{ backgroundColor: item.bg, width: `${item.progress}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Asymmetric / Glassmorphism Extra: Inventory Alerts */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-xl text-on-primary">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-lg">
                    <div className="space-y-sm text-center md:text-left">
                        <h4 className="font-headline-md text-headline-md font-bold">Inventário Crítico</h4>
                        <p className="text-body-md opacity-90 max-w-lg">
                            3 substâncias (Metformina, Lisinopril, Loratadina) atingiram o estoque de segurança. Reabasteça para evitar interrupções na produção.
                        </p>
                    </div>
                    <button className="bg-white text-primary font-bold py-md px-xl rounded-xl shadow-lg hover:bg-surface transition-all active:scale-95 whitespace-nowrap">
                        Gerenciar Estoque
                    </button>
                </div>
            </div>
        </div>
    );
}
