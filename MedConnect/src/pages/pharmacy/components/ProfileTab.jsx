import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, LifeBuoy, Save, Store, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import StatusBadge from '@/components/shared/StatusBadge';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import { useToast } from '@/context/ToastContext';
import { pharmacyApi } from '@/services/endpoints';
import { formatCnpj, formatDate } from '@/lib/format';
import ServicesInput from './ServicesInput';
import { serverMessage } from './utils';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const NO_UF = '__none';
const DESCRIPTION_MAX = 600;

function toForm(p = {}) {
  return {
    phone: p.phone || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    deliveryArea: p.deliveryArea || '',
    description: p.description || '',
    services: Array.isArray(p.services) ? p.services : [],
  };
}

function Field({ id, label, hint, children, className }) {
  return (
    <div className={className ? `grid content-start gap-2 ${className}` : 'grid content-start gap-2'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Dados de credenciamento (somente leitura) */
function CredentialsCard({ pharmacy }) {
  const rt = [pharmacy.technicalResponsibleName, pharmacy.technicalResponsibleCrf && `CRF ${pharmacy.technicalResponsibleCrf}${pharmacy.technicalResponsibleUf ? `/${pharmacy.technicalResponsibleUf}` : ''}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[1.0625rem]">
          <BadgeCheck className="size-5 text-primary" aria-hidden="true" /> Dados de credenciamento
        </CardTitle>
        <CardDescription>Conferidos pela equipe MedConnect. Não podem ser editados por aqui.</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <KeyValueList className="[&>div]:sm:grid-cols-1 [&>div]:sm:gap-1">
          <KeyValue label="Razão social / nome">{pharmacy.name}</KeyValue>
          <KeyValue label="CNPJ"><span className="num">{formatCnpj(pharmacy.cnpj)}</span></KeyValue>
          <KeyValue label="E-mail de acesso">{pharmacy.email}</KeyValue>
          <KeyValue label="Credenciamento">
            <span className="flex flex-col items-start gap-1.5">
              <StatusBadge kind="verification" status={pharmacy.verificationStatus} />
              {pharmacy.verificationStatus === 'REJECTED' && pharmacy.rejectionReason && (
                <span className="text-xs font-normal text-muted-foreground">Motivo: {pharmacy.rejectionReason}</span>
              )}
            </span>
          </KeyValue>
          <KeyValue label="Licença sanitária">{pharmacy.sanitaryLicense || 'Não informada'}</KeyValue>
          <KeyValue label="Autorização de funcionamento">{pharmacy.operatingAuth || 'Não informada'}</KeyValue>
          <KeyValue label="Responsável técnico">{rt || 'Não informado'}</KeyValue>
          <KeyValue label="Cadastro desde">{formatDate(pharmacy.createdAt)}</KeyValue>
        </KeyValueList>
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link to="/pharmacy/support"><LifeBuoy aria-hidden="true" /> Solicitar correção</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Aba "Perfil": PATCH /pharmacy/me com os campos operacionais exibidos aos pacientes */
export default function ProfileTab({ pharmacy }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => toForm(pharmacy));
  const [baseline, setBaseline] = useState(() => toForm(pharmacy));
  const [serverError, setServerError] = useState(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const mutation = useMutation({
    mutationFn: (payload) => pharmacyApi.updateMe(payload),
    onSuccess: (data) => {
      if (data && typeof data === 'object') queryClient.setQueryData(['pharmacyMe'], (old) => ({ ...(old || {}), ...data }));
      queryClient.invalidateQueries({ queryKey: ['pharmacyMe'] });
      const next = data ? toForm({ ...pharmacy, ...data }) : form;
      setForm(next);
      setBaseline(next);
      setServerError(null);
      toast.success('As alterações já aparecem na vitrine e nas suas cotações.', 'Perfil salvo');
    },
    onError: (err) => {
      const msg = serverMessage(err, 'Não foi possível salvar o perfil. Tente novamente.');
      setServerError(msg);
      toast.error(msg, 'Perfil não salvo');
    },
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const submit = (e) => {
    e.preventDefault();
    if (!dirty) return;
    mutation.mutate({
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state || '',
      deliveryArea: form.deliveryArea.trim(),
      description: form.description.trim(),
      services: form.services,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0 lg:order-2 lg:sticky lg:top-24">
        <CredentialsCard pharmacy={pharmacy} />
      </div>
      <Card className="min-w-0 rounded-2xl lg:order-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[1.0625rem]">
            <Store className="size-5 text-primary" aria-hidden="true" /> Perfil da farmácia
          </CardTitle>
          <CardDescription>Como a sua farmácia aparece para os pacientes na vitrine e nas cotações.</CardDescription>
        </CardHeader>
        <form onSubmit={submit} noValidate>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="pf-phone" label="Telefone de contato" hint="Não aparece na vitrine pública; o paciente vê junto com a sua cotação.">
                <Input id="pf-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={set('phone')} aria-describedby="pf-phone-hint" placeholder="(11) 90000-0000" className="h-10" />
              </Field>
              <Field id="pf-delivery" label="Área de entrega" hint="Bairros, regiões ou cidades atendidas.">
                <Input id="pf-delivery" maxLength={300} value={form.deliveryArea} onChange={set('deliveryArea')} aria-describedby="pf-delivery-hint" placeholder="Ex.: Zona Sul e Centro" className="h-10" />
              </Field>
            </div>
            <Field id="pf-address" label="Endereço">
              <Input id="pf-address" autoComplete="street-address" maxLength={300} value={form.address} onChange={set('address')} placeholder="Rua, número, bairro" className="h-10" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_140px]">
              <Field id="pf-city" label="Cidade">
                <Input id="pf-city" autoComplete="address-level2" maxLength={120} value={form.city} onChange={set('city')} className="h-10" />
              </Field>
              <Field id="pf-state" label="UF">
                <Select value={form.state || NO_UF} onValueChange={(v) => setForm((f) => ({ ...f, state: v === NO_UF ? '' : v }))}>
                  <SelectTrigger id="pf-state" className="w-full data-[size=default]:h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_UF}>Não informado</SelectItem>
                    {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="pf-description">Sobre a farmácia</Label>
                <span className={`num text-xs ${form.description.length >= DESCRIPTION_MAX ? 'text-destructive' : 'text-muted-foreground'}`} aria-live="polite">
                  {form.description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              <Textarea
                id="pf-description"
                rows={4}
                maxLength={DESCRIPTION_MAX}
                value={form.description}
                onChange={set('description')}
                aria-describedby="pf-description-hint"
                placeholder="Especialidades, diferenciais, tempo de mercado…"
              />
              <p id="pf-description-hint" className="text-xs text-muted-foreground">Exibido na vitrine pública. Evite promessas de cura ou de resultado (normas da Anvisa).</p>
            </div>
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="pf-services">Serviços oferecidos</Label>
                <span className="num text-xs text-muted-foreground">{form.services.length}/12</span>
              </div>
              <ServicesInput
                id="pf-services"
                value={form.services}
                onChange={(services) => setForm((f) => ({ ...f, services }))}
                describedBy="pf-services-hint"
              />
              <p id="pf-services-hint" className="text-xs text-muted-foreground">Até 12 serviços, com até 40 caracteres cada. Pressione Enter para adicionar.</p>
            </div>
            {serverError && (
              <p role="alert" className="rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3 text-sm text-foreground">
                {serverError}
              </p>
            )}
          </CardContent>
          <CardFooter className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-6">
            {dirty && <span className="mr-auto text-xs text-muted-foreground" aria-live="polite">Alterações não salvas</span>}
            <Button type="button" variant="ghost" disabled={!dirty || mutation.isPending} onClick={() => { setForm(baseline); setServerError(null); }}>
              <Undo2 aria-hidden="true" /> Descartar
            </Button>
            <Button type="submit" disabled={!dirty || mutation.isPending}>
              {mutation.isPending ? <Spinner /> : <Save aria-hidden="true" />} Salvar perfil
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
