import { useNavigate } from 'react-router-dom';
import { Pill, Shield, ArrowRight, Activity, Clock, CheckCircle2, Star, Sparkles, Building2, User } from 'lucide-react';

export default function Welcome() {
    const navigate = useNavigate();

    return (
        <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Animated Aurora Blobs */}
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />
            <div className="aurora-blob aurora-blob-3" />

            {/* Floating Glass Header */}
            <header style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: 'var(--space-4) var(--space-8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
                position: 'fixed',
                top: 0,
                width: '100%',
                zIndex: 100,
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: '42px', height: '42px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)'
                    }}>
                        <Pill size={24} color="white" />
                    </div>
                    <div>
                        <span style={{ fontSize: 'var(--font-xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>
                            Med<span className="gradient-text">Connect</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -2 }}>
                            <span className="neon-pulse" />
                            <span style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>Plataforma Ativa</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <button 
                        className="btn btn-ghost"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        onClick={() => navigate('/login', { state: { type: 'pharmacy' } })}
                    >
                        <Building2 size={16} />
                        Área da Farmácia
                    </button>
                    <button 
                        className="btn btn-glass-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 'var(--radius-full)' }}
                        onClick={() => navigate('/login', { state: { type: 'user' } })}
                    >
                        <User size={16} />
                        Entrar / Cadastro
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <main style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '140px var(--space-6) var(--space-16)',
                position: 'relative',
                zIndex: 1
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 'var(--space-12)',
                    alignItems: 'center',
                }}>
                    {/* Left Column: Headline and Call-to-actions */}
                    <div className="animate-slide-down">
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <span className="glass-pill glass-pill-primary">
                                <Sparkles size={14} color="var(--primary-600)" />
                                O Marketplace nº 1 de Manipulação no Brasil
                            </span>
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
                            fontWeight: 900,
                            lineHeight: 1.1,
                            marginBottom: 'var(--space-5)',
                            color: 'var(--gray-900)'
                        }}>
                            Suas receitas manipuladas com o <span className="gradient-text">melhor preço e rapidez.</span>
                        </h1>

                        <p style={{
                            fontSize: 'var(--font-lg)',
                            color: 'var(--gray-600)',
                            marginBottom: 'var(--space-8)',
                            maxWidth: '540px',
                            lineHeight: 1.6
                        }}>
                            Envie sua foto ou PDF da receita médica. Receba orçamentos de farmácias credenciadas da sua região em minutos e economize até 40% com segurança certificada.
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                            <button
                                className="btn btn-glass-primary btn-lg"
                                style={{ borderRadius: 'var(--radius-xl)', padding: '14px 28px', fontSize: '1rem', fontWeight: 700 }}
                                onClick={() => navigate('/login', { state: { type: 'user' } })}
                            >
                                Solicitar Cotação Grátis
                                <ArrowRight size={20} />
                            </button>
                            <button
                                className="btn btn-outline btn-lg"
                                style={{
                                    borderRadius: 'var(--radius-xl)',
                                    padding: '14px 24px',
                                    background: 'rgba(255, 255, 255, 0.7)',
                                    borderColor: 'rgba(203, 213, 225, 0.8)',
                                    fontWeight: 600,
                                    color: 'var(--gray-700)'
                                }}
                                onClick={() => navigate('/login', { state: { type: 'pharmacy' } })}
                            >
                                Cadastrar Farmácia
                            </button>
                        </div>

                        {/* Trust markers */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={18} color="var(--success)" />
                                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-700)', fontWeight: 500 }}>
                                    Farmácias Certificadas Anvisa
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Shield size={18} color="var(--primary-600)" />
                                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-700)', fontWeight: 500 }}>
                                    Privacidade LGPD Garantida
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Live Interactive Glass Preview Card */}
                    <div className="animate-scale-in" style={{ position: 'relative' }}>
                        <div className="glass-panel" style={{
                            padding: 'var(--space-8)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 12, height: 12, borderRadius: '50%', background: '#ef4444'
                                    }} />
                                    <div style={{
                                        width: 12, height: 12, borderRadius: '50%', background: '#f59e0b'
                                    }} />
                                    <div style={{
                                        width: 12, height: 12, borderRadius: '50%', background: '#10b981'
                                    }} />
                                    <span style={{ fontSize: '13px', color: 'var(--gray-500)', marginLeft: 8, fontWeight: 600 }}>
                                        Cotação em Andamento #8942
                                    </span>
                                </div>
                                <span className="glass-pill glass-pill-primary">
                                    3 propostas
                                </span>
                            </div>

                            {/* Quote Simulation Item 1 (Best price highlight) */}
                            <div className="glass-card" style={{
                                padding: 'var(--space-4) var(--space-5)',
                                marginBottom: 'var(--space-3)',
                                border: '1.5px solid var(--primary-400)',
                                background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Farmácia Arte & Fórmula</span>
                                            <span style={{
                                                background: 'var(--success)', color: 'white', fontSize: '10px',
                                                fontWeight: 700, padding: '2px 6px', borderRadius: 6
                                            }}>
                                                MELHOR PREÇO
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>4.9</span>
                                            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>(248 avaliações) • 2.1 km</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--primary-700)' }}>
                                            R$ 68,50
                                        </span>
                                        <p style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>Economia de 32%</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '12px', color: 'var(--gray-500)' }}>
                                    <span>📦 Entrega em até 24h</span>
                                    <span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Frete Grátis</span>
                                </div>
                            </div>

                            {/* Quote Simulation Item 2 */}
                            <div className="glass-card" style={{
                                padding: 'var(--space-4) var(--space-5)',
                                opacity: 0.85
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Manipula & Vida</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>4.8</span>
                                            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>• 4.5 km</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--gray-800)' }}>
                                            R$ 84,00
                                        </span>
                                        <p style={{ fontSize: '11px', color: 'var(--gray-400)' }}>Entrega em 2 dias</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats bar */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 'var(--space-3)',
                                marginTop: 'var(--space-6)',
                                paddingTop: 'var(--space-5)',
                                borderTop: '1px solid rgba(226, 232, 240, 0.8)',
                                textAlign: 'center'
                            }}>
                                <div>
                                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>+15 mil</p>
                                    <p style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Cotações Realizadas</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--primary-600)' }}>4.9 ★</p>
                                    <p style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Satisfação</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>+400</p>
                                    <p style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Farmácias Ativas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div style={{ maxWidth: '1200px', margin: '80px auto 0', width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
                        <span className="glass-pill" style={{ marginBottom: 'var(--space-3)' }}>
                            Como funciona
                        </span>
                        <h2 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
                            Tudo o que você precisa em uma única plataforma
                        </h2>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: 'var(--space-6)'
                    }}>
                        {[
                            {
                                icon: <Activity size={26} color="var(--primary-600)" />,
                                title: 'Cotação Expressa',
                                desc: 'Envie sua receita em segundos e receba múltiplos orçamentos diretamente no celular sem sair de casa.'
                            },
                            {
                                icon: <Star size={26} color="#f59e0b" />,
                                title: 'Comparador Transparente',
                                desc: 'Compare preços, prazos de entrega e avaliações de outros pacientes de maneira simples e clara.'
                            },
                            {
                                icon: <Shield size={26} color="var(--primary-700)" />,
                                title: 'Segurança Médica',
                                desc: 'Seus dados e receitas são criptografados de ponta a ponta em conformidade rigorosa com a LGPD.'
                            },
                            {
                                icon: <Clock size={26} color="#6366f1" />,
                                title: 'Rastreamento em Tempo Real',
                                desc: 'Acompanhe todas as etapas: da aprovação da fórmula até a manipulação e entrega na sua porta.'
                            }
                        ].map((feature, i) => (
                            <div key={i} className="glass-card" style={{
                                padding: 'var(--space-6)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-3)'
                            }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: 'var(--radius-lg)',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {feature.icon}
                                </div>
                                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--gray-900)' }}>
                                    {feature.title}
                                </h3>
                                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)', lineHeight: 1.6 }}>
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
