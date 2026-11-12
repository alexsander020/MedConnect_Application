import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import {
  ToastProvider as RadixToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
} from '@/components/ui/toast';

/**
 * Central de avisos (toasts) da aplicação, sobre Radix UI Toast.
 *
 * API compatível com a versão anterior:
 *   const toast = useToast();
 *   toast.success('Mensagem', 'Título opcional');
 *   toast.error(...), toast.warning(...), toast.info(...)
 * API nova (opções completas):
 *   toast.show({ type: 'success', title, message, duration, action: { label, onClick } })
 * Fora do React (ex.: Socket.IO): window.dispatchEvent(new CustomEvent('app:toast', { detail: { type, title, message } }))
 */

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 className="size-5 text-success" aria-hidden="true" />,
  error: <XCircle className="size-5 text-destructive" aria-hidden="true" />,
  warning: <AlertTriangle className="size-5 text-amber" aria-hidden="true" />,
  info: <Info className="size-5 text-info" aria-hidden="true" />,
};

const DEFAULT_TITLES = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Informação',
};

const MAX_VISIBLE = 4;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    // Remove do DOM depois da animação de saída (160ms)
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220);
  }, []);

  const show = useCallback(({ type = 'info', title, message, duration = 4500, action } = {}) => {
    counter.current += 1;
    const id = `toast-${Date.now()}-${counter.current}`;
    const variant = ICONS[type] ? type : 'info';
    setToasts((prev) => [
      ...prev.slice(-(MAX_VISIBLE - 1)),
      { id, type: variant, title: title ?? DEFAULT_TITLES[variant], message, duration, action, open: true },
    ]);
    return id;
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail) show(e.detail);
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, [show]);

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, title) => show({ type: 'success', message, title }),
      error: (message, title) => show({ type: 'error', message, title, duration: 6500 }),
      warning: (message, title) => show({ type: 'warning', message, title, duration: 6000 }),
      info: (message, title) => show({ type: 'info', message, title }),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      <RadixToastProvider swipeDirection="right" label="Notificações">
        {children}
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.type}
            open={t.open}
            duration={t.duration}
            type={t.type === 'error' ? 'foreground' : 'background'}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <div className="min-w-0 flex-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.message && <ToastDescription>{t.message}</ToastDescription>}
              {t.action && (
                <ToastAction altText={t.action.label} onClick={t.action.onClick}>
                  {t.action.label}
                </ToastAction>
              )}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  );
}

const fallback = {
  show: () => {},
  dismiss: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
};

export function useToast() {
  return useContext(ToastContext) || fallback;
}
