import { cn } from 'cn';
import {
  orderStatuses,
  prescriptionStatuses,
  quoteStatuses,
  pharmacyVerificationStatuses,
  accountStatuses,
  roleLabels,
  supportTicketStatuses,
} from '@/constants/status';

const MAPS = {
  order: orderStatuses,
  prescription: prescriptionStatuses,
  quote: quoteStatuses,
  verification: pharmacyVerificationStatuses,
  account: accountStatuses,
  role: roleLabels,
  ticket: supportTicketStatuses,
};

export const TONES = {
  success: 'bg-success-wash text-success border-[color-mix(in_oklab,var(--success)_25%,transparent)]',
  warning: 'bg-amber-wash text-[hsl(32_80%_32%)] border-[color-mix(in_oklab,var(--amber)_30%,transparent)]',
  error: 'bg-coral-wash text-[hsl(4_62%_42%)] border-[color-mix(in_oklab,var(--coral)_35%,transparent)]',
  info: 'bg-info-wash text-info border-[color-mix(in_oklab,var(--info)_25%,transparent)]',
  primary: 'bg-accent text-accent-foreground border-[color-mix(in_oklab,var(--primary)_25%,transparent)]',
  neutral: 'bg-muted text-muted-foreground border-border',
};

/**
 * <StatusBadge kind="order" status="PRODUCTION" />
 * <StatusBadge tone="success">Texto livre</StatusBadge>
 */
export default function StatusBadge({ kind, status, tone, dot = true, className, children }) {
  const entry = kind && status ? MAPS[kind]?.[status] : null;
  const resolvedTone = tone || entry?.color || 'neutral';
  const label = children ?? entry?.label ?? status ?? '—';
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium',
        TONES[resolvedTone] || TONES.neutral,
        className
      )}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-80" />}
      {label}
    </span>
  );
}
