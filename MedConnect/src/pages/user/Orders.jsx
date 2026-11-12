import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FileUp, Package, PackageCheck, SearchX, Star, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import SearchField from '@/components/shared/SearchField';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Stagger, StaggerItem } from '@/components/motion';
import { patientApi } from '@/services/endpoints';
import { formatDate } from '@/lib/format';
import OrderProgress from './components/OrderProgress';
import { asArray, canReview, formatQuotePrice, isOrderActive, isOrderDone, shortId } from './components/patient-utils';

function OrderRow({ order }) {
  const pharmacy = order.quote?.pharmacy?.name || 'Farmácia credenciada';
  const active = isOrderActive(order);
  const reviewable = canReview(order);
  return (
    <div className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-6 md:px-5">
      <div className="col-span-2 flex min-w-0 items-start gap-3 md:col-span-1">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <Store className="size-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <Link
            to={`/order/${order.id}`}
            className="block truncate font-medium text-foreground after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {pharmacy}
          </Link>
          <p className="text-xs text-muted-foreground">
            Pedido <span className="num">{shortId(order.id)}</span> · {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:block">
        <span className="text-xs text-muted-foreground md:hidden">Valor</span>
        <span className="num text-[0.9375rem] text-foreground">{formatQuotePrice(order.quote)}</span>
      </div>

      <div className="min-w-0">
        {active ? (
          <div className="space-y-2">
            <StatusBadge kind="order" status={order.status} />
            <OrderProgress status={order.status} showLabels={false} className="max-w-[220px]" />
          </div>
        ) : (
          <StatusBadge kind="order" status={order.status} />
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {reviewable && (
          <Button asChild size="sm" variant="outline" className="relative z-10">
            <Link to={`/review/${order.id}`} aria-label={`Avaliar pedido ${shortId(order.id)} de ${pharmacy}`}>
              <Star aria-hidden="true" /> Avaliar
            </Link>
          </Button>
        )}
        <ChevronRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 md:block" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Meus pedidos: em andamento × concluídos */
export default function Orders() {
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['myOrders'], queryFn: patientApi.orders });

  const orders = asArray(data);
  const active = orders.filter(isOrderActive);
  const done = orders.filter(isOrderDone);

  const list = useMemo(() => {
    const base = tab === 'active' ? orders.filter(isOrderActive) : orders.filter(isOrderDone);
    const term = search.trim().toLowerCase().replace(/^#/, '');
    if (!term) return base;
    return base.filter(
      (o) => String(o.id).toLowerCase().includes(term) || (o.quote?.pharmacy?.name || '').toLowerCase().includes(term)
    );
  }, [orders, tab, search]);

  return (
    <>
      <PageHeader
        eyebrow="Minha saúde"
        title="Meus pedidos"
        description="Acompanhe a manipulação e a entrega das suas fórmulas. Pedidos entregues podem ser avaliados."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Filtrar pedidos">
            <TabsTrigger value="active" className="px-3">
              Em andamento{!isLoading && !isError && <span className="num ml-1 text-muted-foreground">({active.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="done" className="px-3">
              Concluídos{!isLoading && !isError && <span className="num ml-1 text-muted-foreground">({done.length})</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {orders.length > 0 && (
          <SearchField value={search} onChange={setSearch} placeholder="Buscar por farmácia ou número" label="Buscar pedidos" />
        )}
      </div>

      {isLoading ? (
        <LoadingState variant="list" rows={4} message="Carregando seus pedidos…" />
      ) : isError ? (
        <ErrorState
          title="Erro ao carregar pedidos"
          message="Não foi possível buscar seus pedidos agora. Verifique sua conexão e tente novamente."
          onRetry={refetch}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Você ainda não tem pedidos"
          description="Envie uma receita, compare as cotações e aprove a que preferir. O pedido aparece aqui."
          action={
            <Button asChild>
              <Link to="/new-quote"><FileUp aria-hidden="true" /> Enviar receita</Link>
            </Button>
          }
        />
      ) : list.length === 0 ? (
        search ? (
          <EmptyState icon={SearchX} title="Nenhum pedido encontrado" description="Confira o nome da farmácia ou o número do pedido." />
        ) : tab === 'active' ? (
          <EmptyState
            icon={Package}
            title="Nenhum pedido em andamento"
            description="Quando você aprovar uma cotação, o pedido aparece aqui com cada etapa da manipulação."
            action={<Button asChild variant="outline"><Link to="/quote-offers">Ver cotações recebidas</Link></Button>}
          />
        ) : (
          <EmptyState icon={PackageCheck} title="Nenhum pedido concluído ainda" description="Pedidos entregues ou cancelados ficam guardados aqui." />
        )
      ) : (
        <>
          <div className="mb-2 hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-6 px-5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground md:grid" aria-hidden="true">
            <span>Farmácia e pedido</span>
            <span>Valor</span>
            <span>Situação</span>
            <span className="w-16" />
          </div>
          <Stagger key={tab} as="ul" step={0.04} inView={false} className="space-y-3" aria-label={tab === 'active' ? 'Pedidos em andamento' : 'Pedidos concluídos'}>
            {list.map((o) => (
              <StaggerItem as="li" key={o.id} y={10}>
                <OrderRow order={o} />
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </>
  );
}
