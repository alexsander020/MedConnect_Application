import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Clock3, FileSearch, Info, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { publicApi } from '@/services/endpoints';
import { PasswordRules } from '@/components/account/ChangePasswordCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EASE_OUT, FadeUp, Stagger, StaggerItem } from '@/components/motion';
import { ehCNPJValido, ehCPFValido, ehEmailValido, ehSenhaForte } from '@/utils/validacoes';
import AuthLayout from './auth/components/AuthLayout';
import {
  AuthHeading,
  CheckboxField,
  FormAlert,
  FormField,
  PasswordInput,
  StepIndicator,
  TextInput,
} from './auth/components/AuthFields';
import {
  UFS,
  authErrorMessage,
  errorCode,
  focusById,
  isHttpUrl,
  maskCNPJ,
  maskCPF,
  maskPhone,
  onlyDigits,
} from './auth/components/auth-helpers';
import { usePageMeta } from '@/lib/seo';

const PASSWORD_MESSAGE = 'A senha deve ter 8+ caracteres, com ao menos uma maiúscula, número e caractere especial.';
const DELIVERY_OPTIONS = ['5', '10', '15', '20', '30'];

const FALLBACK_CONSENT = {
  title: 'Consentimento para tratamento de dados de saúde',
  text:
    'Autorizo a MedConnect e as farmácias de manipulação credenciadas a tratar meus dados de saúde (receitas e informações clínicas anexas) exclusivamente para cotação, manipulação e entrega do medicamento, nos termos do art. 11, I, da LGPD (Lei 13.709/2018). Posso revogar este consentimento a qualquer momento no Centro de Privacidade da minha conta.',
};

const STEPS = {
  patient: [
    { name: 'Acesso', legend: 'Dados de acesso', fields: ['name', 'email', 'password'] },
    { name: 'Seus dados', legend: 'Dados pessoais e de entrega', fields: ['phone', 'cpf', 'address'] },
    { name: 'Privacidade', legend: 'Termos e consentimento', fields: ['termsAccepted', 'healthConsent'] },
  ],
  pharmacy: [
    { name: 'Acesso', legend: 'Dados de acesso', fields: ['name', 'email', 'password'] },
    {
      name: 'Farmácia',
      legend: 'Dados da farmácia',
      fields: ['cnpj', 'phone', 'address', 'city', 'state', 'deliveryArea'],
    },
    {
      name: 'Regularidade',
      legend: 'Regularidade sanitária e responsável técnico',
      fields: [
        'sanitaryLicense',
        'operatingAuth',
        'technicalResponsibleName',
        'technicalResponsibleCrf',
        'technicalResponsibleUf',
        'documentUrl',
        'pharmacyTerms',
      ],
    },
  ],
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  cpf: '',
  address: '',
  termsAccepted: false,
  healthConsent: false,
  cnpj: '',
  city: '',
  state: '',
  deliveryArea: '10',
  sanitaryLicense: '',
  operatingAuth: '',
  technicalResponsibleName: '',
  technicalResponsibleCrf: '',
  technicalResponsibleUf: '',
  documentUrl: '',
  pharmacyTerms: false,
};

/** Regras de validação por campo (mensagens em pt-BR) */
const VALIDATORS = {
  name: (v, type) => {
    if (!v.trim()) return type === 'pharmacy' ? 'Informe o nome da farmácia.' : 'Informe seu nome completo.';
    if (v.trim().length < 2) return 'O nome deve ter ao menos 2 letras.';
    return undefined;
  },
  email: (v) => (!v.trim() ? 'Informe seu e-mail.' : !ehEmailValido(v.trim()) ? 'Informe um e-mail válido.' : undefined),
  password: (v) => (!ehSenhaForte(v) ? PASSWORD_MESSAGE : undefined),
  phone: (v) => {
    const digits = onlyDigits(v).length;
    if (!digits) return 'Informe o número de telefone ou WhatsApp.';
    return digits < 10 ? 'Informe o telefone com DDD.' : undefined;
  },
  cpf: (v) => (!ehCPFValido(v) ? 'CPF inválido. Verifique os 11 números digitados.' : undefined),
  address: (v) => (!v.trim() ? 'Informe o endereço completo.' : undefined),
  termsAccepted: (v) => (!v ? 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.' : undefined),
  healthConsent: (v) =>
    !v ? 'É obrigatório consentir com o tratamento de dados de saúde para criar a conta de paciente.' : undefined,
  cnpj: (v) => (!ehCNPJValido(v) ? 'CNPJ inválido. Verifique os números digitados.' : undefined),
  city: (v) => (!v.trim() ? 'Informe a cidade.' : undefined),
  state: (v) => (!v ? 'Selecione a UF.' : undefined),
  deliveryArea: (v) => (!v ? 'Selecione o raio de atendimento.' : undefined),
  sanitaryLicense: (v) => (!v.trim() ? 'Informe o número da licença sanitária.' : undefined),
  operatingAuth: (v) => (!v.trim() ? 'Informe o número da AFE.' : undefined),
  technicalResponsibleName: (v) => (!v.trim() ? 'Informe o nome do farmacêutico responsável técnico.' : undefined),
  technicalResponsibleCrf: (v) =>
    !v.trim() ? 'Informe o número de inscrição no CRF.' : v.trim().length < 3 ? 'Número do CRF incompleto.' : undefined,
  technicalResponsibleUf: (v) => (!v ? 'Selecione a UF do CRF.' : undefined),
  documentUrl: (v) =>
    v.trim() && !isHttpUrl(v) ? 'Informe um link válido, começando com https://.' : undefined,
  pharmacyTerms: (v) => (!v ? 'Para concluir o credenciamento, aceite o Termo de Adesão.' : undefined),
};

/** Erros da API que pertencem a um campo específico */
const API_FIELD_ERRORS = {
  EMAIL_ALREADY_EXISTS: ['email', 'Este e-mail já está cadastrado. Entre na sua conta ou use outro e-mail.'],
  INVALID_EMAIL: ['email', 'Informe um e-mail válido.'],
  WEAK_PASSWORD: ['password', PASSWORD_MESSAGE],
  CPF_ALREADY_EXISTS: ['cpf', 'Este CPF já está cadastrado. Se a conta é sua, entre ou recupere a senha.'],
  INVALID_CPF: ['cpf', 'CPF inválido. Verifique os 11 números digitados.'],
  CNPJ_ALREADY_EXISTS: ['cnpj', 'Este CNPJ já está cadastrado na MedConnect.'],
  INVALID_CNPJ: ['cnpj', 'CNPJ inválido. Verifique os números digitados.'],
};

const fieldId = (field) => `reg-${field}`;

function initialProfile(searchParams, state) {
  return searchParams.get('type') === 'pharmacy' || state?.type === 'pharmacy' ? 'pharmacy' : 'patient';
}

function NewTabLink({ to, children }) {
  return (
    <Link to={to} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </Link>
  );
}

function UfSelect({ value, onChange, a11y, placeholder = 'UF', autoComplete, name }) {
  return (
    <Select value={value || undefined} onValueChange={onChange} name={name} autoComplete={autoComplete}>
      <SelectTrigger
        {...a11y}
        className="w-full rounded-lg bg-background px-3 text-base data-[size=default]:h-11 md:text-sm"
      >
        <SelectValue placeholder={placeholder}>{value || undefined}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="max-h-72">
        {UFS.map((uf) => (
          <SelectItem key={uf.sigla} value={uf.sigla}>
            {uf.sigla} — {uf.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Tela final do credenciamento: explica a verificação pendente antes de cotar */
function PharmacyReviewNotice({ name, onContinue }) {
  const steps = [
    {
      icon: Clock3,
      title: 'Verificação pendente',
      text: 'É o status atual. Você já pode entrar no painel e completar o perfil da farmácia.',
    },
    {
      icon: FileSearch,
      title: 'Análise documental',
      text: 'Nossa equipe confere CNPJ, licença sanitária, AFE e responsável técnico. Se faltar algo, avisamos pelo painel.',
    },
    {
      icon: ShieldCheck,
      title: 'Farmácia verificada',
      text: 'Com a aprovação, a farmácia passa a receber receitas da região e a enviar cotações.',
    },
  ];
  return (
    <div>
      <FadeUp y={12} duration={0.6}>
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-success-wash text-success">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">Cadastro recebido</p>
        <h1
          id="register-done-title"
          tabIndex={-1}
          className="mt-2.5 font-heading text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] outline-none sm:text-3xl"
        >
          Sua farmácia está em análise
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Recebemos os dados de <strong className="font-medium text-foreground">{name}</strong>. Antes de liberar as
          cotações, a conta passa por uma verificação da equipe MedConnect.
        </p>
      </FadeUp>
      <Stagger as="ol" step={0.12} delay={0.15} inView={false} className="mt-7 grid gap-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <StaggerItem
            as="li"
            key={title}
            y={10}
            className="flex gap-3.5 rounded-xl border border-border bg-background p-4"
          >
            <span
              className={
                i === 0
                  ? 'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-wash text-amber'
                  : 'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary'
              }
            >
              <Icon className="size-[1.125rem]" aria-hidden="true" />
            </span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <FadeUp delay={0.45} y={8} duration={0.5} className="mt-7 grid gap-3">
        <Button size="lg" className="w-full" onClick={onContinue}>
          Entrar no painel da farmácia
          <ArrowRight aria-hidden="true" />
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/help?category=PHARMACY_ONBOARDING#contato">Dúvidas sobre o credenciamento</Link>
        </Button>
      </FadeUp>
    </div>
  );
}

export default function Register() {
  usePageMeta({
    title: 'Criar conta · MedConnect',
    description:
      'Crie sua conta de paciente para receber cotações de farmácias de manipulação credenciadas, ou credencie sua farmácia na MedConnect.',
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const toast = useToast();

  const [type, setType] = useState(() => initialProfile(searchParams, location.state));
  const [[step, direction], setStepState] = useState([1, 1]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const pendingFocus = useRef(null);

  const isPharmacy = type === 'pharmacy';
  const steps = STEPS[type];
  const isLastStep = step === steps.length;

  const consentQuery = useQuery({
    queryKey: ['consentTerms'],
    queryFn: publicApi.consentTerms,
    enabled: !isPharmacy,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
  const consent = consentQuery.data?.currentHealthConsent;

  // Move o foco depois da troca de etapa (ou para o título da tela final)
  useEffect(() => {
    if (!pendingFocus.current) return;
    const id = pendingFocus.current;
    pendingFocus.current = null;
    focusById(id);
  }, [step, done]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const goToStep = (next, focusField) => {
    pendingFocus.current = focusField ? fieldId(focusField) : fieldId(steps[next - 1].fields[0]);
    setStepState([next, next >= step ? 1 : -1]);
  };

  const changeProfile = (value) => {
    setType(value);
    setErrors({});
    setFormError(null);
  };

  const validateStep = (index) => {
    const found = {};
    for (const field of steps[index - 1].fields) {
      const message = VALIDATORS[field]?.(form[field], type);
      if (message) found[field] = message;
    }
    return found;
  };

  const buildPayload = () => {
    const common = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone,
      address: form.address.trim(),
    };
    if (!isPharmacy) {
      return { ...common, cpf: onlyDigits(form.cpf), healthConsent: true, termsAccepted: true };
    }
    return {
      ...common,
      cnpj: onlyDigits(form.cnpj),
      deliveryArea: form.deliveryArea,
      city: form.city.trim(),
      state: form.state,
      sanitaryLicense: form.sanitaryLicense.trim(),
      operatingAuth: form.operatingAuth.trim(),
      technicalResponsibleName: form.technicalResponsibleName.trim(),
      technicalResponsibleCrf: form.technicalResponsibleCrf.trim(),
      technicalResponsibleUf: form.technicalResponsibleUf,
      ...(form.documentUrl.trim() ? { documentUrl: form.documentUrl.trim() } : {}),
      termsAccepted: true,
    };
  };

  const handleApiError = (err) => {
    const mapped = API_FIELD_ERRORS[errorCode(err)];
    const owningStep = mapped ? steps.findIndex((s) => s.fields.includes(mapped[0])) + 1 : 0;
    if (mapped && owningStep > 0) {
      const [field, message] = mapped;
      setErrors({ [field]: message });
      setFormError({ title: 'Revise o campo destacado', message });
      if (owningStep !== step) goToStep(owningStep, field);
      else focusById(fieldId(field));
      return;
    }
    setFormError({
      title: 'Não foi possível concluir o cadastro',
      message: authErrorMessage(err, 'Tente novamente em instantes.'),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);

    const found = validateStep(step);
    const stepFields = steps[step - 1].fields;
    setErrors((prev) => {
      const next = { ...prev };
      stepFields.forEach((f) => delete next[f]);
      return { ...next, ...found };
    });
    const firstInvalid = stepFields.find((f) => found[f]);
    if (firstInvalid) {
      focusById(fieldId(firstInvalid));
      return;
    }

    if (!isLastStep) {
      goToStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      await register(buildPayload(), isPharmacy ? 'pharmacy' : 'patient');
      if (isPharmacy) {
        toast.success('A verificação da farmácia foi iniciada.', 'Cadastro enviado');
        pendingFocus.current = 'register-done-title';
        setDone(true);
      } else {
        toast.success('Entre com seu e-mail e senha para enviar sua primeira receita.', 'Conta criada');
        navigate('/login', { replace: true, state: { email: form.email.trim() } });
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout audience="pharmacy">
        <PharmacyReviewNotice
          name={form.name.trim()}
          onContinue={() => navigate('/login?type=pharmacy', { replace: true, state: { email: form.email.trim() } })}
        />
      </AuthLayout>
    );
  }

  const field = (name) => ({ id: fieldId(name), error: errors[name] });
  const current = steps[step - 1];

  return (
    <AuthLayout audience={type} contentClassName="max-w-[480px]">
      <AuthHeading
        eyebrow={isPharmacy ? 'Credenciamento' : 'Cadastro gratuito'}
        title={isPharmacy ? 'Credenciar minha farmácia' : 'Criar conta de paciente'}
        description={
          isPharmacy
            ? 'Informe os dados da farmácia e do responsável técnico. A equipe MedConnect confere tudo antes de liberar as cotações.'
            : 'Cadastre-se para enviar sua receita e receber cotações de farmácias de manipulação verificadas.'
        }
      />

      <FadeUp delay={0.08} y={12} duration={0.6}>
        {step === 1 && (
          <Tabs value={type} onValueChange={changeProfile} className="mb-6 gap-0">
            <TabsList aria-label="Tipo de conta" className="grid h-11 w-full grid-cols-2 rounded-xl p-1">
              <TabsTrigger
                value="patient"
                id="register-tab-patient"
                aria-controls="register-panel"
                className="h-full rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <User aria-hidden="true" />
                Sou paciente
              </TabsTrigger>
              <TabsTrigger
                value="pharmacy"
                id="register-tab-pharmacy"
                aria-controls="register-panel"
                className="h-full rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Building2 aria-hidden="true" />
                Sou farmácia
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div
          id="register-panel"
          {...(step === 1 ? { role: 'tabpanel', 'aria-labelledby': `register-tab-${type}` } : {})}
        >
          <StepIndicator steps={steps.map((s) => s.name)} current={step} />

          <form noValidate onSubmit={handleSubmit} aria-busy={loading || undefined}>
            {formError && (
              <FormAlert title={formError.title} className="mb-5">
                {formError.message}
              </FormAlert>
            )}

            <motion.fieldset
              key={`${type}-${step}`}
              initial={{ opacity: 0, x: 14 * direction }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="min-w-0"
            >
              <legend className="mb-5 font-heading text-lg font-semibold">{current.legend}</legend>

              {step === 1 && (
                <div className="grid gap-5">
                  <FormField {...field('name')} label={isPharmacy ? 'Nome fantasia da farmácia' : 'Nome completo'}>
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        name="name"
                        autoComplete={isPharmacy ? 'organization' : 'name'}
                        placeholder={isPharmacy ? 'Como a farmácia é conhecida' : 'Seu nome e sobrenome'}
                        required
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                      />
                    )}
                  </FormField>
                  <FormField
                    {...field('email')}
                    label={isPharmacy ? 'E-mail da farmácia' : 'E-mail'}
                    hint={isPharmacy ? 'Será o login da farmácia e o canal dos avisos de credenciamento.' : undefined}
                  >
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        type="email"
                        name="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={isPharmacy ? 'contato@suafarmacia.com.br' : 'seu@email.com'}
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                      />
                    )}
                  </FormField>
                  <FormField {...field('password')} label="Crie uma senha">
                    {(a11y) => (
                      <>
                        <PasswordInput
                          {...a11y}
                          aria-describedby={[a11y['aria-describedby'], 'reg-password-rules'].filter(Boolean).join(' ')}
                          name="password"
                          autoComplete="new-password"
                          placeholder="Mínimo de 8 caracteres"
                          required
                          value={form.password}
                          onChange={(e) => update('password', e.target.value)}
                        />
                        <div id="reg-password-rules">
                          <PasswordRules value={form.password} />
                        </div>
                      </>
                    )}
                  </FormField>
                </div>
              )}

              {step === 2 && !isPharmacy && (
                <div className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField {...field('phone')} label="Telefone ou WhatsApp">
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          type="tel"
                          name="phone"
                          inputMode="tel"
                          autoComplete="tel-national"
                          placeholder="(11) 98765-4321"
                          required
                          value={form.phone}
                          onChange={(e) => update('phone', maskPhone(e.target.value))}
                        />
                      )}
                    </FormField>
                    <FormField {...field('cpf')} label="CPF">
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          name="cpf"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="000.000.000-00"
                          required
                          value={form.cpf}
                          onChange={(e) => update('cpf', maskCPF(e.target.value))}
                        />
                      )}
                    </FormField>
                  </div>
                  <FormField
                    {...field('address')}
                    label="Endereço de entrega"
                    hint="Rua, número, complemento, bairro, cidade e UF. Só a farmácia que você escolher verá o endereço."
                  >
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        name="address"
                        autoComplete="street-address"
                        placeholder="Rua, número - bairro, cidade - UF"
                        required
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                      />
                    )}
                  </FormField>
                  <p className="flex items-start gap-2 rounded-xl bg-mint-wash px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                    <ShieldCheck className="mt-px size-4 shrink-0 text-primary" aria-hidden="true" />
                    CPF, telefone e endereço são guardados de forma cifrada e usados só para identificar você e
                    entregar o pedido.
                  </p>
                </div>
              )}

              {step === 3 && !isPharmacy && (
                <div className="grid gap-4">
                  <CheckboxField
                    id={fieldId('termsAccepted')}
                    checked={form.termsAccepted}
                    onCheckedChange={(v) => update('termsAccepted', v)}
                    error={errors.termsAccepted}
                  >
                    Li e aceito os <NewTabLink to="/terms">Termos de Uso</NewTabLink> e a{' '}
                    <NewTabLink to="/privacy">Política de Privacidade</NewTabLink>.
                  </CheckboxField>

                  <section aria-labelledby="reg-consent-title" className="rounded-xl border border-border bg-muted/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 id="reg-consent-title" className="font-sans text-sm leading-snug font-semibold tracking-normal">
                        {consent?.title || FALLBACK_CONSENT.title}
                      </h2>
                      {consent?.version && (
                        <Badge variant="outline" className="num bg-background">
                          Versão {consent.version}
                        </Badge>
                      )}
                    </div>
                    {consentQuery.isPending ? (
                      <div className="mt-3 grid gap-2" aria-busy="true" aria-label="Carregando o texto do consentimento">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-11/12" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    ) : (
                      <div
                        id="reg-consent-text"
                        role="region"
                        tabIndex={0}
                        aria-label="Texto do consentimento"
                        className="mt-2.5 max-h-44 overflow-y-auto rounded-md pr-1 text-sm leading-relaxed text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <p>{consent?.text || FALLBACK_CONSENT.text}</p>
                        {consentQuery.isError && (
                          <p className="mt-2 text-xs">
                            Não conseguimos carregar a versão mais recente agora; este é o resumo do consentimento.
                          </p>
                        )}
                      </div>
                    )}
                  </section>

                  <CheckboxField
                    id={fieldId('healthConsent')}
                    checked={form.healthConsent}
                    onCheckedChange={(v) => update('healthConsent', v)}
                    error={errors.healthConsent}
                    describedBy="reg-consent-title"
                  >
                    Li e autorizo o tratamento dos meus dados de saúde conforme o texto acima. Posso revogar quando
                    quiser no Centro de Privacidade.
                  </CheckboxField>
                </div>
              )}

              {step === 2 && isPharmacy && (
                <div className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField {...field('cnpj')} label="CNPJ">
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          name="cnpj"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="00.000.000/0001-00"
                          required
                          value={form.cnpj}
                          onChange={(e) => update('cnpj', maskCNPJ(e.target.value))}
                        />
                      )}
                    </FormField>
                    <FormField {...field('phone')} label="Telefone ou WhatsApp">
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          type="tel"
                          name="phone"
                          inputMode="tel"
                          autoComplete="tel-national"
                          placeholder="(11) 3456-7890"
                          required
                          value={form.phone}
                          onChange={(e) => update('phone', maskPhone(e.target.value))}
                        />
                      )}
                    </FormField>
                  </div>
                  <FormField {...field('address')} label="Endereço da farmácia">
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        name="address"
                        autoComplete="street-address"
                        placeholder="Rua, número - bairro"
                        required
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                      />
                    )}
                  </FormField>
                  <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-4">
                    <FormField {...field('city')} label="Cidade">
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          name="city"
                          autoComplete="address-level2"
                          placeholder="Cidade"
                          required
                          value={form.city}
                          onChange={(e) => update('city', e.target.value)}
                        />
                      )}
                    </FormField>
                    <FormField {...field('state')} label="UF">
                      {(a11y) => (
                        <UfSelect
                          a11y={a11y}
                          name="state"
                          autoComplete="address-level1"
                          value={form.state}
                          onChange={(v) => update('state', v)}
                        />
                      )}
                    </FormField>
                  </div>
                  <div className="grid gap-2.5">
                    <p id="reg-deliveryArea-label" className="text-sm font-medium">
                      Raio de atendimento e entrega
                    </p>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      spacing={2}
                      aria-labelledby="reg-deliveryArea-label"
                      value={form.deliveryArea}
                      onValueChange={(v) => v && update('deliveryArea', v)}
                      className="flex w-full flex-wrap"
                    >
                      {DELIVERY_OPTIONS.map((km) => (
                        <ToggleGroupItem
                          key={km}
                          value={km}
                          id={km === DELIVERY_OPTIONS[0] ? fieldId('deliveryArea') : undefined}
                          className="h-10 min-w-16 flex-1 rounded-lg data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-primary"
                        >
                          <span className="num">{km} km</span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    {errors.deliveryArea && <p className="text-sm text-destructive">{errors.deliveryArea}</p>}
                  </div>
                </div>
              )}

              {step === 3 && isPharmacy && (
                <div className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      {...field('sanitaryLicense')}
                      label="Licença sanitária"
                      hint="Número do alvará da Vigilância Sanitária."
                    >
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          name="sanitaryLicense"
                          autoComplete="off"
                          required
                          value={form.sanitaryLicense}
                          onChange={(e) => update('sanitaryLicense', e.target.value)}
                        />
                      )}
                    </FormField>
                    <FormField
                      {...field('operatingAuth')}
                      label="AFE (Anvisa)"
                      hint="Autorização de Funcionamento da Empresa."
                    >
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          name="operatingAuth"
                          autoComplete="off"
                          required
                          value={form.operatingAuth}
                          onChange={(e) => update('operatingAuth', e.target.value)}
                        />
                      )}
                    </FormField>
                  </div>
                  <FormField {...field('technicalResponsibleName')} label="Farmacêutico(a) responsável técnico(a)">
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        name="technicalResponsibleName"
                        autoComplete="off"
                        placeholder="Nome completo"
                        required
                        value={form.technicalResponsibleName}
                        onChange={(e) => update('technicalResponsibleName', e.target.value)}
                      />
                    )}
                  </FormField>
                  <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-4">
                    <FormField {...field('technicalResponsibleCrf')} label="Inscrição no CRF">
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          name="technicalResponsibleCrf"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={20}
                          placeholder="Número"
                          required
                          value={form.technicalResponsibleCrf}
                          onChange={(e) => update('technicalResponsibleCrf', e.target.value)}
                        />
                      )}
                    </FormField>
                    <FormField {...field('technicalResponsibleUf')} label="UF do CRF">
                      {(a11y) => (
                        <UfSelect
                          a11y={a11y}
                          value={form.technicalResponsibleUf}
                          onChange={(v) => update('technicalResponsibleUf', v)}
                        />
                      )}
                    </FormField>
                  </div>
                  <FormField
                    {...field('documentUrl')}
                    label="Link dos documentos"
                    optional
                    hint="Pasta compartilhada (https://…) com licença, AFE e certidão de regularidade do CRF. Se preferir, envie depois pelo suporte."
                  >
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        type="url"
                        name="documentUrl"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="https://"
                        value={form.documentUrl}
                        onChange={(e) => update('documentUrl', e.target.value)}
                      />
                    )}
                  </FormField>
                  <p className="flex items-start gap-2 rounded-xl bg-amber-wash px-3.5 py-3 text-xs leading-relaxed text-foreground/80">
                    <Info className="mt-px size-4 shrink-0 text-amber" aria-hidden="true" />
                    Depois do envio, a farmácia fica com verificação pendente. Você poderá entrar no painel, mas só
                    envia cotações após a aprovação da equipe.
                  </p>
                  <CheckboxField
                    id={fieldId('pharmacyTerms')}
                    checked={form.pharmacyTerms}
                    onCheckedChange={(v) => update('pharmacyTerms', v)}
                    error={errors.pharmacyTerms}
                  >
                    Li e aceito o <NewTabLink to="/pharmacy-terms">Termo de Adesão para Farmácias</NewTabLink>,
                    incluindo as responsabilidades técnicas, de preço e de entrega.
                  </CheckboxField>
                </div>
              )}
            </motion.fieldset>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => goToStep(step - 1)}
                  disabled={loading}
                >
                  <ArrowLeft aria-hidden="true" />
                  Voltar
                </Button>
              )}
              <Button type="submit" size="lg" className="w-full sm:w-auto sm:flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner aria-hidden="true" /> Enviando...
                  </>
                ) : isLastStep ? (
                  isPharmacy ? (
                    'Enviar para análise'
                  ) : (
                    'Criar conta'
                  )
                ) : (
                  <>
                    Continuar
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </FadeUp>

      <FadeUp delay={0.16} y={8} duration={0.6} className="mt-8">
        <Separator />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link
            to={isPharmacy ? '/login?type=pharmacy' : '/login'}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </FadeUp>
    </AuthLayout>
  );
}
