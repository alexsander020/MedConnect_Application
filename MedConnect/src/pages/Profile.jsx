import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, ChevronRight, FileText, MailWarning, Package, PawPrint, Save, ShieldCheck, Star, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import ChangePasswordCard from '@/components/account/ChangePasswordCard';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { FadeUp, Stagger, StaggerItem } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { patientApi } from '@/services/endpoints';
import { formatDate, formatDateTime, formatNumber, initials } from '@/lib/format';
import { friendlyError, maskPhone } from './user/components/patient-utils';

const toForm = (p) => ({ name: p?.name || '', phone: maskPhone(p?.phone || ''), address: p?.address || '' });

function ProfileForm({ profile }) {
  const queryClient = useQueryClient();
  const { updateCurrentUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => toForm(profile));
  const [errors, setErrors] = useState({});

  const initial = toForm(profile);
  const dirty = form.name.trim() !== initial.name.trim() || form.phone !== initial.phone || form.address.trim() !== initial.address.trim();

  const mutation = useMutation({
    mutationFn: (payload) => patientApi.updateMe(payload),
    onSuccess: (data) => {
      if (data && typeof data === 'object') queryClient.setQueryData(['patientMe'], data);
      else queryClient.invalidateQueries({ queryKey: ['patientMe'] });
      const name = data?.name || form.name.trim();
      updateCurrentUser({ name });
      setForm(toForm(data && typeof data === 'object' ? data : { ...profile, ...form, name }));
      toast.success('Seus dados foram atualizados.', 'Dados salvos');
    },
    onError: (err) => toast.error(friendlyError(err, 'Não foi possível salvar seus dados. Tente novamente.')),
  });

  const validate = () => {
    const next = {};
    const name = form.name.trim();
    if (name.length < 2) next.name = 'Informe seu nome completo (mínimo de 2 letras).';
    else if (name.length > 120) next.name = 'O nome pode ter no máximo 120 caracteres.';
    const digits = form.phone.replace(/\D/g, '');
    if (digits && (digits.length < 10 || digits.length > 11)) next.phone = 'Informe o telefone com DDD, ex.: (11) 98765-4321.';
    if (form.address.trim().length > 300) next.address = 'O endereço pode ter no máximo 300 caracteres.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({ name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() });
  };

  const set = (key) => (e) => {
    const value = key === 'phone' ? maskPhone(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <UserRound className="size-5 text-primary" aria-hidden="true" /> Dados pessoais
        </CardTitle>
        <CardDescription>Usados para a farmácia escolhida entregar seu pedido. Telefone e endereço ficam cifrados.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Nome completo</Label>
            <Input
              id="profile-name"
              autoComplete="name"
              value={form.name}
              onChange={set('name')}
              maxLength={120}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'profile-name-error' : undefined}
            />
            {errors.name && <p id="profile-name-error" className="text-xs font-medium text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input id="profile-email" type="email" value={profile.email || ''} readOnly aria-describedby="profile-email-help" className="bg-muted/60 text-muted-foreground" />
              <div id="profile-email-help" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {profile.emailVerified ? (
                  <StatusBadge tone="success" dot={false}><BadgeCheck className="size-3.5" aria-hidden="true" /> Verificado</StatusBadge>
                ) : (
                  <StatusBadge tone="warning" dot={false}><MailWarning className="size-3.5" aria-hidden="true" /> Não verificado</StatusBadge>
                )}
                <span>
                  Para trocar o e-mail, fale com o{' '}
                  <Link to="/support" className="font-medium text-primary underline-offset-2 hover:underline">atendimento</Link>.
                </span>
              </div>
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="profile-cpf">CPF</Label>
              <Input id="profile-cpf" value={profile.cpf || 'Não informado'} readOnly aria-describedby="profile-cpf-help" className="num bg-muted/60 text-muted-foreground" />
              <p id="profile-cpf-help" className="text-xs text-muted-foreground">Por segurança, mostramos só os últimos dígitos.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="profile-phone">Telefone ou WhatsApp</Label>
            <Input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 98765-4321"
              value={form.phone}
              onChange={set('phone')}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
              className="num"
            />
            {errors.phone && <p id="profile-phone-error" className="text-xs font-medium text-destructive">{errors.phone}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-address">Endereço de entrega</Label>
            <Textarea
              id="profile-address"
              autoComplete="street-address"
              rows={2}
              maxLength={300}
              placeholder="Rua, número, complemento, bairro, cidade e UF"
              value={form.address}
              onChange={set('address')}
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'profile-address-error' : undefined}
              className="min-h-20 resize-y"
            />
            {errors.address && <p id="profile-address-error" className="text-xs font-medium text-destructive">{errors.address}</p>}
          </div>
        </CardContent>
        <CardFooter className="mt-2 flex flex-wrap items-center justify-end gap-2">
          {dirty && (
            <Button type="button" variant="ghost" onClick={() => { setForm(initial); setErrors({}); }} disabled={mutation.isPending}>
              Descartar alterações
            </Button>
          )}
          <Button type="submit" disabled={!dirty || mutation.isPending}>
            {mutation.isPending ? <Spinner /> : <Save aria-hidden="true" />} Salvar alterações
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function AccountSummary({ profile }) {
  const { vetEnabled } = usePublicConfig();
  const counts = profile.counts || {};
  const items = [
    { icon: FileText, label: 'Receitas', value: counts.prescriptions },
    { icon: Package, label: 'Pedidos', value: counts.orders },
    { icon: Star, label: 'Avaliações', value: counts.reviews },
  ];
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarFallback className="bg-accent font-heading text-lg font-semibold text-primary">{initials(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-semibold text-foreground">{profile.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <StatusBadge kind="role" status={profile.role || 'PATIENT'} />
              {profile.status && <StatusBadge kind="account" status={profile.status} />}
            </div>
          </div>
        </div>
        <Stagger as="ul" step={0.06} inView={false} className="grid grid-cols-3 gap-2" aria-label="Sua atividade">
          {items.map((it) => (
            <StaggerItem as="li" key={it.label} y={8} className="rounded-xl border border-border bg-mint-wash/60 p-3 text-center">
              <it.icon className="mx-auto size-4 text-primary" aria-hidden="true" />
              <span className="num mt-1 block text-xl leading-none text-foreground">{formatNumber(it.value ?? 0)}</span>
              <span className="mt-1 block text-[0.6875rem] text-muted-foreground">{it.label}</span>
            </StaggerItem>
          ))}
        </Stagger>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Conta criada</dt>
            <dd className="num text-right text-foreground">{formatDate(profile.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Último acesso</dt>
            <dd className="num text-right text-foreground">{profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '—'}</dd>
          </div>
        </dl>
        {vetEnabled && (
          <Link
            to="/my-pets"
            className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <PawPrint className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Meus pets</span>
              <span className="block text-xs text-muted-foreground">Animais cadastrados para receitas veterinárias</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        )}
        <Link
          to="/privacy-center"
          className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">Privacidade e dados</span>
            <span className="block text-xs text-muted-foreground">
              Consentimentos, exportação e exclusão da conta{vetEnabled ? ' (inclui os dados dos seus pets)' : ''}
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

/** "Meus dados" do paciente — GET/PATCH /users/me + troca de senha */
export default function Profile() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['patientMe'], queryFn: patientApi.me });

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Meus dados"
        description="Mantenha seu contato e endereço de entrega atualizados. Você controla o que compartilhamos em Privacidade e dados."
      />
      {isLoading ? (
        <LoadingState variant="detail" message="Carregando seus dados…" />
      ) : isError || !data ? (
        <ErrorState
          title="Erro ao carregar seus dados"
          message="Não foi possível buscar os dados da sua conta agora. Verifique sua conexão e tente novamente."
          onRetry={refetch}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <FadeUp duration={0.4} y={12}>
              <ProfileForm key={data.id} profile={data} />
            </FadeUp>
            <FadeUp duration={0.4} y={12} delay={0.08}>
              <ChangePasswordCard />
            </FadeUp>
          </div>
          <FadeUp duration={0.4} y={12} delay={0.04} className="lg:order-none">
            <AccountSummary profile={data} />
          </FadeUp>
        </div>
      )}
    </>
  );
}
