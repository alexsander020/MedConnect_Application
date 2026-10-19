import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nenhum registro encontrado',
  description = 'Não há itens para exibir no momento.',
}) {
  return (
    <div className="empty-state animate-scale-in" style={{ padding: 'var(--space-8)' }} data-testid="empty-state">
      <div
        style={{
          display: 'inline-flex',
          padding: 'var(--space-3)',
          borderRadius: '50%',
          background: 'var(--gray-100)',
          color: 'var(--gray-400)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <Icon size={40} />
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
      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', maxWidth: '380px', margin: '0 auto' }}>
        {description}
      </p>
    </div>
  );
}
