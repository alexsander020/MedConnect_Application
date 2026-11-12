import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, LinkIcon, MailX, RotateCw } from 'lucide-react';
import { authApi } from '@/services/endpoints';
import { useAuth, homeFor } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from './components/AuthLayout';
import { AuthStatus } from './components/AuthFields';
import { NETWORK_MESSAGE, authErrorMessage, errorCode, focusById, isNetworkError } from './components/auth-helpers';

const SUPPORT_HREF = '/help?category=GENERAL#contato';

/** Confirmação de e-mail: chama a API ao abrir a página com ?token= */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') || '').trim();
  const { isAuthenticated, userType } = useAuth();
  const started = useRef(null);

  const { mutate, status, error } = useMutation({ mutationFn: (value) => authApi.verifyEmail(value) });

  useEffect(() => {
    if (!token || started.current === token) return;
    started.current = token; // evita a chamada dupla do StrictMode
    mutate(token);
  }, [token, mutate]);

  useEffect(() => {
    if (status === 'success' || status === 'error') focusById('verify-title');
  }, [status]);

  const primaryAction = isAuthenticated ? (
    <Button asChild size="lg" className="w-full">
      <Link to={homeFor(userType)}>Ir para o meu painel</Link>
    </Button>
  ) : (
    <Button asChild size="lg" className="w-full">
      <Link to="/login">Entrar na conta</Link>
    </Button>
  );

  let content;
  if (!token) {
    content = (
      <AuthStatus
        icon={LinkIcon}
        tone="warning"
        eyebrow="Confirmação de e-mail"
        title="Link de confirmação incompleto"
        titleId="verify-title"
        actions={
          <>
            {primaryAction}
            <Button asChild variant="ghost" className="w-full">
              <Link to={SUPPORT_HREF}>Falar com o suporte</Link>
            </Button>
          </>
        }
      >
        <p>Abra o link exatamente como ele chegou no seu e-mail. Se o problema continuar, fale com o nosso suporte.</p>
      </AuthStatus>
    );
  } else if (status === 'success') {
    content = (
      <AuthStatus
        icon={CheckCircle2}
        tone="success"
        eyebrow="Confirmação de e-mail"
        title="E-mail confirmado"
        titleId="verify-title"
        actions={primaryAction}
      >
        <p>Tudo certo. Seu e-mail foi confirmado e a conta está pronta para uso.</p>
      </AuthStatus>
    );
  } else if (status === 'error') {
    const expired = errorCode(error) === 'INVALID_OR_EXPIRED_TOKEN';
    const offline = isNetworkError(error);
    content = (
      <AuthStatus
        icon={MailX}
        tone="warning"
        eyebrow="Confirmação de e-mail"
        title={expired ? 'Este link expirou ou já foi usado' : 'Não foi possível confirmar o e-mail'}
        titleId="verify-title"
        actions={
          <>
            {offline ? (
              <Button size="lg" className="w-full" onClick={() => mutate(token)}>
                <RotateCw aria-hidden="true" /> Tentar novamente
              </Button>
            ) : (
              primaryAction
            )}
            <Button asChild variant="ghost" className="w-full">
              <Link to={SUPPORT_HREF}>Falar com o suporte</Link>
            </Button>
          </>
        }
      >
        <p>
          {expired
            ? 'Se você já confirmou o e-mail antes, é só entrar normalmente. Caso contrário, fale com o suporte para receber um novo link.'
            : offline
              ? NETWORK_MESSAGE
              : authErrorMessage(error, 'Tente novamente em instantes.')}
        </p>
      </AuthStatus>
    );
  } else {
    content = (
      <div role="status" className="flex flex-col items-start">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-accent text-primary">
          <Spinner className="size-6" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">Confirmação de e-mail</p>
        <h1 className="mt-2.5 font-heading text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] sm:text-3xl">
          Confirmando seu e-mail...
        </h1>
        <p className="mt-3 text-muted-foreground">Isso leva só alguns segundos.</p>
      </div>
    );
  }

  return <AuthLayout audience="account">{content}</AuthLayout>;
}
