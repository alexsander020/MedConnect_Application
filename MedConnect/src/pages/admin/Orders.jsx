import { useQuery } from '@tanstack/react-query';
import { History, MessageSquareQuote, Package, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import SearchField from '@/components/shared/SearchField';
import DataPagination from '@/components/shared/DataPagination';
import OrderTimeline from '@/components/shared/OrderTimeline';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import StarRating from '@/components/StarRating';
import { adminApi } from '@/services/endpoints';
import { orderStatuses } from '@/constants/status';
import { formatCents, formatDate, formatDateTime, formatRelative } from '@/lib/format';
import AdminTable from './components/AdminTable';
import DetailSheet, { SheetSection } from './components/DetailSheet';
import { FilterBar, FilterSelect } from './components/FilterBar';
import ListState from './components/ListState';
import { Num, TwoLine } from './components/cells';
import { countActive, useSticky, useUrlFilters } from './components/useUrlFilters';
import { ACTOR_LABELS, shortId } from './components/labels';

const DEFAULTS = { search: '', status: 'ALL', page: 1, id: '' };
const FILTER_KEYS = ['search', 'status'];
// Estados possíveis de um pedido (Order); os demais de orderStatuses são de receitas/cotações
const STATUS_OPTIONS = ['PRODUCTION', 'DELIVERY', 'DELIVERED', 'CANCELLED'].map((value) => ({ value, label: orderStatuses[value].label }));

/** /admin/orders — todos os pedidos da plataforma */
export default function Orders() {
  const { values, setFilter, setPage, setParam, clear } = useUrlFilters(DEFAULTS);
  const params = { search: values.search, status: values.status, page: values.page };
  const list = useQuery({
    queryKey: ['adminOrders', params],
    queryFn: () => adminApi.orders(params),
    placeholderData: (prev) => prev,
  });
  const rows = list.data?.data || [];
  const activeId = useSticky(values.id);
  const active = countActive(values, DEFAULTS, FILTER_KEYS);

  const columns = [
    {
      key: 'id',
      header: 'Pedido',
      primary: true,
      cell: (o) => (
        <span className="flex flex-col">
          <span className="flex flex-wrap items-center gap-1.5">
            <Num>{shortId(o.id)}</Num>
            {o.kind === 'VETERINARY' && (
              <StatusBadge tone="info" dot={false} className="h-5 px-2 text-[0.6875rem]">
                Veterinária
              </StatusBadge>
            )}
          </span>
          <span className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', cell: (o) => <StatusBadge kind="order" status={o.status} /> },
    { key: 'pharmacy', header: 'Farmácia', className: 'max-w-[220px]', cell: (o) => <TwoLine title={o.pharmacy?.name} /> },
    { key: 'patient', header: 'Paciente', className: 'max-w-[200px]', cell: (o) => <TwoLine title={o.patient?.name} /> },
    { key: 'price', header: 'Valor', headClassName: 'text-right', className: 'text-right', cell: (o) => <Num>{formatCents(o.priceCents)}</Num> },
    {
      key: 'delivery',
      header: 'Prazo',
      cell: (o) => <span className="whitespace-nowrap text-muted-foreground">{o.deliveryDays ? `${o.deliveryDays} ${o.deliveryDays === 1 ? 'dia' : 'dias'}` : '—'}</span>,
    },
    { key: 'updatedAt', header: 'Atualizado', mobile: false, cell: (o) => <span className="whitespace-nowrap text-muted-foreground">{formatRelative(o.updatedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Pedidos"
        description="Acompanhe a manipulação e a entrega de todos os pedidos. Busque pelo nome da farmácia, do paciente ou pelo código do pedido."
      />
      <FilterBar activeCount={active} onClear={() => clear(FILTER_KEYS)}>
        <SearchField
          value={values.search}
          onChange={(v) => setFilter('search', v)}
          label="Buscar pedidos por farmácia, paciente ou código"
          placeholder="Farmácia, paciente ou código"
          className="md:w-[300px] md:max-w-none"
        />
        <FilterSelect label="Filtrar por status do pedido" value={values.status} onChange={(v) => setFilter('status', v)} options={STATUS_OPTIONS} allLabel="Todos os status" />
      </FilterBar>

      <ListState
        isLoading={list.isLoading}
        isError={list.isError && !list.data}
        onRetry={list.refetch}
        errorTitle="Erro ao carregar pedidos"
        isEmpty={rows.length === 0}
        emptyIcon={Package}
        emptyTitle={active ? 'Nenhum pedido com esses filtros' : 'Nenhum pedido ainda'}
        emptyDescription={active ? 'Ajuste a busca ou limpe os filtros para ver mais resultados.' : 'Os pedidos aparecem aqui quando um paciente aceita uma cotação.'}
        emptyAction={active ? <Button variant="outline" onClick={() => clear(FILTER_KEYS)}>Limpar filtros</Button> : null}
      >
        <AdminTable
          caption="Pedidos"
          columns={columns}
          rows={rows}
          busy={list.isFetching && list.isPlaceholderData}
          onRowClick={(o) => setParam('id', o.id)}
          rowLabel={(o) => `pedido ${shortId(o.id)}`}
        />
        <DataPagination page={list.data?.page} totalPages={list.data?.totalPages} total={list.data?.total} onPageChange={setPage} />
      </ListState>

      <OrderDetailSheet
        orderId={activeId}
        summary={rows.find((r) => r.id === activeId)}
        open={Boolean(values.id)}
        onOpenChange={(open) => !open && setParam('id', '')}
      />
    </>
  );
}

function OrderDetailSheet({ orderId, summary, open, onOpenChange }) {
  const detail = useQuery({
    queryKey: ['adminOrder', orderId],
    queryFn: () => adminApi.order(orderId),
    enabled: Boolean(orderId),
  });
  const o = detail.data;
  const base = o || summary || {};
  const history = o?.history || [];

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={base.id ? `Pedido ${shortId(base.id)}` : 'Pedido'}
      description={base.createdAt ? `Criado em ${formatDateTime(base.createdAt)}` : undefined}
      badges={base.status && <StatusBadge kind="order" status={base.status} />}
      isLoading={detail.isLoading}
      isError={detail.isError}
      onRetry={detail.refetch}
      errorTitle="Não foi possível carregar o pedido"
    >
      {o && (
        <>
          <SheetSection title="Resumo" icon={Receipt}>
            <KeyValueList>
              <KeyValue label="Farmácia">{o.pharmacy?.name}</KeyValue>
              <KeyValue label="Paciente">{o.patient?.name}</KeyValue>
              <KeyValue label="Valor"><span className="num">{formatCents(o.priceCents)}</span></KeyValue>
              <KeyValue label="Prazo de entrega">{o.deliveryDays ? `${o.deliveryDays} ${o.deliveryDays === 1 ? 'dia' : 'dias'}` : '—'}</KeyValue>
              <KeyValue label="Receita"><span className="num">{shortId(o.prescriptionId)}</span></KeyValue>
              <KeyValue label="Última atualização">{formatDateTime(o.updatedAt)}</KeyValue>
            </KeyValueList>
          </SheetSection>

          <SheetSection title="Andamento" icon={History}>
            <OrderTimeline status={o.status} createdAt={o.createdAt} history={history} />
            {history.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Histórico de mudanças de status</caption>
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-medium">Mudança</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium">Por</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={`${h.toStatus}-${h.createdAt}-${i}`} className="border-t border-border">
                        <td className="px-3 py-2">
                          {h.fromStatus ? `${orderStatuses[h.fromStatus]?.label || h.fromStatus} → ` : ''}
                          <span className="font-medium">{orderStatuses[h.toStatus]?.label || h.toStatus}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{ACTOR_LABELS[h.changedByType] || h.changedByType || '—'}</td>
                        <td className="num whitespace-nowrap px-3 py-2 text-[0.8125rem] text-muted-foreground">{formatDateTime(h.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SheetSection>

          <SheetSection title="Avaliação do paciente" icon={MessageSquareQuote}>
            {o.review ? (
              <div className="rounded-xl border border-border bg-card px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StarRating rating={o.review.rating} size={16} label="Nota do paciente" />
                  <span className="text-xs text-muted-foreground">{formatDate(o.review.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
                  {o.review.comment || <span className="text-muted-foreground">Sem comentário.</span>}
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                {o.status === 'DELIVERED' ? 'O paciente ainda não avaliou este pedido.' : 'A avaliação fica disponível depois da entrega.'}
              </p>
            )}
          </SheetSection>
        </>
      )}
    </DetailSheet>
  );
}
