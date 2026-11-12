import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, LifeBuoy, MessageSquareText, Save, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import SearchField from '@/components/shared/SearchField';
import DataPagination from '@/components/shared/DataPagination';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import { useToast } from '@/context/ToastContext';
import { adminApi } from '@/services/endpoints';
import { supportTicketCategories, supportTicketStatuses } from '@/constants/status';
import { apiErrorMessage, formatDateTime, formatRelative } from '@/lib/format';
import AdminTable from './components/AdminTable';
import DetailSheet, { AuditNotice, SheetSection } from './components/DetailSheet';
import { FilterBar, FilterSelect } from './components/FilterBar';
import ListState from './components/ListState';
import { Num, TwoLine } from './components/cells';
import { countActive, useSticky, useUrlFilters } from './components/useUrlFilters';
import { REQUESTER_LABEL, toOptions } from './components/labels';

const DEFAULTS = { search: '', status: 'ALL', category: 'ALL', page: 1, id: '' };
const FILTER_KEYS = ['search', 'status', 'category'];
const STATUS_OPTIONS = toOptions(supportTicketStatuses);
const CATEGORY_OPTIONS = toOptions(supportTicketCategories);
const RESOLUTION_MAX = 5000;

/** /admin/support — chamados de pacientes, farmácias e visitantes */
export default function SupportTickets() {
  const { values, setFilter, setPage, setParam, clear } = useUrlFilters(DEFAULTS);
  const params = { search: values.search, status: values.status, category: values.category, page: values.page };
  const list = useQuery({
    queryKey: ['adminSupportTickets', params],
    queryFn: () => adminApi.supportTickets(params),
    placeholderData: (prev) => prev,
  });
  const rows = list.data?.data || [];
  const activeId = useSticky(values.id);
  const active = countActive(values, DEFAULTS, FILTER_KEYS);

  const columns = [
    {
      key: 'subject',
      header: 'Chamado',
      primary: true,
      className: 'max-w-[340px]',
      cell: (t) => (
        <span className="block min-w-0">
          <span className="num block text-xs text-muted-foreground">{t.protocol}</span>
          <TwoLine title={t.subject} subtitle={t.preview} />
        </span>
      ),
    },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge kind="ticket" status={t.status} /> },
    { key: 'category', header: 'Categoria', cell: (t) => <span className="text-sm">{supportTicketCategories[t.category] || t.category}</span> },
    {
      key: 'requester',
      header: 'Solicitante',
      className: 'max-w-[220px]',
      cell: (t) => <TwoLine title={t.name} subtitle={REQUESTER_LABEL(t.requesterType)} />,
    },
    { key: 'createdAt', header: 'Aberto', cell: (t) => <span className="whitespace-nowrap text-muted-foreground">{formatRelative(t.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Conformidade"
        title="Atendimento"
        description="Chamados abertos por pacientes, farmácias e visitantes. A listagem traz só uma prévia: a mensagem completa fica no detalhe, com leitura registrada."
      />
      <FilterBar activeCount={active} onClear={() => clear(FILTER_KEYS)}>
        <SearchField
          value={values.search}
          onChange={(v) => setFilter('search', v)}
          label="Buscar chamados por protocolo, assunto, nome ou e-mail"
          placeholder="Protocolo, assunto, nome ou e-mail"
          className="md:w-[300px] md:max-w-none"
        />
        <FilterSelect label="Filtrar por status do chamado" value={values.status} onChange={(v) => setFilter('status', v)} options={STATUS_OPTIONS} allLabel="Todos os status" />
        <FilterSelect label="Filtrar por categoria" value={values.category} onChange={(v) => setFilter('category', v)} options={CATEGORY_OPTIONS} allLabel="Todas as categorias" className="md:w-[240px]" />
      </FilterBar>

      <ListState
        isLoading={list.isLoading}
        isError={list.isError && !list.data}
        onRetry={list.refetch}
        errorTitle="Erro ao carregar chamados"
        isEmpty={rows.length === 0}
        emptyIcon={LifeBuoy}
        emptyTitle={active ? 'Nenhum chamado com esses filtros' : 'Nenhum chamado recebido'}
        emptyDescription={active ? 'Ajuste a busca ou limpe os filtros para ver mais resultados.' : 'Quando alguém pedir ajuda pelo site ou pela área logada, o chamado aparece aqui.'}
        emptyAction={active ? <Button variant="outline" onClick={() => clear(FILTER_KEYS)}>Limpar filtros</Button> : null}
      >
        <AdminTable
          caption="Chamados de suporte"
          columns={columns}
          rows={rows}
          busy={list.isFetching && list.isPlaceholderData}
          onRowClick={(t) => setParam('id', t.id)}
          rowLabel={(t) => `chamado ${t.protocol}`}
        />
        <DataPagination page={list.data?.page} totalPages={list.data?.totalPages} total={list.data?.total} onPageChange={setPage} />
      </ListState>

      <TicketDetailSheet
        ticketId={activeId}
        summary={rows.find((r) => r.id === activeId)}
        open={Boolean(values.id)}
        onOpenChange={(open) => !open && setParam('id', '')}
      />
    </>
  );
}

function TicketDetailSheet({ ticketId, summary, open, onOpenChange }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const statusId = useId();
  const resolutionId = useId();
  const resolutionHintId = useId();
  const detail = useQuery({
    queryKey: ['adminSupportTicket', ticketId],
    queryFn: () => adminApi.supportTicket(ticketId),
    enabled: Boolean(ticketId),
    // Cada leitura gera um registro ADMIN_VIEW_SUPPORT_TICKET na trilha: sem releituras automáticas
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
  const t = detail.data;
  const base = t || summary || {};

  // Rascunho atrelado à versão carregada do chamado: ao trocar de chamado (ou salvar), reinicia sozinho
  const version = t ? `${t.id}:${t.updatedAt}` : '';
  const [draft, setDraft] = useState(null);
  const initial = { version, status: t?.status || '', resolution: t?.resolution || '', touched: false };
  const form = draft?.version === version ? draft : initial;
  const touched = form.touched;
  const setForm = (update) => setDraft((prev) => ({ ...update(prev?.version === version ? prev : initial), version }));
  const setTouched = () => setForm((f) => ({ ...f, touched: true }));

  const needsResolution = form.status === 'RESOLVED' && !form.resolution.trim();
  const dirty = Boolean(t) && (form.status !== t.status || form.resolution.trim() !== (t.resolution || '').trim());

  const save = useMutation({
    mutationFn: () => adminApi.updateSupportTicket(ticketId, { status: form.status, resolution: form.resolution.trim() || null }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['adminSupportTicket', ticketId], updated);
      queryClient.invalidateQueries({ queryKey: ['adminSupportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminAuditLogs'] });
      const linked = updated?.userId || updated?.pharmacyId;
      toast.success(
        linked ? 'O solicitante foi notificado na conta dele.' : 'Chamado de visitante: responda também pelo e-mail informado.',
        `Chamado ${updated?.protocol || ''} atualizado`.trim()
      );
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Não foi possível atualizar o chamado.')),
  });

  const submit = (e) => {
    e.preventDefault();
    setTouched();
    if (needsResolution || !dirty) return;
    save.mutate();
  };

  const accountLink = t?.userId
    ? { to: `/admin/users?id=${t.userId}`, label: 'Abrir conta do paciente' }
    : t?.pharmacyId
      ? { to: `/admin/pharmacies?tab=all&id=${t.pharmacyId}`, label: 'Abrir ficha da farmácia' }
      : null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={base.subject || 'Chamado'}
      description={base.protocol ? `Protocolo ${base.protocol}` : undefined}
      badges={
        base.id && (
          <>
            {base.status && <StatusBadge kind="ticket" status={base.status} />}
            {base.category && <StatusBadge tone="neutral" dot={false}>{supportTicketCategories[base.category] || base.category}</StatusBadge>}
          </>
        )
      }
      isLoading={detail.isLoading}
      isError={detail.isError}
      onRetry={detail.refetch}
      errorTitle="Não foi possível carregar o chamado"
      footer={
        t && (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t.resolvedAt ? `Encerrado em ${formatDateTime(t.resolvedAt)}` : `Última atualização ${formatRelative(t.updatedAt)}`}
            </p>
            <Button type="submit" form="ticket-form" disabled={save.isPending || !dirty}>
              {save.isPending ? <Spinner /> : <Save aria-hidden="true" />} Salvar atendimento
            </Button>
          </div>
        )
      }
    >
      {t && (
        <>
          <AuditNotice>A leitura da mensagem completa foi registrada na trilha de auditoria: ela pode conter dados de saúde.</AuditNotice>

          <SheetSection title="Solicitante" icon={UserRound}>
            <KeyValueList>
              <KeyValue label="Nome">{t.name}</KeyValue>
              <KeyValue label="E-mail">
                <a href={`mailto:${t.email}?subject=${encodeURIComponent(`[${t.protocol}] ${t.subject}`)}`} className="text-primary underline-offset-4 hover:underline">
                  {t.email}
                </a>
              </KeyValue>
              <KeyValue label="Tipo">{REQUESTER_LABEL(t.requesterType)}</KeyValue>
              <KeyValue label="Conta vinculada">
                {accountLink ? (
                  <Link to={accountLink.to} className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline">
                    {accountLink.label} <ExternalLink className="size-3.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="font-normal text-muted-foreground">Sem conta (visitante). A resposta deve ir por e-mail.</span>
                )}
              </KeyValue>
              <KeyValue label="Aberto em">{formatDateTime(t.createdAt)}</KeyValue>
            </KeyValueList>
          </SheetSection>

          <SheetSection title="Mensagem" icon={MessageSquareText}>
            <div className="rounded-xl border border-border bg-card px-4 py-3.5">
              <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground">{t.message}</p>
            </div>
          </SheetSection>

          <form id="ticket-form" onSubmit={submit} noValidate className="space-y-4">
            <SheetSection title="Tratamento" icon={LifeBuoy}>
              <div className="space-y-2">
                <Label htmlFor={statusId}>Status</Label>
                <Select value={form.status} onValueChange={(status) => setForm((f) => ({ ...f, status }))}>
                  <SelectTrigger id={statusId} className="h-10 w-full sm:w-[260px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={resolutionId}>Resposta ao solicitante{form.status === 'RESOLVED' ? ' *' : ''}</Label>
                <Textarea
                  id={resolutionId}
                  rows={5}
                  maxLength={RESOLUTION_MAX}
                  value={form.resolution}
                  onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))}
                  aria-invalid={touched && needsResolution ? true : undefined}
                  aria-describedby={resolutionHintId}
                  placeholder="Explique o que foi feito ou a orientação dada. O texto aparece para o solicitante na área de atendimento."
                />
                <p id={resolutionHintId} className={touched && needsResolution ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
                  {touched && needsResolution
                    ? 'Para marcar como resolvido, escreva a resposta ao solicitante.'
                    : `Obrigatória para "Resolvido". ${form.resolution.length}/${RESOLUTION_MAX} caracteres.`}
                </p>
              </div>
            </SheetSection>
          </form>
        </>
      )}
    </DetailSheet>
  );
}
