import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Clock, Eye, FileText, FlaskConical, Info, Lock, PawPrint, Send, SearchX, ShieldCheck, Ban } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { FadeUp, PopIn } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { pharmacyApi } from '@/services/endpoints';
import { formatDateTime, formatMoney, formatRelative } from '@/lib/format';
import QuotePreviewCard from './components/QuotePreviewCard';
import { NotVerifiedState } from './components/VerificationNotice';
import { usePrescriptionViewer } from './components/usePrescriptionViewer';
import {
  RELEASE_NOTICE, canViewPrescription, deliveryDaysLabel, errorCode, errorStatus, myQuoteOf, parseBRL, patientAlias,
  quotePriceLabel, serverMessage, shortId,
} from './components/utils';
import { ControlledDocumentAlert, KindBadge, VetAnimalSummary } from './components/vet';
import { TUTOR_RELEASE_NOTICE, animalOf, isVetPrescription } from './components/vetUtils';

const NOTES_MAX = 500;
const DAYS_MAX = 60;
const SPEC_MAX = 120;

/** Sugestões para a proposta veterinária (o campo continua livre) */
const VET_FORMS = [
  'Biscoito medicamentoso',
  'Pasta oral',
  'Suspensão oral',
  'Cápsula',
  'Gel transdérmico',
  'Solução otológica',
  'Pomada dermatológica',
];
const VET_FLAVORS = ['Carne', 'Frango', 'Bacon', 'Peixe', 'Fígado', 'Sem aromatizante'];

function validateDays(value) {
  if (!String(value).trim()) return 'Informe o prazo em dias úteis.';
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > DAYS_MAX) return `Use um número inteiro de 1 a ${DAYS_MAX}.`;
  return null;
}

/** Tempo de manipulação (opcional): inteiro positivo e dentro do prazo total prometido */
function validatePrepDays(value, totalDays) {
  if (!String(value).trim()) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > DAYS_MAX) return `Use um número inteiro de 1 a ${DAYS_MAX}.`;
  const total = Number(totalDays);
  if (Number.isInteger(total) && total > 0 && n > total) return 'O tempo de manipulação não pode passar do prazo total.';
  return null;
}

function FieldError({ id, children }) {
  if (!children) return null;
  return <p id={id} className="text-xs font-medium text-destructive">{children}</p>;
}

/** Painel exibido quando a receita não aceita (mais) proposta desta farmácia */
function Notice({ icon: Icon, title, children, tone = 'primary', action }) {
  return (
    <FadeUp duration={0.4} y={8} className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <span className={cn('mb-4 inline-flex size-14 items-center justify-center rounded-full', tone === 'primary' ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground')}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="font-heading text-lg font-medium text-foreground">{title}</h2>
      <div className="mt-1.5 w-full text-sm leading-relaxed text-muted-foreground">{children}</div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {action}
        <Button asChild variant="outline">
          <Link to="/pharmacy/requests"><ArrowLeft aria-hidden="true" /> Voltar às solicitações</Link>
        </Button>
      </div>
    </FadeUp>
  );
}

function QuoteSummary({ price, days, notes, specs }) {
  return (
    <KeyValueList className="text-left">
      <KeyValue label="Valor total"><span className="num text-base">{price}</span></KeyValue>
      <KeyValue label="Prazo">{deliveryDaysLabel(days)}</KeyValue>
      {specs?.pharmaceuticalForm && <KeyValue label="Forma farmacêutica">{specs.pharmaceuticalForm}</KeyValue>}
      {specs?.flavoring && <KeyValue label="Aromatização">{specs.flavoring}</KeyValue>}
      {specs?.estimatedPreparationDays && (
        <KeyValue label="Tempo de manipulação">
          <span className="num">{specs.estimatedPreparationDays}</span> {Number(specs.estimatedPreparationDays) === 1 ? 'dia' : 'dias'}
        </KeyValue>
      )}
      <KeyValue label="Observações"><span className="whitespace-pre-line font-normal">{notes || '—'}</span></KeyValue>
    </KeyValueList>
  );
}

function SuccessState({ quote, fallback, vet }) {
  const price = quote ? quotePriceLabel(quote) : fallback.price;
  const specs = quote
    ? { pharmaceuticalForm: quote.pharmaceuticalForm, flavoring: quote.flavoring, estimatedPreparationDays: quote.estimatedPreparationDays }
    : fallback.specs;
  return (
    <FadeUp duration={0.45} y={10} role="status" className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-border bg-mint-wash px-6 py-12 text-center">
      <PopIn className="mb-5 inline-flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-8" aria-hidden="true" />
      </PopIn>
      <h2 className="font-heading text-2xl font-semibold text-foreground">Proposta enviada!</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {vet ? 'O tutor do animal recebeu uma notificação com o valor, a formulação e o prazo.' : 'O paciente recebeu uma notificação com o valor e o prazo.'}{' '}
        Se ele aprovar, o pedido aparece em <strong className="font-medium text-foreground">Pedidos → Em produção</strong>.
      </p>
      <div className="mt-6 w-full">
        <QuoteSummary price={price} days={quote?.deliveryDays ?? fallback.days} notes={quote?.notes ?? fallback.notes} specs={vet ? specs : null} />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/pharmacy/requests"><ArrowLeft aria-hidden="true" /> Voltar às solicitações</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pharmacy">Ir para o painel</Link>
        </Button>
      </div>
    </FadeUp>
  );
}

/** Campo de texto com sugestões (datalist): forma farmacêutica e aromatização */
function SuggestField({ id, label, hint, value, onChange, options, placeholder }) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} list={`${id}-options`} value={value} onChange={onChange} placeholder={placeholder} maxLength={SPEC_MAX} autoComplete="off" className="h-10" />
      <datalist id={`${id}-options`}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Envio de cotação (/pharmacy/send-quote/:id) — POST /quotes { prescriptionId, price, deliveryDays, notes }.
 * Receita veterinária: também envia pharmaceuticalForm, flavoring e estimatedPreparationDays (quando preenchidos).
 */
export default function SendQuote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const viewer = usePrescriptionViewer();
  const priceRef = useRef(null);
  const daysRef = useRef(null);
  const prepRef = useRef(null);

  const [form, setForm] = useState({ price: '', days: '', notes: '', pharmaceuticalForm: '', flavoring: '', prepDays: '' });
  const [touched, setTouched] = useState({ price: false, days: false, prepDays: false });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sent, setSent] = useState(null);
  const [conflict, setConflict] = useState(null);

  const prescriptionQuery = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => pharmacyApi.prescription(id),
    enabled: !!id,
  });
  const me = useQuery({ queryKey: ['pharmacyMe'], queryFn: pharmacyApi.me, staleTime: 5 * 60_000 });
  const stats = useQuery({ queryKey: ['pharmacyStats'], queryFn: pharmacyApi.stats });

  const prescription = prescriptionQuery.data;
  const vet = isVetPrescription(prescription);
  const audience = vet ? 'tutor' : 'paciente';

  const parsedPrice = parseBRL(form.price);
  const priceError = parsedPrice.error;
  const daysError = validateDays(form.days);
  const prepError = vet ? validatePrepDays(form.prepDays, form.days) : null;
  const priceLabel = parsedPrice.value ? formatMoney(parsedPrice.value) : '';
  const notes = form.notes.trim();
  const specs = vet
    ? {
        pharmaceuticalForm: form.pharmaceuticalForm.trim() || undefined,
        flavoring: form.flavoring.trim() || undefined,
        estimatedPreparationDays: form.prepDays && !prepError ? Number(form.prepDays) : undefined,
      }
    : null;

  const mutation = useMutation({
    mutationFn: (payload) => pharmacyApi.sendQuote(payload),
    onSuccess: (quote) => {
      setConfirmOpen(false);
      setSent(quote || {});
      queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
      queryClient.invalidateQueries({ queryKey: ['availablePrescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription', id] });
      toast.success(`O ${audience} foi avisado e já pode aprovar a sua proposta.`, 'Proposta enviada');
    },
    onError: (err) => {
      setConfirmOpen(false);
      const code = errorCode(err);
      if (['QUOTE_ALREADY_EXISTS', 'PRESCRIPTION_ALREADY_FINALIZED', 'PHARMACY_NOT_VERIFIED', 'CAPABILITY_REQUIRED'].includes(code)) {
        setConflict({ code, message: serverMessage(err) });
        queryClient.invalidateQueries({ queryKey: ['prescription', id] });
        queryClient.invalidateQueries({ queryKey: ['availablePrescriptions'] });
      }
      toast.error(serverMessage(err, 'Não foi possível enviar a proposta. Tente novamente.'), 'Proposta não enviada');
    },
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ price: true, days: true, prepDays: true });
    if (priceError) {
      priceRef.current?.focus();
      return;
    }
    if (daysError) {
      daysRef.current?.focus();
      return;
    }
    if (prepError) {
      prepRef.current?.focus();
      return;
    }
    setConfirmOpen(true);
  };

  const confirm = () => {
    mutation.mutate({
      prescriptionId: id,
      price: parsedPrice.value,
      deliveryDays: Number(form.days),
      notes: notes || undefined,
      ...(specs?.pharmaceuticalForm ? { pharmaceuticalForm: specs.pharmaceuticalForm } : {}),
      ...(specs?.flavoring ? { flavoring: specs.flavoring } : {}),
      ...(specs?.estimatedPreparationDays ? { estimatedPreparationDays: specs.estimatedPreparationDays } : {}),
    });
  };

  const header = (
    <PageHeader
      eyebrow="Nova proposta"
      title={vet ? 'Enviar cotação veterinária' : 'Enviar cotação'}
      description={
        prescription
          ? vet
            ? `Receita veterinária #${shortId(prescription.id)} · ${animalOf(prescription)?.name || 'Animal'}`
            : `Receita #${shortId(prescription.id)} · ${patientAlias(prescription)}`
          : 'Informe valor, prazo e observações. O paciente compara as propostas e escolhe uma.'
      }
      actions={
        <Button variant="ghost" onClick={() => navigate('/pharmacy/requests')}>
          <ArrowLeft aria-hidden="true" /> Voltar às solicitações
        </Button>
      }
    />
  );

  if (sent) {
    return (
      <>
        {header}
        <SuccessState
          vet={vet}
          quote={sent.priceCents !== undefined ? sent : null}
          fallback={{ price: priceLabel, days: form.days, notes, specs }}
        />
      </>
    );
  }

  if (prescriptionQuery.isLoading) {
    return (
      <>
        {header}
        <LoadingState variant="detail" message="Carregando a receita…" />
      </>
    );
  }

  const loadError = prescriptionQuery.error;
  if (errorCode(loadError) === 'PHARMACY_NOT_VERIFIED' || conflict?.code === 'PHARMACY_NOT_VERIFIED') {
    return (
      <>
        {header}
        <NotVerifiedState status={me.data?.verificationStatus} rejectionReason={me.data?.rejectionReason} title="Envio de cotações bloqueado" />
      </>
    );
  }
  if (errorCode(loadError) === 'CAPABILITY_REQUIRED' || conflict?.code === 'CAPABILITY_REQUIRED') {
    return (
      <>
        {header}
        <Notice
          icon={ShieldCheck}
          title="Sua farmácia não está habilitada para esta receita"
          action={
            <Button asChild>
              <Link to="/pharmacy/veterinary-capability">Ver habilitação veterinária</Link>
            </Button>
          }
        >
          <p>
            {serverMessage(loadError, conflict?.message) ||
              'Receitas veterinárias só podem ser cotadas por farmácias com a habilitação MAPA/CRMV aprovada.'}
          </p>
        </Notice>
      </>
    );
  }
  if (loadError || !prescription) {
    return (
      <>
        {header}
        {errorStatus(loadError) === 404 || !loadError ? (
          <EmptyState
            icon={SearchX}
            title="Receita não encontrada"
            description="Ela pode ter sido cancelada pelo paciente ou já ter sido encerrada."
            action={<Button asChild variant="outline"><Link to="/pharmacy/requests">Voltar às solicitações</Link></Button>}
          />
        ) : (
          <ErrorState
            title="Erro ao carregar a receita"
            message="Não foi possível carregar os dados desta receita. Verifique sua conexão e tente novamente."
            onRetry={prescriptionQuery.refetch}
          />
        )}
      </>
    );
  }

  const releaseNotice = vet ? TUTOR_RELEASE_NOTICE : RELEASE_NOTICE;
  const existing = myQuoteOf(prescription, currentUser?.id);
  if (existing || conflict?.code === 'QUOTE_ALREADY_EXISTS') {
    return (
      <>
        {header}
        <Notice icon={Check} title="Você já enviou uma proposta para esta receita">
          <p>Cada farmácia pode enviar uma proposta por receita. Acompanhe a decisão do {audience} pelas notificações.</p>
          {existing && (
            <div className="mt-5 space-y-3">
              <StatusBadge kind="quote" status={existing.status} />
              <QuoteSummary
                price={quotePriceLabel(existing)}
                days={existing.deliveryDays}
                notes={existing.notes}
                specs={vet ? existing : null}
              />
              {canViewPrescription(prescription, existing) ? (
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => viewer.open(prescription.id)} disabled={!!viewer.pendingId}>
                    {viewer.pendingId ? <Spinner /> : <Eye aria-hidden="true" />} Ver receita
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/pharmacy/orders">Ir para pedidos</Link>
                  </Button>
                </div>
              ) : (
                <p className="flex items-start justify-center gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {releaseNotice}
                </p>
              )}
            </div>
          )}
        </Notice>
      </>
    );
  }
  if (['ACCEPTED', 'CANCELLED'].includes(prescription.status) || conflict?.code === 'PRESCRIPTION_ALREADY_FINALIZED') {
    return (
      <>
        {header}
        <Notice icon={Ban} tone="muted" title="Esta receita não recebe mais propostas">
          <p>{conflict?.message || `O ${audience} já escolheu uma farmácia ou cancelou o pedido.`}</p>
        </Notice>
      </>
    );
  }

  const showPriceError = touched.price && priceError;
  const showDaysError = touched.days && daysError;
  const showPrepError = touched.prepDays && prepError;
  const SolicitationIcon = vet ? PawPrint : FileText;

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
        <FadeUp duration={0.45} y={10} className="min-w-0 space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-[1.0625rem]">
                <SolicitationIcon className={cn('size-5', vet ? 'text-info' : 'text-primary')} aria-hidden="true" />
                {vet ? 'Solicitação do tutor' : 'Solicitação do paciente'}
                {vet && <KindBadge kind="VETERINARY" />}
              </CardTitle>
              <CardDescription>
                {vet
                  ? 'O tutor fica anônimo até aceitar a sua proposta (LGPD). Os dados do animal servem para o cálculo da dose.'
                  : 'O paciente aparece só pelo pseudônimo até aceitar a sua proposta (LGPD).'}
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              {vet && (
                <>
                  <p className="font-heading text-base font-medium text-foreground">{animalOf(prescription)?.name || 'Animal'}</p>
                  <VetAnimalSummary prescription={prescription} showDocument />
                  {(prescription.requiresManualDocumentCheck || prescription.vetDocumentType === 'CONTROLLED_NOTIFICATION') && (
                    <ControlledDocumentAlert number={prescription.controlledNotificationNumber} />
                  )}
                </>
              )}
              <KeyValueList>
                <KeyValue label={vet ? 'Tutor' : 'Paciente'}>{patientAlias(prescription)}</KeyValue>
                <KeyValue label="Código da receita"><span className="num">#{shortId(prescription.id)}</span></KeyValue>
                <KeyValue label="Enviada">
                  <span title={formatDateTime(prescription.createdAt)}>{formatRelative(prescription.createdAt)}</span>
                </KeyValue>
                <KeyValue label="Situação"><StatusBadge kind="prescription" status={prescription.status} /></KeyValue>
                <KeyValue label={vet ? 'Observações do tutor' : 'Observações do paciente'}>
                  {prescription.notes ? (
                    <span className="whitespace-pre-line font-normal">{prescription.notes}</span>
                  ) : (
                    <span className="font-normal text-muted-foreground">O {audience} não deixou observações.</span>
                  )}
                </KeyValue>
              </KeyValueList>
              <p className="flex items-start gap-2 rounded-xl bg-muted/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {releaseNotice}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-[1.0625rem]">{vet ? 'Dados da proposta veterinária' : 'Dados da proposta'}</CardTitle>
              <CardDescription>O valor é o total cobrado do {audience}, incluindo manipulação e entrega.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="grid gap-5">
                {vet && (
                  <fieldset className="grid gap-4 rounded-xl border border-[color-mix(in_oklab,var(--info)_25%,var(--border))] bg-info-wash/30 p-4">
                    <legend className="flex items-center gap-1.5 px-1 text-sm font-medium text-foreground">
                      <FlaskConical className="size-4 text-info" aria-hidden="true" /> Especificações para o animal
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SuggestField
                        id="quote-form"
                        label="Forma farmacêutica"
                        value={form.pharmaceuticalForm}
                        onChange={set('pharmaceuticalForm')}
                        options={VET_FORMS}
                        placeholder="Ex: biscoito medicamentoso, pasta oral"
                      />
                      <SuggestField
                        id="quote-flavoring"
                        label="Aromatização"
                        value={form.flavoring}
                        onChange={set('flavoring')}
                        options={VET_FLAVORS}
                        placeholder="Ex: carne, frango"
                      />
                    </div>
                    <div className="grid content-start gap-2 sm:max-w-xs">
                      <Label htmlFor="quote-prep-days">Tempo de manipulação</Label>
                      <InputGroup className="h-10">
                        <InputGroupInput
                          ref={prepRef}
                          id="quote-prep-days"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={DAYS_MAX}
                          placeholder="Ex: 1"
                          value={form.prepDays}
                          onChange={set('prepDays')}
                          onBlur={() => setTouched((t) => ({ ...t, prepDays: true }))}
                          aria-invalid={!!showPrepError}
                          aria-describedby={showPrepError ? 'quote-prep-days-error' : 'quote-prep-days-hint'}
                          className="num"
                        />
                        <InputGroupAddon align="inline-end"><InputGroupText>dias</InputGroupText></InputGroupAddon>
                      </InputGroup>
                      {showPrepError ? (
                        <FieldError id="quote-prep-days-error">{showPrepError}</FieldError>
                      ) : (
                        <p id="quote-prep-days-hint" className="text-xs text-muted-foreground">Opcional. Parte do prazo total de entrega.</p>
                      )}
                    </div>
                  </fieldset>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid content-start gap-2">
                    <Label htmlFor="quote-price">Valor total *</Label>
                    <InputGroup className="h-10">
                      <InputGroupAddon><InputGroupText>R$</InputGroupText></InputGroupAddon>
                      <InputGroupInput
                        ref={priceRef}
                        id="quote-price"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="Ex: 89,90"
                        value={form.price}
                        onChange={set('price')}
                        onBlur={() => {
                          setTouched((t) => ({ ...t, price: true }));
                          if (parsedPrice.value) setForm((f) => ({ ...f, price: parsedPrice.value.toFixed(2).replace('.', ',') }));
                        }}
                        aria-invalid={!!showPriceError}
                        aria-describedby={showPriceError ? 'quote-price-error' : undefined}
                        required
                        className="num"
                      />
                    </InputGroup>
                    <FieldError id="quote-price-error">{showPriceError}</FieldError>
                  </div>
                  <div className="grid content-start gap-2">
                    <Label htmlFor="delivery-days-input">Prazo de manipulação e entrega *</Label>
                    <InputGroup className="h-10">
                      <InputGroupAddon><Clock aria-hidden="true" /></InputGroupAddon>
                      <InputGroupInput
                        ref={daysRef}
                        id="delivery-days-input"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={DAYS_MAX}
                        placeholder="Ex: 2"
                        value={form.days}
                        onChange={set('days')}
                        onBlur={() => setTouched((t) => ({ ...t, days: true }))}
                        aria-invalid={!!showDaysError}
                        aria-describedby={showDaysError ? 'quote-days-error' : 'quote-days-hint'}
                        required
                        className="num"
                      />
                      <InputGroupAddon align="inline-end"><InputGroupText>dias úteis</InputGroupText></InputGroupAddon>
                    </InputGroup>
                    {showDaysError ? (
                      <FieldError id="quote-days-error">{showDaysError}</FieldError>
                    ) : (
                      <p id="quote-days-hint" className="text-xs text-muted-foreground">Contados a partir da aprovação do {audience}.</p>
                    )}
                  </div>
                </div>
                <div className="grid content-start gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <Label htmlFor="quote-notes">{vet ? 'Observações para o tutor' : 'Observações para o paciente'}</Label>
                    <span className="num text-xs text-muted-foreground" aria-live="polite">{form.notes.length}/{NOTES_MAX}</span>
                  </div>
                  <Textarea
                    id="quote-notes"
                    rows={4}
                    maxLength={NOTES_MAX}
                    value={form.notes}
                    onChange={set('notes')}
                    placeholder={
                      vet
                        ? 'Ex.: conservar em geladeira após aberto, administrar misturado ao alimento…'
                        : 'Ex.: insumos com laudo de pureza, embalagem âmbar com proteção UV, cuidados na entrega…'
                    }
                    aria-describedby="quote-notes-hint"
                  />
                  <p id="quote-notes-hint" className="text-xs text-muted-foreground">
                    Não peça dados pessoais aqui: o contato do {audience} é liberado automaticamente após a aprovação.
                  </p>
                </div>
                {conflict && (
                  <p role="alert" className="flex gap-2 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3 text-sm text-foreground">
                    <Info className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" /> {conflict.message}
                  </p>
                )}
                <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">Depois de enviada, a proposta não pode ser editada.</p>
                  <Button type="submit" size="lg" disabled={mutation.isPending}>
                    {mutation.isPending ? <Spinner /> : <Send aria-hidden="true" />} Enviar proposta ao {audience}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </FadeUp>

        <FadeUp duration={0.45} y={10} delay={0.08} className="min-w-0 lg:sticky lg:top-24">
          <QuotePreviewCard
            pharmacyName={me.data?.name || currentUser?.name}
            hours={me.data?.businessHours}
            timezone={me.data?.timezone}
            priceLabel={priceLabel}
            deliveryDays={daysError ? null : Number(form.days)}
            notes={notes}
            rating={stats.data?.averageRating}
            reviewsCount={stats.data?.reviewsCount}
            audience={audience}
            vetSpecs={specs}
          />
        </FadeUp>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => !mutation.isPending && setConfirmOpen(open)}
        title="Confirmar envio da proposta?"
        description={`O ${audience} é avisado na hora. Confira os dados: depois de enviada, a proposta não pode ser editada.`}
        confirmLabel="Confirmar e enviar"
        cancelLabel="Voltar e revisar"
        loading={mutation.isPending}
        onConfirm={confirm}
      >
        <QuoteSummary price={priceLabel} days={form.days} notes={notes} specs={specs} />
      </ConfirmDialog>
    </>
  );
}
