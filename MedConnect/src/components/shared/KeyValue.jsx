import { cn } from 'cn';

/** Lista de pares rótulo/valor para painéis de detalhe */
export function KeyValueList({ className, children }) {
  return <dl className={cn('divide-y divide-border rounded-xl border border-border bg-card', className)}>{children}</dl>;
}

export function KeyValue({ label, children, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4', className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground">{children ?? '—'}</dd>
    </div>
  );
}
