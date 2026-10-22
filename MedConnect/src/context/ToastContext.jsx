import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(({ type = 'info', message, title, duration = 4500 }) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { id, type, message, title };

        setToasts((prev) => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    useEffect(() => {
        const handler = (e) => {
            if (e.detail) {
                addToast(e.detail);
            }
        };
        window.addEventListener('app:toast', handler);
        return () => window.removeEventListener('app:toast', handler);
    }, [addToast]);

    const toast = {
        success: (message, title = 'Sucesso') => addToast({ type: 'success', message, title }),
        error: (message, title = 'Erro') => addToast({ type: 'error', message, title }),
        warning: (message, title = 'Atenção') => addToast({ type: 'warning', message, title }),
        info: (message, title = 'Informação') => addToast({ type: 'info', message, title }),
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={20} color="#10b981" />;
            case 'error': return <XCircle size={20} color="#ef4444" />;
            case 'warning': return <AlertTriangle size={20} color="#f59e0b" />;
            default: return <Info size={20} color="#3b82f6" />;
        }
    };

    const getBorderColor = (type) => {
        switch (type) {
            case 'success': return 'rgba(16, 185, 129, 0.4)';
            case 'error': return 'rgba(239, 68, 68, 0.4)';
            case 'warning': return 'rgba(245, 158, 11, 0.4)';
            default: return 'rgba(59, 130, 246, 0.4)';
        }
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* Accessible Toast Container */}
            <div
                aria-live="polite"
                aria-atomic="false"
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxWidth: '380px',
                    width: 'calc(100% - 40px)',
                    pointerEvents: 'none',
                }}
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role="status"
                        className="animate-slide-down"
                        style={{
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '14px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.98)',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${getBorderColor(t.type)}`,
                        }}
                    >
                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                            {getIcon(t.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {t.title && (
                                <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px', color: '#111827' }}>
                                    {t.title}
                                </p>
                            )}
                            <p style={{ fontSize: '13px', margin: 0, color: '#4b5563', lineHeight: 1.4 }}>
                                {t.message}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeToast(t.id)}
                            aria-label="Fechar aviso"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#9ca3af',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        return {
            success: (msg) => console.log('Toast success:', msg),
            error: (msg) => console.error('Toast error:', msg),
            warning: (msg) => console.warn('Toast warning:', msg),
            info: (msg) => console.info('Toast info:', msg),
        };
    }
    return context;
}
