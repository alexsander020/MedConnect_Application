import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, Send, Percent, Truck, Wallet, Star, ArrowRight, FileText, FlaskConical, ShieldAlert, PackageCheck,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import ErrorState from '@/components/ErrorState';
import { FadeUp, Stagger, StaggerItem } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { pharmacyApi } from '@/services/endpoints';
import { formatCents, formatDate, formatRelative, firstName } from '@/lib/format';
import { VerificationBanner } from './components/VerificationNotice';
import HoursSummaryCard from './components/HoursSummaryCard';
import { isRecent, orderDeadline, orderPatient, orderPriceLabel, patientAlias, shortId } from './components/utils';

const hasMyQuote = (p) => Array.isArray(p?.quotes) && p.quotes.length > 0;

function KpiLink({ to, children }) {
  if (!to) return children;
  return (
    <Link
      to={to}
      className="block h-full rounded-2xl transition-shadow hover:shadow-[0_6px_20px_hsl(190_30%_12%/0.07)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}

function KpiRow({ stats, pendingRequests, verified }) {
  if (stats.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-2xl" />)}
        <span className="sr-only">Carregando indicadores…</span>
      </div>
    );
  }
  if (stats.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar os indicadores"
        message="Os números da farmácia estão indisponíveis agora. As demais seções continuam funcionando."
        onRetry={stats.refetch}
        className="py-8"
      />
    );
  }
  const s = stats.data || {};
  const total = s.totalQuotes ?? 0;
  const acceptance = total > 0 ? Math.round(((s.acceptedQuotes ?? 0) / total) * 100) : null;
  const hasReviews = (s.reviewsCount ?? 0) > 0;

  const items = [
    {
      key: 'requests', to: '/pharmacy/requests', icon: Inbox, label: 'Solicitações pendentes',
      value: verified ? pendingRequests : undefined,
      display: verified ? undefined : '—',
      hint: verified ? 'Receitas aguardando a sua proposta' : 'Disponível após o credenciamento',
    },
    {
      key: 'quotes', icon: Send, tone: 'info', label: 'Cotações enviadas', value: total,
      hint: `${s.pendingQuotes ?? 0} aguardando decisão do paciente`,
    },
    {
      key: 'acceptance', icon: Percent, label: 'Taxa de aceite',
      value: acceptance ?? undefined, display: acceptance === null ? '—' : undefined, suffix: acceptance === null ? undefined : '%',
      hint: acceptance === null ? 'Aparece depois da primeira cotação' : `${s.acceptedQuotes ?? 0} de ${total} propostas aceitas`,
    },
    {
      key: 'orders', to: '/pharmacy/orders', icon: Truck, tone: 'amber', label: 'Em produção / entrega',
      value: s.inProgressOrders ?? 0,
      hint: `${s.productionOrders ?? 0} em manipulação · ${s.deliveryOrders ?? 0} em entrega`,
    },
    {
      key: 'revenue', icon: Wallet, label: 'Faturamento entregue', display: formatCents(s.totalRevenueCents ?? 0),
      hint: `${s.deliveredOrders ?? 0} ${s.deliveredOrders === 1 ? 'pedido entregue' : 'pedidos entregues'}`,
    },
    {
      key: 'rating', to: '/pharmacy/reviews', icon: Star, tone: 'amber', label: 'Nota média',
      value: hasReviews ? Number(s.averageRating) : undefined, display: hasReviews ? undefined : '—',
      decimals: 1, suffix: hasReviews ? 'de 5' : undefined,
      hint: hasReviews ? `${s.reviewsCount} ${s.reviewsCount === 1 ? 'avaliação' : 'avaliações'}` : 'Sem avaliações ainda',
    },
  ];

  return (
    <Stagger step={0.06} inView={false} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ key, to, ...card }) => (
        <StaggerItem key={key} y={12} className="min-w-0">
          <KpiLink to={to}>
            <StatCard {...card} className="h-full" />
          </KpiLink>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function SectionCard({ title, description, action, children, className }) {
  return (
    <Card className={cn('rounded-2xl', className)}>
      <CardHeader>
        <CardTitle className="text-[1.0625rem]">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  );
}

function Muted({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-mint-wash/50 px-4 py-5 text-sm text-muted-foreground">
      {Icon && <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />}
      {children}
    </p>
  );
}

function NewRequests({ query, verification, checking }) {
  const latest = (query.data || []).filter((p) => !hasMyQuote(p)).slice(0, 5);
  let body;
  if (verification && verification !== 'VERIFIED') {
    body = <Muted icon={ShieldAlert}>O mural de receitas é liberado quando o credenciamento for aprovado.</Muted>;
  } else if (!verification) {
    body = checking ? <ListSkeleton /> : <Muted icon={Inbox}>Não foi possível consultar o mural agora. Abra a página de solicitações para tentar de novo.</Muted>;
  } else if (query.isLoading) {
    body = <ListSkeleton />;
  } else if (query.isError) {
    body = <ErrorState title="Erro ao carregar solicitações" message="Tente novamente em instantes." onRetry={query.refetch} className="py-8" />;
  } else if (latest.length === 0) {
    body = <Muted icon={Inbox}>Nenhuma receita aguardando a sua cotação agora. Avisaremos quando chegar uma nova.</Muted>;
  } else {
    body = (
      <Stagger as="ul" step={0.04} inView={false} className="-my-1 divide-y divide-border">
        {latest.map((p) => (
          <StaggerItem as="li" key={p.id} y={8} className="flex items-center gap-3 py-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <FileText className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                <span className="truncate">{patientAlias(p)}</span>
                {isRecent(p.createdAt) && <StatusBadge tone="primary" dot={false} className="h-5 px-2 text-[0.6875rem] tracking-wide">NOVA</StatusBadge>}
              </p>
              <p className="text-xs text-muted-foreground">
                Receita <span className="num">#{shortId(p.id)}</span> · enviada {formatRelative(p.createdAt)}
              </p>
            </div>
            <Button asChild size="sm">
              <Link to={`/pharmacy/send-quote/${p.id}`} aria-label={`Enviar cotação para a receita ${shortId(p.id)}`}>
                Cotar
              </Link>
            </Button>
          </StaggerItem>
        ))}
      </Stagger>
    );
  }
  return (
    <SectionCard
      title="Novas solicitações"
      description="As receitas mais recentes que ainda não receberam proposta sua."
      action={
        <Button asChild variant="ghost" size="sm">
          <Link to="/pharmacy/requests">Ver todas <ArrowRight aria-hidden="true" /></Link>
        </Button>
      }
    >
      {body}
    </SectionCard>
  );
}

function OrdersNeedingAction({ query }) {
  const active = (query.data || [])
    .filter((o) => o.status === 'PRODUCTION' || o.status === 'DELIVERY')
    .map((o) => ({ order: o, deadline: orderDeadline(o) }))
    .sort((a, b) => (a.deadline?.date?.getTime() ?? Infinity) - (b.deadline?.date?.getTime() ?? Infinity))
    .slice(0, 5);

  let body;
  if (query.isLoading) body = <ListSkeleton />;
  else if (query.isError) body = <ErrorState title="Erro ao carregar os pedidos" message="Tente novamente em instantes." onRetry={query.refetch} className="py-8" />;
  else if (active.length === 0) body = <Muted icon={PackageCheck}>Nenhum pedido em manipulação ou entrega no momento.</Muted>;
  else {
    body = (
      <Stagger as="ul" step={0.04} inView={false} className="-my-1 divide-y divide-border">
        {active.map(({ order, deadline }) => {
          const Icon = order.status === 'DELIVERY' ? Truck : FlaskConical;
          const name = firstName(orderPatient(order)?.name) || 'Paciente';
          return (
            <StaggerItem as="li" key={order.id} y={8} className="flex items-center gap-3 py-3">
              <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full', order.status === 'DELIVERY' ? 'bg-info-wash text-info' : 'bg-amber-wash text-amber')}>
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  <span className="truncate">{name}</span>
                  <span className="num text-xs font-normal text-muted-foreground">#{shortId(order.id)}</span>
                </p>
                <p className={cn('text-xs', deadline?.overdue ? 'font-medium text-[hsl(4_62%_42%)]' : 'text-muted-foreground')}>
                  {deadline
                    ? deadline.overdue
                      ? `Prazo vencido em ${formatDate(deadline.date, { day: '2-digit', month: 'short' })}`
                      : `Previsão: até ${formatDate(deadline.date, { weekday: 'short', day: '2-digit', month: 'short' })}`
                    : 'Prazo não informado'}
                  {' · '}<span className="num">{orderPriceLabel(order)}</span>
                </p>
              </div>
              <StatusBadge kind="order" status={order.status} className="hidden sm:inline-flex" />
            </StaggerItem>
          );
        })}
      </Stagger>
    );
  }
  return (
    <SectionCard
      title="Pedidos que precisam de ação"
      description="Em manipulação ou a caminho, ordenados pelo prazo prometido ao paciente."
      action={
        <Button asChild variant="ghost" size="sm">
          <Link to="/pharmacy/orders">Gerenciar <ArrowRight aria-hidden="true" /></Link>
        </Button>
      }
    >
      {body}
    </SectionCard>
  );
}

/** Visão geral da farmácia (/pharmacy) */
export default function PharmacyDashboard() {
  const { currentUser } = useAuth();
  const me = useQuery({ queryKey: ['pharmacyMe'], queryFn: pharmacyApi.me, staleTime: 5 * 60_000 });
  const stats = useQuery({ queryKey: ['pharmacyStats'], queryFn: pharmacyApi.stats });
  const verification = me.data?.verificationStatus || stats.data?.verificationStatus;
  const verified = verification === 'VERIFIED';
  const prescriptions = useQuery({
    queryKey: ['availablePrescriptions'],
    queryFn: pharmacyApi.availablePrescriptions,
    enabled: verified,
  });
  const orders = useQuery({ queryKey: ['pharmacyOrders'], queryFn: pharmacyApi.orders });

  const pendingRequests = prescriptions.data ? prescriptions.data.filter((p) => !hasMyQuote(p)).length : undefined;
  const name = me.data?.name || currentUser?.name;

  return (
    <>
      <PageHeader
        eyebrow="Painel da farmácia"
        title={name ? `Olá, ${name}` : 'Visão geral'}
        description="Solicitações de pacientes, pedidos em andamento e a reputação da sua farmácia em um só lugar."
        actions={
          <Button asChild>
            <Link to="/pharmacy/requests"><Inbox aria-hidden="true" /> Ver solicitações</Link>
          </Button>
        }
      >
        {verification && <StatusBadge kind="verification" status={verification} className="mt-1" />}
      </PageHeader>

      <VerificationBanner status={verification} rejectionReason={me.data?.rejectionReason} />

      <section aria-label="Indicadores" className="mb-6">
        <KpiRow stats={stats} pendingRequests={pendingRequests} verified={verified} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <FadeUp duration={0.45} y={12} delay={0.1} className="min-w-0 space-y-6">
          <NewRequests query={prescriptions} verification={verification} checking={me.isLoading || stats.isLoading} />
          <OrdersNeedingAction query={orders} />
        </FadeUp>
        <FadeUp duration={0.45} y={12} delay={0.16} className="min-w-0">
          <HoursSummaryCard pharmacy={me.data} loading={me.isLoading} className="lg:sticky lg:top-24" />
        </FadeUp>
      </div>
    </>
  );
}
