import { useEffect, useId, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const CONFIRM_WORD = 'EXCLUIR';

const CONSEQUENCES = [
  'Seu nome, e-mail, telefone, endereço e CPF são removidos e você perde o acesso a esta conta.',
  'Receitas sem pedido são canceladas e os arquivos, descartados.',
  'Receitas ligadas a pedidos ficam guardadas apenas pelo prazo exigido pela vigilância sanitária.',
  'Todos os consentimentos são revogados e as sessões abertas, encerradas.',
];

/** Confirmação forte (digitar a palavra) para excluir/anonimizar a conta */
export default function DeleteAccountDialog({ open, onOpenChange, loading = false, onConfirm }) {
  const [text, setText] = useState('');
  const id = useId();
  useEffect(() => {
    if (!open) setText('');
  }, [open]);
  const matches = text.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <AlertDialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir sua conta e anonimizar seus dados?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação é definitiva e não pode ser desfeita. Se quiser, exporte seus dados antes.</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="space-y-2 rounded-xl border border-[color-mix(in_oklab,var(--coral)_30%,var(--border))] bg-coral-wash/50 p-4 text-sm leading-relaxed text-foreground">
          {CONSEQUENCES.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
              {c}
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <Label htmlFor={id}>
            Para confirmar, digite <span className="num rounded bg-muted px-1.5 py-0.5 text-foreground">{CONFIRM_WORD}</span>
          </Label>
          <Input
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={loading}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Manter minha conta</AlertDialogCancel>
          <AlertDialogAction
            variant="danger"
            disabled={!matches || loading}
            onClick={(e) => {
              e.preventDefault();
              if (matches) onConfirm?.();
            }}
          >
            {loading && <Spinner />} Excluir conta definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
