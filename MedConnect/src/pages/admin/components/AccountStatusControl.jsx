import { useId, useState } from 'react';
import { Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

/**
 * Suspender / reativar uma conta (usuário ou farmácia).
 *
 * - Suspender exige motivo (5 a 500 caracteres, regra do backend) e fica na trilha de auditoria.
 * - Reativar é sempre permitido (as travas de "própria conta" e "outro admin" valem só para suspender).
 * - `blockedReason` desabilita a suspensão e explica o porquê (ex.: a própria conta, outro admin).
 * - `onSubmit({ status, reason })` deve devolver uma Promise (mutateAsync): o diálogo só fecha no sucesso.
 */
export default function AccountStatusControl({
  status,
  subjectName,
  subjectKind = 'conta',
  blockedReason,
  reasonPlaceholder = 'Ex.: uso indevido da plataforma, pedido do titular…',
  loading = false,
  onSubmit,
}) {
  const [mode, setMode] = useState(null); // 'suspend' | 'reactivate'
  const hintId = useId();
  const suspended = status === 'SUSPENDED';

  const submit = async (reason) => {
    try {
      await onSubmit({ status: mode === 'suspend' ? 'SUSPENDED' : 'ACTIVE', reason: reason || undefined });
      setMode(null);
    } catch {
      // O erro já foi exibido pelo onError da mutação; o diálogo continua aberto para nova tentativa.
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {suspended ? (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ao reativar, o acesso volta a funcionar no próximo login.
          </p>
          <Button type="button" onClick={() => setMode('reactivate')} disabled={loading} className="sm:shrink-0">
            <RotateCcw aria-hidden="true" /> Reativar {subjectKind}
          </Button>
        </>
      ) : (
        <>
          <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
            {blockedReason || 'Suspender bloqueia novos acessos e encerra as sessões abertas (em até 15 minutos) até a reativação.'}
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setMode('suspend')}
            disabled={loading || Boolean(blockedReason)}
            aria-describedby={hintId}
            className="sm:shrink-0"
          >
            <Ban aria-hidden="true" /> Suspender {subjectKind}
          </Button>
        </>
      )}

      <ConfirmDialog
        open={mode === 'suspend'}
        onOpenChange={(open) => !open && !loading && setMode(null)}
        title={`Suspender ${subjectKind}?`}
        description={`"${subjectName}" não poderá mais entrar. As sessões já abertas são encerradas na próxima renovação do acesso (em até 15 minutos).`}
        confirmLabel="Confirmar suspensão"
        destructive
        loading={loading}
        reason={{ label: 'Motivo da suspensão', required: true, minLength: 5, maxLength: 500, placeholder: reasonPlaceholder }}
        onConfirm={submit}
      />
      <ConfirmDialog
        open={mode === 'reactivate'}
        onOpenChange={(open) => !open && !loading && setMode(null)}
        title={`Reativar ${subjectKind}?`}
        description={`"${subjectName}" volta a ter acesso à MedConnect. A reativação fica registrada na trilha de auditoria.`}
        confirmLabel="Confirmar reativação"
        loading={loading}
        onConfirm={() => submit('')}
      />
    </div>
  );
}
