import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Eye, FileText, Inbox, Lock, RefreshCw, Send } from 'lucide-react';
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
import { LiftCard, Stagger, StaggerItem } from '@/components/motion';
import { pharmacyApi } from '@/services/endpoints';
import { formatDateTime, formatRelative } from '@/lib/format';
import { NotVerifiedState } from './components/VerificationNotice';
import { usePrescriptionViewer } from './components/usePrescriptionViewer';
import {
  RELEASE_NOTICE, canViewPrescription, deliveryDaysLabel, errorCode, isRecent, patientAlias, quotePriceLabel, shortId,
} from './components/utils';

const myQuote = (p) => (Array.isArray(p?.quotes) && p.quotes.length > 0 ? p.quotes[0] : null);

function RequestCard({ prescription: p, onQuote, onView, viewing }) {
  const quote = myQuote(p);
  const fresh = !quote && isRecent(p.createdAt);
  const canView = canViewPrescription(p, quote);
  return (
    <LiftCard as="article" className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)]" aria-labelledby={`req-${p.id}`}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`req-${p.id}`} className="truncate font-heading text-[0.9375rem] font-medium text-foreground">
            {patientAlias(p)}
          </h3>
          <p className="text-xs text-muted-foreground">
            Receita <span className="num">#{shortId(p.id)}</span>
          </p>
        </div>
        {fresh ? (
          <StatusBadge tone="primary" dot={false} className="tracking-wide">NOVA</StatusBadge>
        ) : quote ? (
          <StatusBadge kind="quote" status={quote.status} />
        ) : null}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground" title={formatDateTime(p.createdAt)}>
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        Enviada {formatRelative(p.createdAt)}
      </p>

      {p.notes && (
        <div className="mt-3 rounded-xl border border-border px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">Observações do paciente</p>
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
          {RELEASE_NOTICE}
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

/** Mural de solicitações (/pharmacy/requests): receitas PENDING/QUOTED com dados do paciente anonimizados */
export default function Requests() {
  const navigate = useNavigate();
  const viewer = usePrescriptionViewer();
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');

  const me = useQuery({ queryKey: ['pharmacyMe'], queryFn: pharmacyApi.me, staleTime: 5 * 60_000 });
  const knownUnverified = Boolean(me.data?.verificationStatus) && me.data.verificationStatus !== 'VERIFIED';

  const query = useQuery({
    queryKey: ['availablePrescriptions'],
    queryFn: pharmacyApi.availablePrescriptions,
    enabled: !knownUnverified,
  });
  const blocked = knownUnverified || errorCode(query.error) === 'PHARMACY_NOT_VERIFIED';

  const all = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);
  const pending = all.filter((p) => !myQuote(p));
  const quoted = all.filter((p) => myQuote(p));
  const freshCount = pending.filter((p) => isRecent(p.createdAt)).length;

  const list = useMemo(() => {
    const base = tab === 'pending' ? all.filter((p) => !myQuote(p)) : all.filter((p) => myQuote(p));
    const term = search.trim().toLowerCase().replace(/^#/, '');
    const filtered = term
      ? base.filter((p) => p.id.toLowerCase().includes(term) || patientAlias(p).toLowerCase().includes(term))
      : base;
    return [...filtered].sort((a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return sort === 'recent' ? diff : -diff;
    });
  }, [all, tab, search, sort]);

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
    ) : tab === 'pending' ? (
      <EmptyState icon={Inbox} title="Nenhuma receita aguardando cotação" description="Novas solicitações de pacientes aparecem aqui assim que são enviadas." />
    ) : (
      <EmptyState icon={Send} title="Você ainda não enviou propostas" description="As receitas que você cotar aparecem nesta aba enquanto o paciente decide." />
    );
  } else {
    content = (
      <Stagger key={`${tab}-${sort}`} step={0.06} inView={false} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <StaggerItem key={p.id} y={14} className="min-w-0">
            <RequestCard
              prescription={p}
              onQuote={(id) => navigate(`/pharmacy/send-quote/${id}`)}
              onView={viewer.open}
              viewing={viewer.pendingId === p.id}
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
        description="Receitas de pacientes aguardando proposta. O paciente aparece só pelo pseudônimo até aceitar a sua proposta (LGPD)."
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
            <SearchField value={search} onChange={setSearch} placeholder="Buscar pelo código" label="Buscar receita pelo código" />
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

      {!blocked && query.isSuccess && tab === 'pending' && freshCount > 0 && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          <span className="num text-foreground">{freshCount}</span> {freshCount === 1 ? 'receita chegou' : 'receitas chegaram'} nas últimas 24 horas.
        </p>
      )}

      {content}
    </>
  );
}
