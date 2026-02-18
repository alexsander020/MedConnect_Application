import { useNavigate } from 'react-router-dom';
import { Pill, Heart, Shield, ArrowRight } from 'lucide-react';

export default function Welcome() {
    const navigate = useNavigate();

    return (
        <div className="app-container" style={{
            background: 'var(--gradient-hero)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'var(--space-6)',
        }}>
            {/* Decorative circles */}
            <div style={{
                position: 'absolute', top: '-60px', right: '-60px',
                width: '200px', height: '200px', borderRadius: '50%',
                background: 'rgba(13,148,136,0.2)', filter: 'blur(40px)',
            }} />
            <div style={{
                position: 'absolute', bottom: '20%', left: '-40px',
                width: '150px', height: '150px', borderRadius: '50%',
                background: 'rgba(99,102,241,0.15)', filter: 'blur(40px)',
            }} />

            {/* Logo */}
            <div className="animate-scale-in" style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
                <div style={{
                    width: '90px', height: '90px', borderRadius: 'var(--radius-2xl)',
                    background: 'var(--gradient-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto', boxShadow: 'var(--shadow-glow-lg)',
                }}>
                    <Pill size={44} color="white" />
                </div>
                <h1 style={{
                    fontSize: 'var(--font-4xl)', fontWeight: 800,
                    color: 'white', marginTop: 'var(--space-5)',
                    letterSpacing: '-0.02em',
                }}>
                    Med<span style={{ color: 'var(--primary-300)' }}>Connect</span>
                </h1>
                <p style={{
                    color: 'var(--gray-400)', fontSize: 'var(--font-base)',
                    marginTop: 'var(--space-2)', maxWidth: '280px', margin: 'var(--space-2) auto 0',
                }}>
                    Conectando você às melhores farmácias de manipulação
                </p>
            </div>

            {/* Features */}
            <div className="stagger" style={{
                display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                marginBottom: 'var(--space-10)',
            }}>
                {[
                    { icon: <Pill size={18} />, text: 'Cotações rápidas de medicamentos' },
                    { icon: <Heart size={18} />, text: 'Farmácias avaliadas e confiáveis' },
                    { icon: <Shield size={18} />, text: 'Envio seguro de receitas médicas' },
                ].map((feature, i) => (
                    <div key={i} className="animate-slide-right" style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 'var(--radius-lg)',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                            background: 'rgba(13,148,136,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary-300)',
                        }}>
                            {feature.icon}
                        </div>
                        <span style={{ color: 'var(--gray-300)', fontSize: 'var(--font-sm)' }}>
                            {feature.text}
                        </span>
                    </div>
                ))}
            </div>

            {/* Buttons */}
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <button
                    className="btn btn-primary btn-lg btn-block"
                    onClick={() => navigate('/login', { state: { type: 'user' } })}
                >
                    Sou Paciente
                    <ArrowRight size={20} />
                </button>
                <button
                    className="btn btn-outline btn-lg btn-block"
                    onClick={() => navigate('/login', { state: { type: 'pharmacy' } })}
                    style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                >
                    Sou Farmácia
                    <ArrowRight size={20} />
                </button>
            </div>

            {/* Footer */}
            <p style={{
                textAlign: 'center', color: 'var(--gray-500)',
                fontSize: 'var(--font-xs)', marginTop: 'var(--space-8)',
            }}>
                Ao continuar, você concorda com nossos Termos de Uso
            </p>
        </div>
    );
}
