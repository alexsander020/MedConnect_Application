import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Mail, User } from 'lucide-react';
import { useAuth, homeFor } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FadeUp } from '@/components/motion';
import { ehEmailValido } from '@/utils/validacoes';
import AuthLayout from './auth/components/AuthLayout';
import { AuthHeading, FormAlert, FormField, IconInput, PasswordInput } from './auth/components/AuthFields';
import {
  NETWORK_MESSAGE,
  RATE_LIMIT_MESSAGE,
  authErrorMessage,
  errorCode,
  errorStatus,
  focusById,
  isNetworkError,
} from './auth/components/auth-helpers';
import { usePageMeta } from '@/lib/seo';

const PROFILES = {
  patient: {
    label: 'Paciente',
    icon: User,
    hint: 'Acesse suas receitas, cotações e pedidos.',
  },
  pharmacy: {
    label: 'Farmácia',
    icon: Building2,
    hint: 'Use o e-mail informado no credenciamento da farmácia.',
  },
};

function initialProfile(searchParams, state) {
  const fromQuery = searchParams.get('type');
  if (fromQuery === 'pharmacy' || state?.type === 'pharmacy') return 'pharmacy';
  return 'patient';
}

/** Traduz a falha de login em um aviso (título + mensagem + link opcional) */
function describeLoginError(err) {
  const status = errorStatus(err);
  const code = errorCode(err);
  if (isNetworkError(err)) return { title: 'Sem conexão com o servidor', message: NETWORK_MESSAGE };
  if (status === 403 && code === 'ACCOUNT_SUSPENDED') {
    return {
      title: 'Conta suspensa',
      message:
        'Esta conta está suspensa e não pode entrar no momento. Se você acredita que houve um engano, fale com o nosso suporte.',
      suspended: true,
    };
  }
  if (status === 429) return { title: 'Muitas tentativas', message: RATE_LIMIT_MESSAGE };
  if (status === 401 || code === 'INVALID_CREDENTIALS') {
    return {
      title: 'E-mail ou senha incorretos',
      message: 'Confira os dados digitados e se o perfil selecionado (Paciente ou Farmácia) é o da sua conta.',
    };
  }
  return { title: 'Não foi possível entrar', message: authErrorMessage(err, 'Tente novamente em instantes.') };
}

/** Só aceita caminhos internos como destino pós-login */
function safeRedirect(from) {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return null;
  if (from.startsWith('/login') || from.startsWith('/register')) return null;
  return from;
}

export default function Login() {
  usePageMeta({
    title: 'Entrar · MedConnect',
    description: 'Acesse sua conta MedConnect para enviar receitas, comparar cotações de farmácias de manipulação e acompanhar seus pedidos.',
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [type, setType] = useState(() => initialProfile(searchParams, location.state));
  const [email, setEmail] = useState(() => (typeof location.state?.email === 'string' ? location.state.email : ''));
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const profile = PROFILES[type];
  const registerHref = type === 'pharmacy' ? '/register?type=pharmacy' : '/register';

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'Informe seu e-mail.';
    else if (!ehEmailValido(email.trim())) next.email = 'Informe um e-mail válido.';
    if (!password) next.password = 'Informe sua senha.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;
    setFailure(null);

    const found = validate();
    setErrors(found);
    if (found.email) return focusById('login-email');
    if (found.password) return focusById('login-password');

    inFlight.current = true;
    setLoading(true);
    try {
      const { user } = await login(email.trim(), password, type);
      navigate(safeRedirect(location.state?.from) || homeFor(user?.role), { replace: true });
    } catch (err) {
      setFailure(describeLoginError(err));
      if (errorStatus(err) === 401) {
        setPassword('');
        focusById('login-password');
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const changeProfile = (value) => {
    setType(value);
    setFailure(null);
  };

  return (
    <AuthLayout audience={type}>
      <AuthHeading
        eyebrow="Bem-vindo de volta"
        title="Entrar na MedConnect"
        description="Escolha o seu perfil e informe os dados de acesso."
      />

      <FadeUp delay={0.08} y={12} duration={0.6}>
        <Tabs value={type} onValueChange={changeProfile} className="gap-0">
          <TabsList aria-label="Perfil de acesso" className="grid h-11 w-full grid-cols-2 rounded-xl p-1">
            {Object.entries(PROFILES).map(([value, { label, icon: Icon }]) => (
              <TabsTrigger
                key={value}
                value={value}
                id={`login-tab-${value}`}
                aria-controls="login-panel"
                className="h-full rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Icon aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div role="tabpanel" id="login-panel" aria-labelledby={`login-tab-${type}`} className="mt-3">
          <p className="mb-6 text-sm text-muted-foreground">{profile.hint}</p>

          <form noValidate onSubmit={handleSubmit} className="grid gap-5" aria-busy={loading || undefined}>
            {failure && (
              <FormAlert title={failure.title}>
                {failure.message}
                {failure.suspended && (
                  <>
                    {' '}
                    <Link to="/help?category=GENERAL#contato">Falar com o suporte</Link>
                  </>
                )}
              </FormAlert>
            )}

            <FormField id="login-email" label="E-mail" error={errors.email}>
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
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                />
              )}
            </FormField>

            <FormField
              id="login-password"
              label="Senha"
              error={errors.password}
              action={
                <Link
                  to="/forgot-password"
                  className="rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Esqueci minha senha
                </Link>
              }
            >
              {(a11y) => (
                <PasswordInput
                  {...a11y}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />
              )}
            </FormField>

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Spinner aria-hidden="true" /> Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>
      </FadeUp>

      <FadeUp delay={0.16} y={8} duration={0.6} className="mt-8">
        <Separator />
        <div className="mt-6 grid gap-2 text-center text-sm text-muted-foreground">
          <p>
            Ainda não tem conta?{' '}
            <Link to={registerHref} className="font-medium text-primary underline-offset-4 hover:underline">
              {type === 'pharmacy' ? 'Credenciar minha farmácia' : 'Criar conta de paciente'}
            </Link>
          </p>
          <p>
            {type === 'pharmacy' ? 'É paciente? ' : 'É uma farmácia de manipulação? '}
            <Link
              to={type === 'pharmacy' ? '/register' : '/register?type=pharmacy'}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              {type === 'pharmacy' ? 'Criar conta de paciente' : 'Credenciar farmácia'}
            </Link>
          </p>
        </div>
      </FadeUp>
    </AuthLayout>
  );
}
