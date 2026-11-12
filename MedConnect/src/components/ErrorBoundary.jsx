import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Última barreira para erros de renderização: em vez de tela branca, mostra um aviso com opção de recarregar.
 * Fica acima dos providers, então usa só HTML + tokens de tema (sem componentes que dependem de contexto).
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro de renderização capturado pelo ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = import.meta.env.BASE_URL || '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-full bg-coral-wash text-coral">
            <AlertCircle className="size-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-xl font-semibold text-foreground">Algo inesperado aconteceu</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Não foi possível exibir esta página. Seus dados estão seguros — recarregue para continuar.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
