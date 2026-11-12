import { useEffect, useState } from 'react';
import { cn } from 'cn';
import { computeOpenStatus, describeOpenStatus } from '@/lib/business-hours';

/**
 * Pílula "Aberta até 18h30" / "Fechada — abre amanhã às 9h".
 * Recalcula a cada minuto a partir dos horários (ou usa `status` pronto, se não houver horários).
 * Ponto pulsa suavemente (2s, só opacidade).
 */
export default function OpenStatusPill({ hours, timezone, status, label: labelOverride, tone: toneOverride, size = 'md', className }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!hours) return undefined;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [hours]);

  const computed = hours ? computeOpenStatus(hours, timezone, now) : status;
  const { tone, label } = describeOpenStatus(computed);
  const finalTone = toneOverride || tone;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-background font-medium text-foreground',
        size === 'sm' ? 'h-6 px-2.5 text-xs' : 'h-8 px-3 text-sm',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2 rounded-full animate-pulse-soft',
          finalTone === 'open' ? 'bg-primary' : finalTone === 'closed' ? 'bg-coral' : 'bg-muted-foreground/50'
        )}
      />
      <span className="num font-medium">{labelOverride || label}</span>
    </span>
  );
}
