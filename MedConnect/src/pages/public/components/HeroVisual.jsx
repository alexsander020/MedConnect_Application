import { Check, FileText, Lock } from 'lucide-react';
import { cn } from 'cn';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import { ClipReveal } from '@/components/motion';
import { formatCents } from '@/lib/format';

/**
 * Composição de produto do hero (sem imagens): receita enviada + cotações de exemplo.
 * É uma ilustração — valores e nomes são genéricos e a legenda diz isso.
 */
const SAMPLE_QUOTES = [
  {
    label: 'Farmácia credenciada A',
    priceCents: 8990,
    days: 3,
    status: { isOpen: true, closesAt: '19:00', nextOpening: null },
    chosen: true,
  },
  {
    label: 'Farmácia credenciada B',
    priceCents: 9450,
    days: 2,
    status: { isOpen: true, closesAt: '18:30', nextOpening: null },
  },
  {
    label: 'Farmácia credenciada C',
    priceCents: 10200,
    days: 4,
    status: { isOpen: false, closesAt: null, nextOpening: { dayOfWeek: 1, opensAt: '08:00', isToday: false, isTomorrow: true } },
  },
];

function QuoteRow({ quote, className }) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-2xl border bg-background p-3.5 sm:gap-4 sm:p-4',
        quote.chosen
          ? 'border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] shadow-[0_6px_18px_-10px_hsl(168_44%_36%/0.45)]'
          : 'border-border',
        className
      )}
    >
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-sm font-semibold text-primary sm:inline-flex">
        {quote.label.slice(-1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{quote.label}</p>
        <OpenStatusPill status={quote.status} size="sm" className="mt-1.5 h-5 border-0 bg-transparent px-0 text-[0.6875rem] text-muted-foreground" />
      </div>
      <div className="shrink-0 text-right">
        <p className="num text-base text-foreground sm:text-lg">{formatCents(quote.priceCents)}</p>
        <p className="text-xs text-muted-foreground">
          Prazo: <span className="num font-medium text-foreground">{quote.days} dias</span>
        </p>
      </div>
      {quote.chosen && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">
          <Check className="size-3" aria-hidden="true" /> Sua escolha
        </span>
      )}
    </div>
  );
}

export default function HeroVisual({ className }) {
  return (
    <figure className={cn('relative', className)}>
      <ClipReveal duration={1} delay={0.15}>
        <div
          role="img"
          aria-label="Ilustração: uma receita enviada e três cotações de farmácias credenciadas, com preço, prazo e horário de funcionamento."
          className="relative rounded-[1.75rem] bg-mint-wash p-3 sm:p-5"
        >
          <div className="rounded-[1.25rem] border border-border bg-background p-4 shadow-[0_24px_48px_-28px_hsl(190_22%_16%/0.28)] sm:p-5">
            {/* Receita enviada */}
            <div className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3.5 sm:p-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Receita enviada</p>
                <p className="truncate text-xs text-muted-foreground">Fórmula manipulada · PDF</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[0.6875rem] font-medium text-accent-foreground ring-1 ring-border">
                <Lock className="size-3" aria-hidden="true" /> Protegida
              </span>
            </div>

            <div className="mb-3 mt-5 flex items-center justify-between gap-2 px-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cotações recebidas</p>
              <span className="num text-xs text-primary">3</span>
            </div>

            <div className="space-y-3">
              {SAMPLE_QUOTES.map((q, i) => (
                <QuoteRow key={q.label} quote={q} className={i === 2 ? 'hidden sm:flex' : undefined} />
              ))}
            </div>
          </div>
        </div>
      </ClipReveal>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground lg:text-right">Ilustração com valores de exemplo.</figcaption>
    </figure>
  );
}
