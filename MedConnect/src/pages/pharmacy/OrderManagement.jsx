import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, ChevronRight, FlaskConical, Package, PackageCheck, Truck, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from 'cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import SearchField from '@/components/shared/SearchField';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { EASE_OUT } from '@/components/motion';
import { useToast } from '@/context/ToastContext';
import { pharmacyApi } from '@/services/endpoints';
import { firstName, formatDate, formatRelative, initials } from '@/lib/format';
import OrderDetailSheet from './components/OrderDetailSheet';
import { deliveryDaysLabel, orderDeadline, orderPatient, orderPriceLabel, serverMessage, shortId } from './components/utils';

const TABS = [
  { value: 'production', label: 'Em produção', statuses: ['PRODUCTION'] },
  { value: 'delivery', label: 'Em entrega', statuses: ['DELIVERY'] },
  { value: 'done', label: 'Concluídos', statuses: ['DELIVERED', 'CANCELLED'] },
];
const TAB_OF = { PRODUCTION: 'production', DELIVERY: 'delivery', DELIVERED: 'done', CANCELLED: 'done' };

/** Transições permitidas pela máquina de estados (backend/src/domain/orderStateMachine.ts) */
const TRANSITIONS = {
  PRODUCTION: [
    { to: 'DELIVERY', label: 'Despachar para entrega', icon: Truck },
    { to: 'CANCELLED', label: 'Cancelar pedido', icon: XCircle, destructive: true },
  ],
  DELIVERY: [{ to: 'DELIVERED', label: 'Confirmar entrega', icon: PackageCheck }],
};

const SUCCESS = {
  DELIVERY: { title: 'Pedido despachado', message: 'o paciente foi avisado de que a fórmula saiu para entrega.' },
  DELIVERED: { title: 'Entrega confirmada', message: 'o pedido foi concluído e o paciente já pode avaliar.' },
  CANCELLED: { title: 'Pedido cancelado', message: 'o paciente foi avisado do cancelamento.' },
};

const EMPTY = {
  production: { icon: FlaskConical, title: 'Nada em manipulação', description: 'Quando um paciente aprovar sua cotação, o pedido aparece aqui.' },
  delivery: { icon: Truck, title: 'Nenhum pedido a caminho', description: 'Os pedidos despachados aparecem aqui até a confirmação da entrega.' },
  done: { icon: PackageCheck, title: 'Nenhum pedido concluído ainda', description: 'Pedidos entregues e cancelados ficam registrados nesta aba.' },
};

function TransitionButtons({ order, pendingStatus, onTransition, size = 'sm' }) {
  const options = TRANSITIONS[order.status] || [];
  return options.map((t) => {
    const busy = pendingStatus === t.to;
    return (
      <Button
        key={t.to}
        size={size}
        variant={t.destructive ? 'destructive' : 'default'}
        disabled={!!pendingStatus}
        onClick={() => onTransition(order, t.to)}
      >
        {busy ? <Spinner /> : <t.icon aria-hidden="true" />} {t.label}
      </Button>
    );
  });
}

function OrderCard({ order, pendingStatus, onTransition, onOpen }) {
  const patient = orderPatient(order);
  const name = firstName(patient?.name) || 'Paciente';
  const deadline = orderDeadline(order);
  const finishedAt = (order.history || []).find((h) => h.toStatus === order.status && order.status !== 'PRODUCTION')?.createdAt;
  const done = order.status === 'DELIVERED' || order.status === 'CANCELLED';

  return (
    <article
      aria-labelledby={`order-${order.id}`}
      className={cn(
        'rounded-2xl border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)] transition-shadow hover:shadow-[0_6px_20px_hsl(190_30%_12%/0.06)]',
        deadline?.overdue ? 'border-[color-mix(in_oklab,var(--coral)_40%,var(--border))]' : 'border-border'
      )}
    >
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4 lg:flex-nowrap lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3 lg:w-64 lg:flex-none">
          <Avatar className="size-10">
            <AvatarFallback className="bg-accent text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 id={`order-${order.id}`} className="truncate font-heading text-[0.9375rem] font-medium text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">
              <span className="num">#{shortId(order.id)}</span> · aprovado {formatRelative(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="lg:order-last lg:w-40 lg:text-right">
          <StatusBadge kind="order" status={order.status} />
        </div>
        <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:w-auto lg:flex-1">
          <div>
            <dt className="text-xs text-muted-foreground">Valor</dt>
            <dd className="num text-base text-foreground">{orderPriceLabel(order)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Prazo</dt>
            <dd className="text-sm font-medium text-foreground">{deliveryDaysLabel(order.quote?.deliveryDays)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-muted-foreground">{done ? (order.status === 'CANCELLED' ? 'Cancelado em' : 'Entregue em') : 'Previsão'}</dt>
            <dd className={cn('flex items-center gap-1.5 text-sm font-medium', deadline?.overdue ? 'text-[hsl(4_62%_42%)]' : 'text-foreground')}>
              {done ? (
                formatDate(finishedAt || order.updatedAt)
              ) : deadline ? (
                <>
                  {deadline.overdue ? <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" /> : <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  até {formatDate(deadline.date, { weekday: 'short', day: '2-digit', month: 'short' })}
                  {deadline.overdue && <span className="sr-only"> (prazo vencido)</span>}
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <TransitionButtons order={order} pendingStatus={pendingStatus} onTransition={onTransition} />
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onOpen(order)} aria-label={`Ver detalhes do pedido ${shortId(order.id)}`}>
          Detalhes <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

/** Gestão de pedidos da farmácia (/pharmacy/orders) */
export default function OrderManagement() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'production';
  const setTab = (value) => setParams((p) => {
    const next = new URLSearchParams(p);
    next.set('tab', value);
    return next;
  }, { replace: true });
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [pending, setPending] = useState({});

  const { data: rawOrders, isLoading, isError, refetch } = useQuery({
    queryKey: ['pharmacyOrders'],
    queryFn: pharmacyApi.orders,
  });
  const orders = useMemo(() => (Array.isArray(rawOrders) ? rawOrders : []), [rawOrders]);

  const mutation = useMutation({
    mutationFn: ({ order, status }) => pharmacyApi.updateOrderStatus(order.id, status),
    onMutate: async ({ order, status }) => {
      setPending((p) => ({ ...p, [order.id]: status }));
      await queryClient.cancelQueries({ queryKey: ['pharmacyOrders'] });
      const previous = queryClient.getQueryData(['pharmacyOrders']);
      const now = new Date().toISOString();
      queryClient.setQueryData(['pharmacyOrders'], (old) =>
        Array.isArray(old)
          ? old.map((o) =>
              o.id === order.id
                ? { ...o, status, updatedAt: now, history: [{ fromStatus: o.status, toStatus: status, createdAt: now }, ...(o.history || [])] }
                : o
            )
          : old
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['pharmacyOrders'], ctx.previous);
      toast.error(serverMessage(err, 'Não foi possível atualizar o status do pedido. Tente novamente.'), 'Status não alterado');
    },
    onSuccess: (_data, { order, status }) => {
      const s = SUCCESS[status];
      const target = TAB_OF[status];
      toast.show({
        type: 'success',
        title: s?.title || 'Pedido atualizado',
        message: `Pedido #${shortId(order.id)}: ${s?.message || 'status atualizado.'}`,
        action: target && target !== tab ? { label: 'Ver aba', onClick: () => setTab(target) } : undefined,
      });
      setCancelTarget(null);
    },
    onSettled: (_d, _e, { order }) => {
      setPending((p) => {
        const next = { ...p };
        delete next[order.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
    },
  });

  const handleTransition = (order, status) => {
    if (status === 'CANCELLED') {
      setCancelTarget(order);
      return;
    }
    mutation.mutate({ order, status });
  };

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.value, orders.filter((o) => t.statuses.includes(o.status)).length])),
    [orders]
  );

  const list = useMemo(() => {
    const current = TABS.find((t) => t.value === tab);
    const term = search.trim().toLowerCase().replace(/^#/, '');
    return orders
      .filter((o) => current.statuses.includes(o.status))
      .filter((o) => !term || o.id.toLowerCase().includes(term) || (orderPatient(o)?.name || '').toLowerCase().includes(term))
      .sort((a, b) => {
        if (tab === 'done') return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        const da = orderDeadline(a)?.date?.getTime() ?? Infinity;
        const db = orderDeadline(b)?.date?.getTime() ?? Infinity;
        return da - db;
      });
  }, [orders, tab, search]);

  const overdue = orders.filter((o) => orderDeadline(o)?.overdue).length;
  const selected = orders.find((o) => o.id === selectedId) || null;

  let content;
  if (isLoading) content = <LoadingState variant="list" rows={4} message="Carregando pedidos…" />;
  else if (isError) {
    content = (
      <ErrorState
        title="Erro ao carregar os pedidos"
        message="Não foi possível buscar os pedidos da farmácia. Verifique sua conexão e tente novamente."
        onRetry={refetch}
      />
    );
  } else if (list.length === 0) {
    const e = search ? { icon: Package, title: 'Nenhum pedido encontrado', description: 'Confira o código ou o nome digitado.' } : EMPTY[tab];
    content = <EmptyState icon={e.icon} title={e.title} description={e.description} />;
  } else {
    content = (
      <ul className="grid gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((order, i) => (
            <motion.li
              key={order.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: Math.min(i, 8) * 0.04, ease: EASE_OUT } }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
              className="min-w-0"
            >
              <OrderCard order={order} pendingStatus={pending[order.id]} onTransition={handleTransition} onOpen={(o) => setSelectedId(o.id)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Pedidos"
        description="Acompanhe a manipulação, despache para entrega e confirme o recebimento. O paciente é avisado a cada mudança."
      />

      {overdue > 0 && !isLoading && !isError && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
          <span>
            <span className="num">{overdue}</span> {overdue === 1 ? 'pedido passou' : 'pedidos passaram'} do prazo prometido. Priorize-os ou fale com o paciente.
          </span>
        </p>
      )}

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto sm:w-fit">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label} <span className="num text-xs text-muted-foreground">({counts[t.value] ?? 0})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchField value={search} onChange={setSearch} placeholder="Buscar por código ou paciente" label="Buscar pedido" />
      </div>

      {content}

      <OrderDetailSheet
        summary={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
        actions={
          selected && TRANSITIONS[selected.status] ? (
            <TransitionButtons order={selected} pendingStatus={pending[selected.id]} onTransition={handleTransition} size="default" />
          ) : null
        }
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && !mutation.isPending && setCancelTarget(null)}
        title="Cancelar este pedido?"
        description={cancelTarget ? `Pedido #${shortId(cancelTarget.id)} · ${firstName(orderPatient(cancelTarget)?.name) || 'Paciente'}` : undefined}
        confirmLabel="Cancelar pedido"
        cancelLabel="Manter pedido"
        destructive
        loading={!!(cancelTarget && pending[cancelTarget.id])}
        onConfirm={() => cancelTarget && mutation.mutate({ order: cancelTarget, status: 'CANCELLED' })}
      >
        <div className="flex gap-3 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash p-4 text-sm leading-relaxed text-foreground">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden="true" />
          <p>
            O cancelamento <strong className="font-semibold">não pode ser desfeito</strong>: o pedido sai da fila de manipulação e o paciente é avisado. Use apenas quando não for possível manipular a fórmula e, se puder, combine antes com o paciente.
          </p>
        </div>
      </ConfirmDialog>
    </>
  );
}
