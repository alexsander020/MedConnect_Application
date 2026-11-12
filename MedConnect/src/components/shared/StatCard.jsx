import { cn } from 'cn';
import { CountingNumber } from '@animate-ui/react/primitives/texts/counting-number';

/**
 * Card de métrica. `value` numérico anima com CountingNumber (Animate UI).
 * Para valores já formatados (ex.: "R$ 1.234,00") passe `display`.
 */
export default function StatCard({ icon: Icon, label, value, display, suffix, hint, tone = 'primary', className, decimals = 0 }) {
  const toneCls = {
    primary: 'bg-accent text-primary',
    coral: 'bg-coral-wash text-coral',
    amber: 'bg-amber-wash text-amber',
    info: 'bg-info-wash text-info',
    neutral: 'bg-muted text-muted-foreground',
  }[tone];
  const isNumber = typeof value === 'number' && Number.isFinite(value);
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)]', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('inline-flex size-9 items-center justify-center rounded-full', toneCls)}>
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="num mt-2 text-[1.875rem] leading-none tracking-tight text-foreground">
        {display ?? (isNumber ? (
          <CountingNumber number={value} decimalPlaces={decimals} decimalSeparator="," thousandSeparator="." />
        ) : (value ?? '—'))}
        {suffix && <span className="ml-1 text-base font-medium text-muted-foreground">{suffix}</span>}
      </p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}
