import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, Ban, BadgeCheck, Building2, CheckCircle2, FileCheck2, FileText, HandCoins, LifeBuoy, Package, RefreshCw, Users, Wallet,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Stagger, StaggerItem } from '@/components/motion';
import { adminApi } from '@/services/endpoints';
import { formatCents, formatNumber, formatRelative } from '@/lib/format';
import { DailyActivityChart, ConversionFunnel } from './components/OverviewCharts';

const n = (v) => formatNumber(v ?? 0);

/** /admin — visão geral da operação (somente contagens: nenhum dado pessoal no agregado) */
export default function Overview() {
  const overview = useQuery({ queryKey: ['adminOverview'], queryFn: adminApi.overview, staleTime: 60_000 });
  const o = overview.data;

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Visão geral"
        description="Panorama da operação: contas, credenciamento de farmácias, receitas, pedidos e atendimento."
        actions={
          o && (
            <Button variant="outline" onClick={() => overview.refetch()} disabled={overview.isFetching}>
              <RefreshCw className={cn(overview.isFetching && 'animate-spin')} aria-hidden="true" /> Atualizar
            </Button>
          )
        }
      >
        {overview.dataUpdatedAt > 0 && <p className="text-xs text-muted-foreground">Atualizado {formatRelative(overview.dataUpdatedAt)}</p>}
      </PageHeader>

      {overview.isLoading ? (
        <div className="space-y-6">
          <LoadingState variant="cards" rows={4} message="Montando a visão geral..." />
          <LoadingState variant="cards" rows={4} />
        </div>
      ) : overview.isError && !o ? (
        <ErrorState title="Não foi possível carregar a visão geral" onRetry={overview.refetch} />
      ) : (
        o && <OverviewContent o={o} busy={overview.isFetching && !overview.isLoading} />
      )}
    </>
  );
}

function KpiSection({ id, title, children }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 font-heading text-[0.9375rem] font-semibold text-muted-foreground">{title}</h2>
      <Stagger step={0.06} inView={false} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </Stagger>
    </section>
  );
}

const Kpi = (props) => (
  <StaggerItem y={12} className="h-full">
    <StatCard className="h-full" {...props} />
  </StaggerItem>
);

function HintLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
      {children} <ArrowRight className="size-3" aria-hidden="true" />
    </Link>
  );
}

function OverviewContent({ o, busy }) {
  const pending = o.pharmacies?.pending || 0;
  const open = o.support?.open || 0;
  const inProgress = o.support?.inProgress || 0;
  const suspendedTotal = (o.users?.suspended || 0) + (o.pharmacies?.suspended || 0);
  const series = Array.isArray(o.series) ? o.series : [];
  const funnel = [
    { key: 'rx', label: 'Receitas enviadas', value: o.prescriptions?.total || 0 },
    // Receitas que receberam ao menos uma cotação: status "cotações recebidas" ou "cotação aprovada"
    { key: 'quoted', label: 'Receitas cotadas', value: (o.prescriptions?.quoted || 0) + (o.prescriptions?.accepted || 0) },
    { key: 'orders', label: 'Pedidos criados', value: o.orders?.total || 0 },
    { key: 'delivered', label: 'Pedidos entregues', value: o.orders?.delivered || 0 },
  ];

  return (
    <div className={cn('space-y-8 transition-opacity duration-200', busy && 'opacity-80')}>
      <KpiSection id="kpi-accounts" title="Contas e credenciamento">
        <Kpi icon={Users} label="Pacientes" value={o.users?.patients ?? 0} hint={`${n(o.users?.newLast30d)} novos pacientes nos últimos 30 dias`} />
        <Kpi
          icon={BadgeCheck}
          label="Farmácias credenciadas"
          value={o.pharmacies?.verified ?? 0}
          hint={`${n(o.pharmacies?.total)} cadastradas · ${n(o.pharmacies?.rejected)} recusadas`}
        />
        <Kpi
          icon={Building2}
          label="Aguardando verificação"
          value={pending}
          tone={pending > 0 ? 'coral' : 'neutral'}
          className={pending > 0 ? 'border-[color-mix(in_oklab,var(--coral)_45%,var(--border))] bg-coral-wash/40' : undefined}
          hint={pending > 0 ? <HintLink to="/admin/pharmacies?tab=pending">Analisar documentação</HintLink> : 'Nenhuma farmácia na fila'}
        />
        <Kpi
          icon={Ban}
          label="Contas suspensas"
          value={suspendedTotal}
          tone="neutral"
          hint={`${n(o.users?.suspended)} de usuários · ${n(o.pharmacies?.suspended)} de farmácias`}
        />
      </KpiSection>

      <KpiSection id="kpi-operation" title="Operação">
        <Kpi icon={FileText} label="Receitas" value={o.prescriptions?.total ?? 0} hint={`${n(o.prescriptions?.pending)} aguardando cotação`} />
        <Kpi icon={HandCoins} label="Cotações" value={o.quotes?.total ?? 0} tone="info" hint={`${n(o.quotes?.accepted)} aceitas · ${n(o.quotes?.pending)} em aberto`} />
        <Kpi icon={Package} label="Pedidos" value={o.orders?.total ?? 0} hint={`${n(o.orders?.production)} em manipulação · ${n(o.orders?.delivery)} em entrega`} />
        <Kpi icon={Wallet} label="Valor entregue (GMV)" display={formatCents(o.orders?.gmvDeliveredCents ?? 0)} hint={`${n(o.orders?.delivered)} pedidos entregues`} />
      </KpiSection>

      <KpiSection id="kpi-compliance" title="Atendimento e privacidade">
        <Kpi
          icon={LifeBuoy}
          label="Chamados abertos"
          value={open}
          tone={open > 0 ? 'amber' : 'neutral'}
          hint={open > 0 ? <HintLink to="/admin/support?status=OPEN">Responder chamados</HintLink> : `${n(inProgress)} em atendimento`}
        />
        <Kpi icon={LifeBuoy} label="Em atendimento" value={inProgress} tone="info" hint={inProgress > 0 ? <HintLink to="/admin/support?status=IN_PROGRESS">Acompanhar</HintLink> : 'Nenhum chamado em andamento'} />
        <Kpi icon={FileCheck2} label="Consentimentos ativos" value={o.consents?.active ?? 0} hint={`${n(o.consents?.revoked)} revogados pelos titulares`} />
        <Kpi icon={Users} label="Administradores" value={o.users?.admins ?? 0} tone="neutral" hint="Contas com acesso à gestão" />
      </KpiSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="chart-daily" className="min-w-0 rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 id="chart-daily" className="font-heading text-lg font-semibold text-foreground">Receitas e pedidos por dia</h2>
          <p className="mb-4 mt-0.5 text-sm text-muted-foreground">Últimos {series.length || 14} dias, no horário de Brasília.</p>
          <DailyActivityChart series={series} busy={busy} />
        </section>

        <section aria-labelledby="funnel" className="min-w-0 rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 id="funnel" className="font-heading text-lg font-semibold text-foreground">Funil de conversão</h2>
          <p className="mb-5 mt-0.5 text-sm text-muted-foreground">Desde o início da operação.</p>
          <ConversionFunnel stages={funnel} />
        </section>
      </div>

      <AttentionList pending={pending} open={open} />
    </div>
  );
}

/** "Requer atenção": fila de credenciamento e chamados abertos, com atalho para cada item */
function AttentionList({ pending, open }) {
  const pharmacies = useQuery({ queryKey: ['adminPendingPharmacies'], queryFn: adminApi.pendingPharmacies, enabled: pending > 0 });
  const tickets = useQuery({
    queryKey: ['adminSupportTickets', { status: 'OPEN', page: 1, limit: 4 }],
    queryFn: () => adminApi.supportTickets({ status: 'OPEN', page: 1, limit: 4 }),
    enabled: open > 0,
  });
  const pendingList = (Array.isArray(pharmacies.data) ? pharmacies.data : []).slice(0, 4);
  const ticketList = tickets.data?.data || [];
  const nothing = pending === 0 && open === 0;

  return (
    <section aria-labelledby="attention" className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <h2 id="attention" className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
        {nothing ? <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> : <AlertTriangle className="size-5 text-coral" aria-hidden="true" />}
        Requer atenção
      </h2>
      {nothing ? (
        <p className="mt-2 text-sm text-muted-foreground">Tudo em dia: nenhuma farmácia aguardando verificação e nenhum chamado aberto.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {pending > 0 && (
            <AttentionGroup
              title={`${n(pending)} ${pending === 1 ? 'farmácia aguardando' : 'farmácias aguardando'} verificação`}
              to="/admin/pharmacies?tab=pending"
              linkLabel="Abrir fila de credenciamento"
              loading={pharmacies.isLoading}
              items={pendingList.map((p) => ({ id: p.id, to: '/admin/pharmacies?tab=pending', title: p.name, meta: `cadastro ${formatRelative(p.createdAt)}` }))}
            />
          )}
          {open > 0 && (
            <AttentionGroup
              title={`${n(open)} ${open === 1 ? 'chamado aberto' : 'chamados abertos'}`}
              to="/admin/support?status=OPEN"
              linkLabel="Ver todos os chamados abertos"
              loading={tickets.isLoading}
              items={ticketList.map((t) => ({ id: t.id, to: `/admin/support?status=OPEN&id=${t.id}`, title: t.subject, meta: `${t.protocol} · ${formatRelative(t.createdAt)}` }))}
            />
          )}
        </div>
      )}
    </section>
  );
}

function AttentionGroup({ title, to, linkLabel, items, loading }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline" aria-label={linkLabel}>
          Ver todos <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
      {loading ? (
        <LoadingState variant="list" rows={2} className="[&_[data-slot=skeleton]]:h-12" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.to}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-mint-wash/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
