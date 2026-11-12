import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, ScrollText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DataPagination from '@/components/shared/DataPagination';
import SearchField from '@/components/shared/SearchField';
import { adminApi } from '@/services/endpoints';
import { formatDateTime, formatRelative } from '@/lib/format';
import AdminTable from './components/AdminTable';
import { FilterBar, FilterSelect } from './components/FilterBar';
import ListState from './components/ListState';
import { Num, TwoLine } from './components/cells';
import { countActive, useUrlFilters } from './components/useUrlFilters';
import { ACTOR_LABELS, AUDIT_ACTIONS, AUDIT_RESOURCES, auditActionLabel, auditResourceLabel, shortId } from './components/labels';

const DEFAULTS = { action: 'ALL', resource: 'ALL', actorId: '', resourceId: '', startDate: '', endDate: '', page: 1 };
const FILTER_KEYS = ['action', 'resource', 'actorId', 'resourceId', 'startDate', 'endDate'];
const PAGE_SIZE = 25;

/** "AAAA-MM-DD" (data local do admin) → ISO do início/fim do dia, para o filtro do backend (gte/lte) */
function dayBoundary(date, end) {
  if (!date) return undefined;
  const d = new Date(`${date}T${end ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Opções de filtro: rótulos conhecidos + qualquer valor que tenha vindo da API (a lista não é fechada) */
function optionsFrom(known, seen, current, labelOf) {
  const values = new Set([...Object.keys(known), ...seen]);
  if (current && current !== 'ALL') values.add(current);
  return [...values]
    .map((value) => ({ value, label: labelOf(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

/** `details` é texto: JSON formatado quando possível, texto puro caso contrário */
function prettyDetails(details) {
  if (details === null || details === undefined || details === '') return null;
  if (typeof details === 'object') return JSON.stringify(details, null, 2);
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return String(details);
  }
}

/** /admin/audit — trilha de auditoria (somente leitura) */
export default function AuditLogs() {
  const { values, setFilter, setPage, clear } = useUrlFilters(DEFAULTS);
  const startId = useId();
  const endId = useId();
  const params = {
    action: values.action,
    resource: values.resource,
    actorId: values.actorId.trim(),
    resourceId: values.resourceId,
    startDate: dayBoundary(values.startDate, false),
    endDate: dayBoundary(values.endDate, true),
    page: values.page,
    limit: PAGE_SIZE,
  };
  const list = useQuery({
    queryKey: ['adminAuditLogs', params],
    queryFn: () => adminApi.auditLogs(params),
    placeholderData: (prev) => prev,
  });
  const logs = list.data?.logs || [];
  const active = countActive(values, DEFAULTS, FILTER_KEYS);

  const actionOptions = optionsFrom(AUDIT_ACTIONS, logs.map((l) => l.action).filter(Boolean), values.action, auditActionLabel);
  const resourceOptions = optionsFrom(AUDIT_RESOURCES, logs.map((l) => l.resource).filter(Boolean), values.resource, auditResourceLabel);
  const invalidRange = values.startDate && values.endDate && values.startDate > values.endDate;

  const columns = [
    {
      key: 'createdAt',
      header: 'Quando',
      cell: (l) => (
        <span className="flex flex-col whitespace-nowrap">
          <span className="num text-[0.8125rem] text-foreground">{formatDateTime(l.createdAt)}</span>
          <span className="text-xs text-muted-foreground">{formatRelative(l.createdAt)}</span>
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Ação',
      primary: true,
      className: 'max-w-[300px]',
      cell: (l) => (
        <span className="block min-w-0">
          <span className="block font-medium text-foreground">{auditActionLabel(l.action)}</span>
          {auditActionLabel(l.action) !== l.action && <code className="block truncate text-[0.6875rem] text-muted-foreground">{l.action}</code>}
        </span>
      ),
    },
    {
      key: 'resource',
      header: 'Recurso',
      cell: (l) => (
        <span className="flex flex-col">
          <span className="text-sm">{auditResourceLabel(l.resource)}</span>
          {l.resourceId && <Num className="text-xs text-muted-foreground">{shortId(l.resourceId)}</Num>}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Autor',
      className: 'max-w-[240px]',
      cell: (l) => <TwoLine title={l.actorEmail || shortId(l.actorId)} subtitle={ACTOR_LABELS[l.actorType] || l.actorType} />,
    },
    { key: 'reason', header: 'Motivo', mobileFull: true, className: 'max-w-[220px]', cell: (l) => <span className="block truncate text-muted-foreground">{l.reason || '—'}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Conformidade"
        title="Trilha de auditoria"
        description="Quem acessou ou alterou dados pessoais, quando, de onde e por quê. Use os filtros para responder a pedidos de titulares e a auditorias (LGPD art. 37 e 46)."
      />

      <div role="note" className="mb-6 flex gap-3.5 rounded-2xl border border-border bg-mint-wash px-5 py-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-medium text-foreground">Registro somente de inclusão (append-only)</p>
          <p className="mt-0.5 text-muted-foreground">
            Nenhum registro pode ser alterado ou apagado: o banco de dados bloqueia UPDATE, DELETE e TRUNCATE nesta tabela por
            gatilho, e a API recusa qualquer escrita. Esta tela é apenas de consulta.
          </p>
        </div>
      </div>

      <FilterBar activeCount={active} onClear={() => clear(FILTER_KEYS)} className="md:items-end">
        <FilterSelect label="Filtrar por ação" value={values.action} onChange={(v) => setFilter('action', v)} options={actionOptions} allLabel="Todas as ações" className="md:w-[250px]" />
        <FilterSelect label="Filtrar por recurso" value={values.resource} onChange={(v) => setFilter('resource', v)} options={resourceOptions} allLabel="Todos os recursos" className="md:w-[190px]" />
        <SearchField
          value={values.actorId}
          onChange={(v) => setFilter('actorId', v.trim())}
          label="Filtrar pelo ID do autor"
          placeholder="ID do autor"
          className="md:w-[200px] md:max-w-none"
          delay={500}
        />
        <div className="flex gap-2">
          <div className="min-w-0 flex-1 md:w-[150px] md:flex-none">
            <Label htmlFor={startId} className="mb-1 block text-xs text-muted-foreground">De</Label>
            <Input id={startId} type="date" value={values.startDate} max={values.endDate || undefined} onChange={(e) => setFilter('startDate', e.target.value)} className="h-10 bg-background" />
          </div>
          <div className="min-w-0 flex-1 md:w-[150px] md:flex-none">
            <Label htmlFor={endId} className="mb-1 block text-xs text-muted-foreground">Até</Label>
            <Input id={endId} type="date" value={values.endDate} min={values.startDate || undefined} onChange={(e) => setFilter('endDate', e.target.value)} className="h-10 bg-background" />
          </div>
        </div>
      </FilterBar>

      {(values.resourceId || invalidRange) && (
        <div className="-mt-1 mb-4 flex flex-wrap items-center gap-2 text-sm">
          {values.resourceId && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1 text-xs">
              Somente o registro <Num className="text-xs">{shortId(values.resourceId)}</Num>
              <button
                type="button"
                onClick={() => setFilter('resourceId', '')}
                aria-label="Remover filtro de registro específico"
                className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          )}
          {invalidRange && <p role="alert" className="text-xs font-medium text-destructive">A data inicial é posterior à final: nenhum registro vai aparecer.</p>}
        </div>
      )}

      <ListState
        isLoading={list.isLoading}
        isError={list.isError && !list.data}
        onRetry={list.refetch}
        errorTitle="Erro ao carregar a trilha de auditoria"
        isEmpty={logs.length === 0}
        emptyIcon={ScrollText}
        emptyTitle={active ? 'Nenhum registro com esses filtros' : 'Nenhum registro ainda'}
        emptyDescription={active ? 'Amplie o período ou limpe os filtros.' : 'Os acessos e alterações de dados pessoais aparecem aqui assim que acontecerem.'}
        emptyAction={active ? <Button variant="outline" onClick={() => clear(FILTER_KEYS)}>Limpar filtros</Button> : null}
      >
        <AdminTable
          caption="Registros da trilha de auditoria"
          columns={columns}
          rows={logs}
          busy={list.isFetching && list.isPlaceholderData}
          renderExpanded={(l) => <LogDetails log={l} />}
          rowLabel={(l) => `${auditActionLabel(l.action)} em ${formatDateTime(l.createdAt)}`}
        />
        <DataPagination page={list.data?.page} totalPages={list.data?.totalPages} total={list.data?.total} onPageChange={setPage} />
      </ListState>
    </>
  );
}

function LogDetails({ log: l }) {
  const details = prettyDetails(l.details);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[max-content_minmax(0,1fr)]">
        <Item label="Motivo de acesso">{l.reason || '—'}</Item>
        <Item label="Autor">
          {l.actorEmail || '—'}{' '}
          {l.actorType && <StatusBadge kind="role" status={l.actorType} dot={false} className="ml-1 align-middle" />}
        </Item>
        <Item label="ID do autor"><code className="break-all text-xs">{l.actorId}</code></Item>
        <Item label="Recurso">
          {auditResourceLabel(l.resource)}
          {l.resourceId && <> · <code className="break-all text-xs">{l.resourceId}</code></>}
        </Item>
        <Item label="Endereço IP"><code className="text-xs">{l.ipAddress || '—'}</code></Item>
        <Item label="Navegador (user agent)"><span className="break-words text-xs text-muted-foreground">{l.userAgent || '—'}</span></Item>
        <Item label="ID do registro"><code className="break-all text-xs text-muted-foreground">{l.id}</code></Item>
      </dl>
      <div className="min-w-0">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Detalhes registrados</p>
        {details ? (
          <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-background p-3.5 text-xs leading-relaxed text-foreground">
            <code>{details}</code>
          </pre>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-xs text-muted-foreground">Sem detalhes adicionais.</p>
        )}
      </div>
    </div>
  );
}

function Item({ label, children }) {
  return (
    <>
      <dt className="text-xs text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </>
  );
}
