import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, LinkIcon, TimerOff } from 'lucide-react';
import { authApi } from '@/services/endpoints';
import { useToast } from '@/context/ToastContext';
import { PasswordRules } from '@/components/account/ChangePasswordCard';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FadeUp } from '@/components/motion';
import { ehSenhaForte } from '@/utils/validacoes';
import AuthLayout from './components/AuthLayout';
import { AuthHeading, AuthStatus, FormAlert, FormField, PasswordInput, TextInput } from './components/AuthFields';
import { authErrorMessage, errorCode, focusById } from './components/auth-helpers';

const WEAK_MESSAGE = 'A nova senha precisa atender a todos os requisitos abaixo.';

function BackToLogin() {
  return (
    <p className="mt-8 text-center text-sm">
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para o login
      </Link>
    </p>
  );
}

/** Sem token na URL: orienta a abrir o link do e-mail ou colar o código recebido */
function MissingToken({ onToken }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  return (
    <AuthStatus
      icon={LinkIcon}
      tone="warning"
      eyebrow="Redefinir senha"
      title="Link de redefinição incompleto"
      titleId="reset-missing-title"
    >
      <p>Abra o link exatamente como ele chegou no seu e-mail. Se você recebeu um código, cole-o abaixo.</p>
      <form
        noValidate
        className="mt-2 grid gap-4 text-foreground"
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim()) {
            setError('Cole o código recebido por e-mail.');
            focusById('reset-code');
            return;
          }
          onToken(code.trim());
        }}
      >
        <FormField id="reset-code" label="Código de recuperação" error={error}>
          {(a11y) => (
            <TextInput
              {...a11y}
              name="token"
              autoComplete="one-time-code"
              autoCapitalize="none"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
            />
          )}
        </FormField>
        <Button type="submit" size="lg" className="w-full">
          Continuar
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/forgot-password">Solicitar um novo link</Link>
        </Button>
      </form>
    </AuthStatus>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = (searchParams.get('token') || '').trim();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [expired, setExpired] = useState(false);

  const mutation = useMutation({ mutationFn: () => authApi.resetPassword(token, password) });

  useEffect(() => {
    if (expired) focusById('reset-expired-title');
  }, [expired]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mutation.isPending) return;
    setFailure(null);

    const found = {};
    if (!ehSenhaForte(password)) found.password = WEAK_MESSAGE;
    if (!confirm) found.confirm = 'Confirme a nova senha.';
    else if (confirm !== password) found.confirm = 'As senhas não coincidem.';
    setErrors(found);
    if (found.password) return focusById('reset-password');
    if (found.confirm) return focusById('reset-confirm');

    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Use a nova senha para entrar na sua conta.', 'Senha redefinida');
        navigate('/login', { replace: true });
      },
      onError: (err) => {
        const code = errorCode(err);
        if (code === 'INVALID_OR_EXPIRED_TOKEN') {
          setExpired(true);
        } else if (code === 'WEAK_PASSWORD') {
          setErrors({ password: WEAK_MESSAGE });
          focusById('reset-password');
        } else {
          setFailure(authErrorMessage(err, 'Não foi possível redefinir a senha. Tente novamente.'));
        }
      },
    });
  };

  if (!token) {
    return (
      <AuthLayout audience="account">
        <MissingToken onToken={(value) => setSearchParams({ token: value }, { replace: true })} />
        <BackToLogin />
      </AuthLayout>
    );
  }

  if (expired) {
    return (
      <AuthLayout audience="account">
        <AuthStatus
          icon={TimerOff}
          tone="warning"
          eyebrow="Redefinir senha"
          title="Este link expirou ou já foi usado"
          titleId="reset-expired-title"
          actions={
            <>
              <Button asChild size="lg" className="w-full">
                <Link to="/forgot-password">Solicitar um novo link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">Voltar para o login</Link>
              </Button>
            </>
          }
        >
          <p>Por segurança, cada link de redefinição vale por 1 hora e só pode ser usado uma vez.</p>
        </AuthStatus>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout audience="account">
      <AuthHeading
        eyebrow="Redefinir senha"
        title="Crie uma nova senha"
        description="Escolha uma senha forte que você não use em outros sites. Depois, entre com ela normalmente."
      />
      <FadeUp delay={0.08} y={12} duration={0.6}>
        <form noValidate onSubmit={handleSubmit} className="grid gap-5" aria-busy={mutation.isPending || undefined}>
          {failure && <FormAlert title="Não foi possível redefinir a senha">{failure}</FormAlert>}
          <FormField id="reset-password" label="Nova senha" error={errors.password}>
            {(a11y) => (
              <>
                <PasswordInput
                  {...a11y}
                  aria-describedby={[a11y['aria-describedby'], 'reset-password-rules'].filter(Boolean).join(' ')}
                  name="new-password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />
                <div id="reset-password-rules">
                  <PasswordRules value={password} />
                </div>
              </>
            )}
          </FormField>
          <FormField id="reset-confirm" label="Confirmar nova senha" error={errors.confirm}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                name="confirm-password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                }}
              />
            )}
          </FormField>
          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner aria-hidden="true" /> Salvando...
              </>
            ) : (
              <>
                <KeyRound aria-hidden="true" /> Salvar nova senha
              </>
            )}
          </Button>
        </form>
        <BackToLogin />
      </FadeUp>
    </AuthLayout>
  );
}
