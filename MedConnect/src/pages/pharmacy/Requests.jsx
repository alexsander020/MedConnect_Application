import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Eye, FileText, Inbox, Lock, PawPrint, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import SearchField from '@/components/shared/SearchField';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { FadeUp, LiftCard, Stagger, StaggerItem } from '@/components/motion';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { pharmacyApi } from '@/services/endpoints';
import { formatDateTime, formatRelative } from '@/lib/format';
import { NotVerifiedState } from './components/VerificationNotice';
import { usePrescriptionViewer } from './components/usePrescriptionViewer';
import {
  RELEASE_NOTICE, canViewPrescription, deliveryDaysLabel, errorCode, isRecent, patientAlias, quotePriceLabel, shortId,
} from './components/utils';
import { CapabilityStatusBadge, ControlledDocumentAlert, KindBadge, VetAnimalSummary } from './components/vet';
import { TUTOR_RELEASE_NOTICE, animalOf, isVetPrescription, usePharmacyCapabilities } from './components/vetUtils';

const myQuote = (p) => (Array.isArray(p?.quotes) && p.quotes.length > 0 ? p.quotes[0] : null);

const KIND_FILTERS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'HUMAN', label: 'Humanas' },
  { value: 'VETERINARY', label: 'Veterinárias' },
];

const kindOf = (p) => (isVetPrescription(p) ? 'VETERINARY' : 'HUMAN');

function RequestCard({ prescription: p, onQuote, onView, viewing, showKind }) {
  const quote = myQuote(p);
  const fresh = !quote && isRecent(p.createdAt);
  const canView = canViewPrescription(p, quote);
  const vet = isVetPrescription(p);
  const Icon = vet ? PawPrint : FileText;
  return (
    <LiftCard
      as="article"
      className={cn(
        'flex h-full flex-col rounded-2xl border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)]',
        vet ? 'border-[color-mix(in_oklab,var(--info)_30%,var(--border))]' : 'border-border'
      )}
      aria-labelledby={`req-${p.id}`}
    >
      <div className="flex items-start gap-3">
        <span className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-full', vet ? 'bg-info-wash text-info' : 'bg-accent text-primary')}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`req-${p.id}`} className="truncate font-heading text-[0.9375rem] font-medium text-foreground">
            {vet ? animalOf(p)?.name || 'Animal' : patientAlias(p)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {vet ? 'Receita veterinária' : 'Receita'} <span className="num">#{shortId(p.id)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {fresh ? (
            <StatusBadge tone="primary" dot={false} className="tracking-wide">NOVA</StatusBadge>
          ) : quote ? (
            <StatusBadge kind="quote" status={quote.status} />
          ) : null}
          {showKind && <KindBadge kind={kindOf(p)} />}
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground" title={formatDateTime(p.createdAt)}>
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        Enviada {formatRelative(p.createdAt)}
      </p>

      {vet && <VetAnimalSummary prescription={p} className="mt-3" />}
      {vet && p.requiresManualDocumentCheck && <ControlledDocumentAlert className="mt-3" />}

      {p.notes && (
        <div className="mt-3 rounded-xl border border-border px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">{vet ? 'Observações do tutor' : 'Observações do paciente'}</p>
          <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-sm text-foreground">{p.notes}</p>
        </div>
      )}

      {quote ? (
        <div className="mt-3 rounded-xl border border-border bg-mint-wash px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Sua proposta</p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="num text-lg text-foreground">{quotePriceLabel(quote)}</span>
            <span className="text-xs text-muted-foreground">{deliveryDaysLabel(quote.deliveryDays)}</span>
          </p>
        </div>
      ) : null}

      {!canView && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {vet ? TUTOR_RELEASE_NOTICE : RELEASE_NOTICE}
        </p>
      )}

      {(canView || !quote) && (
        <div className="mt-auto flex flex-wrap gap-2 pt-4 [&>button]:flex-1">
          {canView && (
            <Button variant="outline" size="sm" onClick={() => onView(p.id)} disabled={viewing} aria-label={`Ver receita ${shortId(p.id)}`}>
              {viewing ? <Spinner /> : <Eye aria-hidden="true" />} Ver receita
            </Button>
          )}
          {!quote && (
            <Button size="sm" onClick={() => onQuote(p.id)}>
              <Send aria-hidden="true" /> Enviar cotação
            </Button>
          )}
        </div>
      )}
    </LiftCard>
  );
}

/** Aviso quando a farmácia filtra receitas veterinárias sem a habilitação MAPA/CRMV verificada */
function VetCapabilityNotice({ capability }) {
  const status = capability?.status;
  let text;
  if (status === 'PENDING_VERIFICATION') {
    text = `Sua solicitação de habilitação veterinária${capability.mapaRegistrationNumber ? ` (registro MAPA ${capability.mapaRegistrationNumber})` : ''} está em análise. Assim que for aprovada, as receitas veterinárias aparecem aqui.`;
  } else if (status === 'SUSPENDED') {
    text = `Sua habilitação veterinária está suspensa${capability.rejectionReason ? `: "${capability.rejectionReason}"` : ''}. Novas cotações veterinárias ficam bloqueadas; pedidos já aprovados seguem normalmente.`;
  } else if (status === 'REJECTED') {
    text = `A solicitação anterior foi recusada${capability.rejectionReason ? `: "${capability.rejectionReason}"` : ''}. Reenvie os documentos corrigidos para liberar o mural veterinário.`;
  } else {
    text = 'Para receber receitas veterinárias, a farmácia precisa comprovar o registro no MAPA, a inscrição da empresa no CRMV e o farmacêutico responsável técnico.';
  }
  return (
    <FadeUp
      duration={0.35}
      y={8}
      role="status"
      className="mb-5 flex flex-col gap-4 rounded-2xl border border-[color-mix(in_oklab,var(--info)_30%,var(--border))] bg-info-wash/60 p-5 sm:flex-row sm:items-start"
    >
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-info">
        <ShieldCheck className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold text-foreground">
          Habilitação veterinária necessária
          <CapabilityStatusBadge status={status} />
        </h2>
        <p className="text-sm leading-relaxed text-foreground/80">{text}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to="/pharmacy/veterinary-capability">
          {capability ? 'Ver detalhes da habilitação' : 'Solicitar habilitação veterinária'} <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </FadeUp>
  );
}

/** Mural de solicitações (/pharmacy/requests): receitas PENDING/QUOTED com dados do paciente/tutor anonimizados */
export default function Requests() {
  const navigate = useNavigate();
  const viewer = usePrescriptionViewer();
  const { vetEnabled } = usePublicConfig();
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [kind, setKind] = useState('ALL');

  const me = useQuery({ queryKey: ['pharmacyMe'], queryFn: pharmacyApi.me, staleTime: 5 * 60_000 });
  const knownUnverified = Boolean(me.data?.verificationStatus) && me.data.verificationStatus !== 'VERIFIED';
  const caps = usePharmacyCapabilities(vetEnabled);

  const query = useQuery({
    queryKey: ['availablePrescriptions'],
    queryFn: pharmacyApi.availablePrescriptions,
    enabled: !knownUnverified,
  });
  const blocked = knownUnverified || errorCode(query.error) === 'PHARMACY_NOT_VERIFIED';

  const all = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);
  const ofKind = useMemo(
    () => (vetEnabled && kind !== 'ALL' ? all.filter((p) => kindOf(p) === kind) : all),
    [all, kind, vetEnabled]
  );
  const pending = ofKind.filter((p) => !myQuote(p));
  const quoted = ofKind.filter((p) => myQuote(p));
  const freshCount = pending.filter((p) => isRecent(p.createdAt)).length;
  const showKind = vetEnabled;
  const vetLocked = vetEnabled && kind === 'VETERINARY' && !caps.isLoading && !caps.vetVerified;

  const list = useMemo(() => {
    const base = tab === 'pending' ? ofKind.filter((p) => !myQuote(p)) : ofKind.filter((p) => myQuote(p));
    const term = search.trim().toLowerCase().replace(/^#/, '');
    const filtered = term
      ? base.filter(
          (p) =>
            p.id.toLowerCase().includes(term) ||
            patientAlias(p).toLowerCase().includes(term) ||
            (animalOf(p)?.name || '').toLowerCase().includes(term)
        )
      : base;
    return [...filtered].sort((a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return sort === 'recent' ? diff : -diff;
    });
  }, [ofKind, tab, search, sort]);

  let content;
  if (blocked) {
    content = <NotVerifiedState status={me.data?.verificationStatus} rejectionReason={me.data?.rejectionReason} title="O mural de receitas está bloqueado" />;
  } else if (query.isLoading) {
    content = <LoadingState variant="cards" rows={6} message="Carregando receitas para cotação…" />;
  } else if (query.isError) {
    content = (
      <ErrorState
        title="Erro ao carregar receitas"
        message="Não foi possível carregar o mural de receitas. Verifique sua conexão e tente novamente."
        onRetry={query.refetch}
      />
    );
  } else if (list.length === 0) {
    content = search ? (
      <EmptyState icon={Inbox} title="Nenhuma receita encontrada" description="Confira o código digitado ou limpe a busca." />
    ) : vetLocked ? (
      <EmptyState icon={PawPrint} title="Nenhuma receita veterinária disponível" description="Habilite sua farmácia para manipulação veterinária para receber as receitas dos tutores." />
    ) : tab === 'pending' ? (
      <EmptyState
        icon={Inbox}
        title="Nenhuma receita aguardando cotação"
        description={vetEnabled ? 'Novas solicitações de pacientes e tutores aparecem aqui assim que são enviadas.' : 'Novas solicitações de pacientes aparecem aqui assim que são enviadas.'}
      />
    ) : (
      <EmptyState icon={Send} title="Você ainda não enviou propostas" description="As receitas que você cotar aparecem nesta aba enquanto o paciente decide." />
    );
  } else {
    content = (
      <Stagger key={`${tab}-${sort}-${kind}`} step={0.06} inView={false} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <StaggerItem key={p.id} y={14} className="min-w-0">
            <RequestCard
              prescription={p}
              onQuote={(id) => navigate(`/pharmacy/send-quote/${id}`)}
              onView={viewer.open}
              viewing={viewer.pendingId === p.id}
              showKind={showKind}
            />
          </StaggerItem>
        ))}
      </Stagger>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Solicitações de cotação"
        description={
          vetEnabled
            ? 'Receitas de pacientes e de tutores de animais aguardando proposta. Ninguém é identificado até aceitar a sua proposta (LGPD).'
            : 'Receitas de pacientes aguardando proposta. O paciente aparece só pelo pseudônimo até aceitar a sua proposta (LGPD).'
        }
        actions={
          !blocked && (
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Spinner /> : <RefreshCw aria-hidden="true" />} Atualizar
            </Button>
          )
        }
      />

      {!blocked && query.isSuccess && (
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="pending">
                Aguardando cotação <span className="num text-xs text-muted-foreground">({pending.length})</span>
              </TabsTrigger>
              <TabsTrigger value="quoted">
                Já cotadas <span className="num text-xs text-muted-foreground">({quoted.length})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={vetEnabled ? 'Buscar pelo código ou animal' : 'Buscar pelo código'}
              label="Buscar receita pelo código"
            />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full data-[size=default]:h-10 sm:w-48" aria-label="Ordenar receitas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes primeiro</SelectItem>
                <SelectItem value="oldest">Mais antigas primeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!blocked && vetEnabled && query.isSuccess && (
        <div role="group" aria-label="Filtrar por tipo de receita" className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipo de receita:</span>
          {KIND_FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={kind === f.value ? 'default' : 'outline'}
              aria-pressed={kind === f.value}
              onClick={() => setKind(f.value)}
              className="rounded-full"
            >
              {f.value === 'VETERINARY' && <PawPrint aria-hidden="true" />}
              {f.label}
              {f.value === 'VETERINARY' && caps.vetVerified && <span className="sr-only"> (habilitada)</span>}
            </Button>
          ))}
        </div>
      )}

      {!blocked && vetLocked && <VetCapabilityNotice capability={caps.vetCapability} />}

      {!blocked && query.isSuccess && tab === 'pending' && freshCount > 0 && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          <span className="num text-foreground">{freshCount}</span> {freshCount === 1 ? 'receita chegou' : 'receitas chegaram'} nas últimas 24 horas.
        </p>
      )}

      {content}
    </>
  );
}
