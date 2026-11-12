import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, ExternalLink, FileText, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import SearchField from '@/components/shared/SearchField';
import DataPagination from '@/components/shared/DataPagination';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/context/ToastContext';
import { adminApi } from '@/services/endpoints';
import { accountStatuses, pharmacyVerificationStatuses } from '@/constants/status';
import { apiErrorMessage, formatCnpj, formatDate, formatNumber, formatPhone, formatRelative } from '@/lib/format';
import AdminTable from './components/AdminTable';
import { FilterBar, FilterSelect } from './components/FilterBar';
import ListState from './components/ListState';
import PharmacyDetailSheet from './components/PharmacyDetailSheet';
import { CnpjSummary } from './components/PharmacyBits';
import { Num, RatingCell, TwoLine } from './components/cells';
import { countActive, useSticky, useUrlFilters } from './components/useUrlFilters';
import { toOptions } from './components/labels';
import { CapabilitiesPanel } from './components/CapabilityReview';
import { useAdminCapabilities } from './components/capabilities';
import { usePublicConfig } from '@/hooks/usePublicConfig';

const DEFAULTS = {
  tab: 'pending',
  search: '',
  verificationStatus: 'ALL',
  status: 'ALL',
  page: 1,
  id: '',
  // Aba Habilitações: por padrão, a fila de habilitações veterinárias em análise
  capType: 'VETERINARY_COMPOUNDING',
  capStatus: 'PENDING_VERIFICATION',
};
const FILTER_KEYS = ['search', 'verificationStatus', 'status'];
const CAP_FILTER_KEYS = ['capType', 'capStatus'];

/** /admin/pharmacies — fila de credenciamento + cadastro completo de farmácias */
export default function Pharmacies() {
  const { values, setFilter, setPage, setParam, clear, patch } = useUrlFilters(DEFAULTS);
  const pending = useQuery({ queryKey: ['adminPendingPharmacies'], queryFn: adminApi.pendingPharmacies });
  const pendingCount = Array.isArray(pending.data) ? pending.data.length : 0;
  // Habilitações (vertical veterinária): a aba aparece com VET_ENABLED ou quando já existem registros
  const { vetEnabled } = usePublicConfig();
  const capabilities = useAdminCapabilities();
  const capabilityList = Array.isArray(capabilities.data) ? capabilities.data : [];
  const showCapabilities = vetEnabled || capabilityList.length > 0;
  const capabilityPending = capabilityList.filter((c) => c.status === 'PENDING_VERIFICATION').length;
  const tab = values.tab === 'capabilities' && !showCapabilities ? 'pending' : values.tab;

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Farmácias"
        description="Credencie farmácias de manipulação após conferir a documentação sanitária e acompanhe o cadastro, o desempenho e o status de cada conta."
      />
      <Tabs value={tab} onValueChange={(next) => patch({ tab: next, id: '' })} className="gap-5">
        <TabsList className="h-10 w-full sm:w-fit">
          <TabsTrigger value="pending" className="px-3">
            Aguardando verificação
            {pendingCount > 0 && (
              <span className="num ml-1 rounded-full bg-coral px-1.5 text-[0.6875rem] leading-[1.125rem] text-white">{pendingCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="px-3">Todas</TabsTrigger>
          {showCapabilities && (
            <TabsTrigger value="capabilities" className="px-3">
              Habilitações
              {capabilityPending > 0 && (
                <span className="num ml-1 rounded-full bg-coral px-1.5 text-[0.6875rem] leading-[1.125rem] text-white">{capabilityPending}</span>
              )}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="pending">
          <PendingQueue query={pending} />
        </TabsContent>
        <TabsContent value="all">
          {tab === 'all' && <AllPharmacies values={values} setFilter={setFilter} setPage={setPage} setParam={setParam} clear={clear} />}
        </TabsContent>
        {showCapabilities && (
          <TabsContent value="capabilities">
            {tab === 'capabilities' && (
              <CapabilitiesPanel
                query={capabilities}
                type={values.capType}
                status={values.capStatus}
                onTypeChange={(v) => setParam('capType', v)}
                onStatusChange={(v) => setParam('capStatus', v)}
                activeFilters={countActive(values, DEFAULTS, CAP_FILTER_KEYS)}
                onClear={() => clear(CAP_FILTER_KEYS)}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

// ─── Fila de credenciamento ─────────────────────────────────────────────────

function PendingQueue({ query }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null); // { type: 'approve' | 'reject', pharmacy }
  const { data, isLoading, isError, refetch } = query;
  const list = Array.isArray(data) ? data : [];

  const verify = useMutation({
    mutationFn: ({ id, approved, reason }) => adminApi.verifyPharmacy(id, approved, approved ? undefined : reason),
    onSuccess: (_data, { approved, name }) => {
      queryClient.invalidateQueries({ queryKey: ['adminPendingPharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['adminPharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['adminPharmacy'] });
      queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
      if (approved) toast.success(`${name} foi aprovada e já pode enviar cotações.`, 'Farmácia aprovada');
      else toast.info(`O credenciamento de ${name} foi recusado e a farmácia foi notificada.`, 'Credenciamento recusado');
      setAction(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Erro ao processar a verificação da farmácia.')),
  });

  const confirm = (reason) =>
    verify.mutate({ id: action.pharmacy.id, name: action.pharmacy.name, approved: action.type === 'approve', reason });

  if (isLoading) return <LoadingState variant="list" rows={3} message="Carregando solicitações de credenciamento..." />;
  if (isError) {
    return (
      <ErrorState
        title="Erro ao carregar solicitações"
        message="Não foi possível buscar as farmácias que aguardam verificação. Verifique sua conexão e tente novamente."
        onRetry={refetch}
      />
    );
  }
  if (list.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nenhuma farmácia pendente"
        description="Todas as farmácias cadastradas já foram analisadas. Novos pedidos de credenciamento aparecem aqui."
      />
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Confira alvará sanitário, AFE, responsável técnico e a situação do CNPJ antes de liberar o envio de cotações. Ordem: mais antigas primeiro.
      </p>
      <Stagger as="ul" step={0.06} inView={false} className="space-y-4" aria-label="Farmácias aguardando verificação">
        {list.map((pharmacy) => (
          <StaggerItem as="li" key={pharmacy.id} y={12}>
            <PendingCard
              pharmacy={pharmacy}
              onApprove={() => setAction({ type: 'approve', pharmacy })}
              onReject={() => setAction({ type: 'reject', pharmacy })}
            />
          </StaggerItem>
        ))}
      </Stagger>

      <ConfirmDialog
        open={action?.type === 'approve'}
        onOpenChange={(open) => !open && !verify.isPending && setAction(null)}
        title="Aprovar farmácia?"
        description={action ? `"${action.pharmacy.name}" passa a receber receitas e a enviar cotações aos pacientes. A farmácia será notificada.` : ''}
        confirmLabel="Confirmar aprovação"
        loading={verify.isPending}
        onConfirm={() => confirm()}
      />
      <ConfirmDialog
        open={action?.type === 'reject'}
        onOpenChange={(open) => !open && !verify.isPending && setAction(null)}
        title="Recusar credenciamento?"
        description={action ? `Informe o motivo regulatório. Ele é enviado a "${action.pharmacy.name}" para que a farmácia corrija o cadastro.` : ''}
        confirmLabel="Confirmar recusa"
        destructive
        loading={verify.isPending}
        reason={{ label: 'Motivo da recusa', required: true, minLength: 5, placeholder: 'Ex.: licença sanitária com validade expirada.' }}
        onConfirm={confirm}
      />
    </>
  );
}

function PendingCard({ pharmacy: p, onApprove, onReject }) {
  return (
    <article aria-labelledby={`pending-${p.id}`} className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={`pending-${p.id}`} className="font-heading text-lg font-semibold leading-tight text-foreground">{p.name}</h2>
              <StatusBadge kind="verification" status="PENDING_VERIFICATION" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              CNPJ <span className="num text-foreground">{formatCnpj(p.cnpj)}</span>
              {p.createdAt && <> · cadastro {formatRelative(p.createdAt)} ({formatDate(p.createdAt)})</>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 md:shrink-0">
          <Button type="button" onClick={onApprove} className="flex-1 md:flex-none">
            <Check aria-hidden="true" /> Aprovar
          </Button>
          <Button type="button" variant="outline" onClick={onReject} className="flex-1 border-[color-mix(in_oklab,var(--coral)_40%,var(--border))] text-[hsl(4_62%_42%)] hover:bg-coral-wash md:flex-none">
            <X aria-hidden="true" /> Recusar
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-t border-border pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <dl className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
          <Field label="Alvará sanitário">{orMissing(p.sanitaryLicense, (v) => <Num>{v}</Num>)}</Field>
          <Field label="AFE (Anvisa)">{orMissing(p.operatingAuth, (v) => <Num>{v}</Num>)}</Field>
          <Field label="Responsável técnico">{orMissing(p.technicalResponsibleName)}</Field>
          <Field label="CRF">{orMissing(p.technicalResponsibleCrf, (v) => <Num>{`${v}/${p.technicalResponsibleUf || '—'}`}</Num>)}</Field>
          <Field label="E-mail">{orMissing(p.email)}</Field>
          <Field label="Telefone">{orMissing(p.phone, (v) => <Num>{formatPhone(v)}</Num>)}</Field>
          <Field label="Endereço" full>{orMissing(p.address)}</Field>
          {p.deliveryArea && <Field label="Área de entrega" full>{p.deliveryArea}</Field>}
        </dl>
        <div className="space-y-3">
          <CnpjSummary data={p.cnpjData} />
          {p.documentUrl ? (
            <a
              href={p.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-mint-wash focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <FileText className="size-4" aria-hidden="true" /> Ver documento comprobatório
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum documento comprobatório enviado.</p>
          )}
        </div>
      </div>
    </article>
  );
}

/** Valor do cadastro ou "Não informado" discreto (a ausência também é informação para a análise) */
function orMissing(value, render = (v) => v) {
  return value ? render(value) : <span className="font-normal text-muted-foreground">Não informado</span>;
}

function Field({ label, full, children }) {
  return (
    <div className={full ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-foreground">{children}</dd>
    </div>
  );
}

// ─── Todas as farmácias ─────────────────────────────────────────────────────

const VERIFICATION_OPTIONS = toOptions(pharmacyVerificationStatuses);
const STATUS_OPTIONS = toOptions(accountStatuses);

function AllPharmacies({ values, setFilter, setPage, setParam, clear }) {
  const params = { search: values.search, verificationStatus: values.verificationStatus, status: values.status, page: values.page };
  const list = useQuery({
    queryKey: ['adminPharmacies', params],
    queryFn: () => adminApi.pharmacies(params),
    placeholderData: (prev) => prev,
  });
  const rows = list.data?.data || [];
  const activeId = useSticky(values.id);
  const summary = rows.find((r) => r.id === activeId);
  const active = countActive(values, DEFAULTS, FILTER_KEYS);

  const columns = [
    {
      key: 'name',
      header: 'Farmácia',
      primary: true,
      cell: (r) => <TwoLine title={r.name} subtitle={r.email} />,
      className: 'max-w-[280px]',
    },
    { key: 'cnpj', header: 'CNPJ', cell: (r) => <Num>{formatCnpj(r.cnpj)}</Num>, className: 'whitespace-nowrap' },
    { key: 'city', header: 'Cidade', cell: (r) => [r.city, r.state].filter(Boolean).join('/') || '—', className: 'whitespace-nowrap' },
    {
      key: 'situation',
      header: 'Situação',
      mobileFull: true,
      cell: (r) => (
        <span className="flex flex-wrap gap-1.5">
          <StatusBadge kind="verification" status={r.verificationStatus} />
          {/* Conta ativa é o normal: só destaca a suspensão */}
          {r.status === 'SUSPENDED' && <StatusBadge kind="account" status={r.status} />}
        </span>
      ),
    },
    { key: 'rating', header: 'Avaliação', cell: (r) => <RatingCell average={r.averageRating} count={r.reviewsCount} />, className: 'whitespace-nowrap' },
    {
      key: 'activity',
      header: 'Atividade',
      cell: (r) => (
        <span className="flex flex-col whitespace-nowrap text-xs text-muted-foreground">
          <span><span className="num text-[0.8125rem] text-foreground">{formatNumber(r.counts?.quotes ?? 0)}</span> cotações</span>
          <span><span className="num text-[0.8125rem] text-foreground">{formatNumber(r.counts?.orders ?? 0)}</span> pedidos</span>
        </span>
      ),
    },
  ];

  return (
    <>
      <FilterBar activeCount={active} onClear={() => clear(FILTER_KEYS)}>
        <SearchField
          value={values.search}
          onChange={(v) => setFilter('search', v)}
          label="Buscar farmácias por nome, e-mail ou CNPJ"
          placeholder="Nome, e-mail ou CNPJ"
          className="md:w-[280px] md:max-w-none"
        />
        <FilterSelect
          label="Filtrar por credenciamento"
          value={values.verificationStatus}
          onChange={(v) => setFilter('verificationStatus', v)}
          options={VERIFICATION_OPTIONS}
          allLabel="Todo credenciamento"
        />
        <FilterSelect
          label="Filtrar por status da conta"
          value={values.status}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
          allLabel="Todas as contas"
        />
      </FilterBar>

      <ListState
        isLoading={list.isLoading}
        isError={list.isError && !list.data}
        onRetry={list.refetch}
        errorTitle="Erro ao carregar farmácias"
        isEmpty={rows.length === 0}
        emptyIcon={Building2}
        emptyTitle={active ? 'Nenhuma farmácia com esses filtros' : 'Nenhuma farmácia cadastrada'}
        emptyDescription={active ? 'Ajuste a busca ou limpe os filtros para ver mais resultados.' : 'As farmácias aparecem aqui assim que concluírem o cadastro.'}
        emptyAction={active ? <Button variant="outline" onClick={() => clear(FILTER_KEYS)}>Limpar filtros</Button> : null}
      >
        <AdminTable
          caption="Farmácias cadastradas"
          columns={columns}
          rows={rows}
          busy={list.isFetching && list.isPlaceholderData}
          onRowClick={(r) => setParam('id', r.id)}
          rowLabel={(r) => r.name}
        />
        <DataPagination page={list.data?.page} totalPages={list.data?.totalPages} total={list.data?.total} onPageChange={setPage} />
      </ListState>

      <PharmacyDetailSheet
        pharmacyId={activeId}
        summary={summary}
        open={Boolean(values.id)}
        onOpenChange={(open) => !open && setParam('id', '')}
      />
    </>
  );
}
