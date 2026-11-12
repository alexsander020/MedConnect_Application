import { Star } from 'lucide-react';
import { cn } from 'cn';

/** Título + linha secundária (nome e e-mail, assunto e prévia…) */
export function TwoLine({ title, subtitle, className }) {
  return (
    <span className={cn('block min-w-0', className)}>
      <span className="block truncate font-medium text-foreground">{title || '—'}</span>
      {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
    </span>
  );
}

/** Nota média compacta: ★ 4,6 (12) */
export function RatingCell({ average, count }) {
  if (!count) return <span className="text-xs text-muted-foreground">Sem avaliações</span>;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Nota ${Number(average || 0).toFixed(1).replace('.', ',')} de 5, ${count} avaliações`}>
      <Star className="size-3.5 fill-amber text-amber" aria-hidden="true" />
      <span className="num">{Number(average || 0).toFixed(1).replace('.', ',')}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </span>
  );
}

/** Texto em fonte numérica tabular (CNPJ, protocolos, IDs) */
export function Num({ children, className }) {
  return <span className={cn('num text-[0.8125rem] font-medium text-foreground', className)}>{children ?? '—'}</span>;
}
