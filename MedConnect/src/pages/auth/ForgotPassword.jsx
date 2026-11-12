import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { authApi } from '@/services/endpoints';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FadeUp } from '@/components/motion';
import { ehEmailValido } from '@/utils/validacoes';
import AuthLayout from './components/AuthLayout';
import { AuthHeading, AuthStatus, FormAlert, FormField, IconInput } from './components/AuthFields';
import { NETWORK_MESSAGE, RATE_LIMIT_MESSAGE, errorStatus, focusById, isNetworkError } from './components/auth-helpers';

/**
 * Recuperação de senha. A resposta mostrada é SEMPRE a mesma, exista ou não a conta
 * (anti-enumeração); só falhas que não dependem da conta (rede, limite de tentativas) aparecem como erro.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [failure, setFailure] = useState(null);
  const [sentTo, setSentTo] = useState(null);

  const mutation = useMutation({ mutationFn: (value) => authApi.forgotPassword(value) });

  useEffect(() => {
    if (sentTo) focusById('forgot-sent-title');
  }, [sentTo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mutation.isPending) return;
    setFailure(null);
    const value = email.trim();
    const message = !value ? 'Informe seu e-mail.' : !ehEmailValido(value) ? 'Informe um e-mail válido.' : null;
    setError(message);
    if (message) {
      focusById('forgot-email');
      return;
    }
    mutation.mutate(value, {
      onSuccess: () => setSentTo(value),
      onError: (err) => {
        if (isNetworkError(err)) setFailure(NETWORK_MESSAGE);
        else if (errorStatus(err) === 429) setFailure(RATE_LIMIT_MESSAGE);
        else setSentTo(value); // mesma confirmação neutra para qualquer outra resposta
      },
    });
  };

  const reset = () => {
    setSentTo(null);
    setEmail('');
    mutation.reset();
  };

  if (sentTo) {
    return (
      <AuthLayout audience="account">
        <AuthStatus
            icon={MailCheck}
            eyebrow="Pedido recebido"
            title="Confira seu e-mail"
            titleId="forgot-sent-title"
            actions={
              <>
                <Button asChild size="lg" className="w-full">
                  <Link to="/login">Voltar para o login</Link>
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={reset}>
                  Usar outro e-mail
                </Button>
              </>
            }
          >
            <p>
              Se houver uma conta MedConnect com o e-mail{' '}
              <strong className="font-medium break-all text-foreground">{sentTo}</strong>, você vai receber as
              instruções para criar uma nova senha. O link vale por 1 hora.
            </p>
            <ul className="grid gap-2 rounded-xl bg-mint-wash p-4 text-sm">
              <li>Não chegou em alguns minutos? Confira as pastas de spam e promoções.</li>
              <li>Vale para contas de paciente e de farmácia.</li>
            </ul>
        </AuthStatus>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout audience="account">
      <AuthHeading
        eyebrow="Recuperar acesso"
        title="Esqueceu a senha?"
        description="Informe o e-mail da sua conta de paciente ou de farmácia. Enviaremos as instruções para criar uma nova senha."
      />
      <FadeUp delay={0.08} y={12} duration={0.6}>
        <form noValidate onSubmit={handleSubmit} className="grid gap-5" aria-busy={mutation.isPending || undefined}>
          {failure && <FormAlert title="Não foi possível enviar agora">{failure}</FormAlert>}
          <FormField id="forgot-email" label="E-mail" error={error}>
            {(a11y) => (
              <IconInput
                {...a11y}
                icon={Mail}
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
              />
            )}
          </FormField>
          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner aria-hidden="true" /> Enviando...
              </>
            ) : (
              'Enviar instruções'
            )}
          </Button>
        </form>
        <p className="mt-8 text-center text-sm">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para o login
          </Link>
        </p>
      </FadeUp>
    </AuthLayout>
  );
}
