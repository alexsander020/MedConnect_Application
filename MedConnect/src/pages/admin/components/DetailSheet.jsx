import { ScrollText } from 'lucide-react';
import { cn } from 'cn';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';

/**
 * Painel lateral de detalhe (Radix Dialog → Sheet, animado pelo Animate UI).
 * Cabeçalho fixo, corpo rolável e rodapé de ações fixo.
 */
export default function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  badges,
  isLoading = false,
  isError = false,
  onRetry,
  errorTitle = 'Não foi possível carregar os detalhes',
  footer,
  children,
}) {
  const ready = !isLoading && !isError;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="gap-1 border-b border-border px-5 py-5 pr-14">
          <SheetTitle className="font-heading text-xl font-semibold leading-tight tracking-tight">{title || 'Detalhes'}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">Painel de detalhes</SheetDescription>
          )}
          {badges && <div className="flex flex-wrap items-center gap-2 pt-2">{badges}</div>}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <LoadingState variant="detail" message="Carregando detalhes..." />
          ) : isError ? (
            <ErrorState title={errorTitle} message="Verifique sua conexão e tente novamente." onRetry={onRetry} />
          ) : (
            <div className="space-y-7">{children}</div>
          )}
        </div>
        {footer && ready && (
          <SheetFooter className="mt-0 border-t border-border bg-background px-5 py-4">{footer}</SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Bloco com título dentro do painel de detalhe */
export function SheetSection({ title, icon: Icon, action, children, className }) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-heading text-[0.9375rem] font-semibold text-foreground">
          {Icon && <Icon className="size-4 text-primary" aria-hidden="true" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Aviso de que a leitura do detalhe fica registrada na trilha de auditoria */
export function AuditNotice({ children, className }) {
  return (
    <p className={cn('flex items-start gap-2.5 rounded-xl border border-border bg-mint-wash px-3.5 py-3 text-xs leading-relaxed text-muted-foreground', className)}>
      <ScrollText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Mini-métrica em grade (dentro de painéis) */
export function MiniStat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 text-lg leading-none text-foreground">{value}</p>
      {hint && <p className="mt-1 text-[0.6875rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}
