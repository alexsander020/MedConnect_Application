import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Carregando informações...' }) {
  return (
    <div className="empty-state animate-scale-in" style={{ padding: 'var(--space-8)' }} data-testid="loading-state">
      <Loader2 className="animate-spin text-primary" size={36} style={{ margin: '0 auto var(--space-3)' }} />
      <p className="text-sm text-gray">{message}</p>
    </div>
  );
}
