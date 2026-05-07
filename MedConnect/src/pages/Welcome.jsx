import { useNavigate } from 'react-router-dom';
import { Pill, Heart, Shield, ArrowRight, Activity, Clock } from 'lucide-react';

export default function Welcome() {
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gray-50)' }}>
            {/* Header */}
            <header style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                padding: 'var(--space-4) var(--space-8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--gray-200)',
                position: 'fixed',
                top: 0,
                width: '100%',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                        background: 'var(--gradient-primary)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Pill size={24} color="white" />
                    </div>
                    <span style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>
                        Med<span style={{ color: 'var(--primary-600)' }}>Connect</span>
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <button 
                        className="btn btn-ghost"
                        onClick={() => navigate('/login', { state: { type: 'pharmacy' } })}
                    >
                        Sou Farmácia
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => navigate('/login', { state: { type: 'user' } })}
                    >
                        Sou Paciente
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <main style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                padding: '120px var(--space-8) var(--space-12)',
                background: 'var(--gradient-hero)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative circles */}
                <div style={{
                    position: 'absolute', top: '-10%', right: '5%',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: 'rgba(13,148,136,0.15)', filter: 'blur(60px)',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-10%', left: '10%',
                    width: '300px', height: '300px', borderRadius: '50%',
                    background: 'rgba(99,102,241,0.15)', filter: 'blur(60px)',
                }} />

                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-12)',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <div className="animate-slide-right">
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', marginBottom: 'var(--space-4)' }}>
                            Inovação em Saúde
                        </span>
                        <h1 style={{
                            fontSize: '4rem', fontWeight: 800,
                            lineHeight: 1.1, marginBottom: 'var(--space-6)',
                            letterSpacing: '-0.02em',
                        }}>
                            Suas receitas manipuladas, de forma <span style={{ color: 'var(--primary-300)' }}>simples e rápida.</span>
                        </h1>
                        <p style={{
                            fontSize: 'var(--font-xl)', color: 'var(--gray-300)',
                            marginBottom: 'var(--space-8)', maxWidth: '500px',
                            lineHeight: 1.6
                        }}>
                            Envie sua receita, receba cotações de diversas farmácias de confiança da sua região e escolha o melhor preço e prazo de entrega.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => navigate('/login', { state: { type: 'user' } })}
                            >
                                Fazer uma Cotação
                                <ArrowRight size={20} />
                            </button>
                            <button
                                className="btn btn-outline btn-lg"
                                onClick={() => navigate('/login', { state: { type: 'pharmacy' } })}
                                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            >
                                Área da Farmácia
                            </button>
                        </div>
                    </div>

                    {/* Features Grid side */}
                    <div className="animate-scale-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        {[
                            { icon: <Activity size={24} />, title: 'Cotação Expressa', desc: 'Receba orçamentos em minutos.' },
                            { icon: <Heart size={24} />, title: 'Qualidade Garantida', desc: 'Apenas farmácias certificadas.' },
                            { icon: <Shield size={24} />, title: 'Segurança Total', desc: 'Seus dados médicos protegidos.' },
                            { icon: <Clock size={24} />, title: 'Acompanhamento', desc: 'Saiba o status do seu pedido.' }
                        ].map((feature, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-xl)',
                                padding: 'var(--space-6)',
                                transition: 'transform 0.3s ease',
                            }} className="card-hover-effect">
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                                    background: 'rgba(13,148,136,0.2)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--primary-300)', marginBottom: 'var(--space-4)'
                                }}>
                                    {feature.icon}
                                </div>
                                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{feature.title}</h3>
                                <p style={{ color: 'var(--gray-300)', fontSize: 'var(--font-sm)' }}>{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
