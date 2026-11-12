import { useEffect, useId, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

/**
 * Confirmação de ação (Radix AlertDialog animado pelo Animate UI).
 * <ConfirmDialog open onOpenChange title description confirmLabel="Suspender" destructive
 *   reason={{ label: 'Motivo', required: true, minLength: 5 }} loading onConfirm={(reason) => ...} />
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  reason,
  onConfirm,
  children,
}) {
  const [text, setText] = useState('');
  const id = useId();
  useEffect(() => {
    if (!open) setText('');
  }, [open]);

  const min = reason?.minLength ?? (reason?.required ? 5 : 0);
  const invalid = reason?.required && text.trim().length < min;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        {reason && (
          <div className="space-y-2">
            <Label htmlFor={id}>{reason.label || 'Motivo'}{reason.required ? ' *' : ''}</Label>
            <Textarea
              id={id}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={reason.placeholder}
              rows={3}
              maxLength={reason.maxLength || 500}
            />
            {reason.required && (
              <p className="text-xs text-muted-foreground">Mínimo de {min} caracteres. Fica registrado na trilha de auditoria.</p>
            )}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={loading || invalid}
            onClick={(e) => {
              e.preventDefault();
              onConfirm?.(text.trim());
            }}
          >
            {loading && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
