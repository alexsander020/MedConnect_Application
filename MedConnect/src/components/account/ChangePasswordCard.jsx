import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/context/ToastContext';
import { authApi } from '@/services/endpoints';
import { apiErrorMessage } from '@/lib/format';
import { ehSenhaForte } from '@/utils/validacoes';

const RULES = [
  { test: (v) => v.length >= 8, label: 'Mínimo de 8 caracteres' },
  { test: (v) => /[A-Z]/.test(v), label: 'Uma letra maiúscula' },
  { test: (v) => /\d/.test(v), label: 'Um número' },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: 'Um caractere especial' },
];

export function PasswordRules({ value }) {
  return (
    <ul className="grid gap-1 text-xs sm:grid-cols-2">
      {RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.label} className={ok ? 'text-success' : 'text-muted-foreground'}>
            <span aria-hidden="true">{ok ? '✓' : '•'}</span> {r.label}
            <span className="sr-only">{ok ? ' (atendido)' : ' (pendente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Troca de senha (qualquer papel) — POST /auth/change-password */
export default function ChangePasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const mismatch = form.confirm && form.next !== form.confirm;
  const weak = form.next && !ehSenhaForte(form.next);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(form.current, form.next),
    onSuccess: () => {
      setForm({ current: '', next: '', confirm: '' });
      toast.success('Sua senha foi alterada. Outras sessões abertas foram encerradas.', 'Senha atualizada');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Não foi possível alterar a senha.')),
  });

  const type = show ? 'text' : 'password';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <KeyRound className="size-5 text-primary" aria-hidden="true" /> Senha de acesso
        </CardTitle>
        <CardDescription>Ao trocar a senha, as outras sessões abertas são encerradas por segurança.</CardDescription>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!mismatch && !weak && form.current) mutation.mutate();
        }}
      >
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pw-current">Senha atual</Label>
            <Input id="pw-current" type={type} autoComplete="current-password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pw-next">Nova senha</Label>
              <Input id="pw-next" type={type} autoComplete="new-password" required aria-invalid={!!weak} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pw-confirm">Confirmar nova senha</Label>
              <Input id="pw-confirm" type={type} autoComplete="new-password" required aria-invalid={!!mismatch} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              {mismatch && <p className="text-xs text-destructive">As senhas não coincidem.</p>}
            </div>
          </div>
          <PasswordRules value={form.next} />
        </CardContent>
        <CardFooter className="mt-2 flex flex-wrap justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />} {show ? 'Ocultar senhas' : 'Mostrar senhas'}
          </Button>
          <Button type="submit" disabled={mutation.isPending || !form.current || !form.next || !!mismatch || !!weak}>
            {mutation.isPending && <Spinner />} Alterar senha
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
