import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Ocorreu um erro ao carregar os dados',
  message = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  onRetry,
}) {
  return (
    <div className="empty-state animate-scale-in" style={{ padding: 'var(--space-8)' }} data-testid="error-state">
      <div
        style={{
          display: 'inline-flex',
          padding: 'var(--space-3)',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          marginBottom: 'var(--space-3)',
        }}
      >
        <AlertCircle size={40} />
      </div>
      <h3
        style={{
          fontSize: 'var(--font-lg)',
          fontWeight: 700,
          color: 'var(--gray-900)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 'var(--font-sm)',
          color: 'var(--gray-500)',
          maxWidth: '400px',
          margin: '0 auto var(--space-4)',
        }}
      >
        {typeof message === 'string' ? message : message?.message || 'Não foi possível carregar os dados.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', margin: '0 auto' }}
          data-testid="retry-button"
        >
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
