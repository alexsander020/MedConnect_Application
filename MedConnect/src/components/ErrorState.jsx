import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { FadeUp } from '@/components/motion';

export default function ErrorState({
  title = 'Ocorreu um erro ao carregar os dados',
  message = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  onRetry,
  className,
}) {
  return (
    <FadeUp
      duration={0.4}
      y={8}
      role="alert"
      data-testid="error-state"
      className={cn('flex flex-col items-center rounded-2xl border border-[color-mix(in_oklab,var(--coral)_30%,var(--border))] bg-coral-wash/60 px-6 py-12 text-center', className)}
    >
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-coral-wash text-coral">
        <AlertCircle className="size-6" aria-hidden="true" />
      </span>
      <h3 className="font-heading text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {typeof message === 'string' ? message : message?.message || 'Não foi possível carregar os dados.'}
      </p>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry} className="mt-5" data-testid="retry-button">
          <RefreshCw aria-hidden="true" />
          Tentar novamente
        </Button>
      )}
    </FadeUp>
  );
}
