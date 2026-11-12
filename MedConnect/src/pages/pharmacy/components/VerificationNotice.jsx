import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldX, Hourglass, LifeBuoy, Settings } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { FadeUp } from '@/components/motion';

/**
 * Faixa de credenciamento no topo do painel.
 * PENDING_VERIFICATION: explica a análise e o bloqueio de cotações (API responde 403 PHARMACY_NOT_VERIFIED).
 * REJECTED: mostra o motivo informado pela equipe e aponta para o atendimento.
 */
export function VerificationBanner({ status, rejectionReason, className }) {
  if (!status || status === 'VERIFIED') return null;
  const rejected = status === 'REJECTED';
  const Icon = rejected ? ShieldX : Hourglass;
  return (
    <FadeUp
      duration={0.4}
      y={8}
      role="status"
      className={cn(
        'mb-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-start',
        rejected
          ? 'border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash'
          : 'border-[color-mix(in_oklab,var(--amber)_35%,var(--border))] bg-amber-wash',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-background',
          rejected ? 'text-coral' : 'text-amber'
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 className="font-heading text-base font-semibold text-foreground">
          {rejected ? 'Credenciamento recusado' : 'Cadastro em análise pela equipe MedConnect'}
        </h2>
        {rejected ? (
          <>
            <p className="text-sm leading-relaxed text-foreground/80">
              <span className="font-medium text-foreground">Motivo informado:</span>{' '}
              {rejectionReason || 'A equipe não registrou um motivo detalhado.'}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enquanto o credenciamento não for aprovado, o mural de receitas e o envio de cotações ficam bloqueados. Corrija a documentação e abra um chamado pedindo nova análise.
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/80">
            Estamos conferindo licença sanitária, autorização de funcionamento e responsável técnico. Até a aprovação, o mural de receitas e o envio de cotações ficam bloqueados. Você será avisado por notificação assim que a análise terminar.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {!rejected && (
          <Button asChild variant="outline" size="sm" className="bg-background">
            <Link to="/pharmacy/settings"><Settings aria-hidden="true" /> Completar perfil</Link>
          </Button>
        )}
        <Button asChild size="sm" variant={rejected ? 'default' : 'outline'} className={rejected ? undefined : 'bg-background'}>
          <Link to="/pharmacy/support"><LifeBuoy aria-hidden="true" /> Falar com o atendimento</Link>
        </Button>
      </div>
    </FadeUp>
  );
}

/** Estado bloqueado (403 PHARMACY_NOT_VERIFIED) para o mural e o envio de cotação */
export function NotVerifiedState({ status, rejectionReason, title, className }) {
  const rejected = status === 'REJECTED';
  return (
    <FadeUp
      duration={0.4}
      y={8}
      data-testid="not-verified-state"
      className={cn('flex flex-col items-center rounded-2xl border border-dashed border-border bg-mint-wash/60 px-6 py-12 text-center', className)}
    >
      <span className={cn('mb-4 inline-flex size-14 items-center justify-center rounded-full', rejected ? 'bg-coral-wash text-coral' : 'bg-amber-wash text-amber')}>
        <ShieldAlert className="size-6" aria-hidden="true" />
      </span>
      <h2 className="font-heading text-lg font-medium text-foreground">
        {title || (rejected ? 'Credenciamento recusado' : 'Disponível após o credenciamento')}
      </h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {rejected
          ? `Sua farmácia não pode ver receitas nem enviar cotações. ${rejectionReason ? `Motivo: ${rejectionReason}` : ''}`.trim()
          : 'Só farmácias com credenciamento aprovado veem as receitas dos pacientes e enviam cotações. Avisaremos por notificação assim que a análise terminar.'}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link to="/pharmacy/settings">Ver dados do credenciamento</Link>
        </Button>
        <Button asChild>
          <Link to="/pharmacy/support"><LifeBuoy aria-hidden="true" /> Falar com o atendimento</Link>
        </Button>
      </div>
    </FadeUp>
  );
}
