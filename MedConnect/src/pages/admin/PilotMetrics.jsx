import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, Building2, CheckCircle2, CircleDashed, Clock, FileText, PackageCheck, RefreshCw, ShieldCheck, TrendingUp, TriangleAlert, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { EASE_OUT, Stagger, StaggerItem } from '@/components/motion';
import { adminApi } from '@/services/endpoints';
import { formatCents, formatDateTime, formatRelative } from '@/lib/format';
import AdminTable from './components/AdminTable';
import { Num } from './components/cells';
import { PILOT_EVENTS } from './components/labels';

const dec1 = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/**
 * Indicadores de validação do piloto com meta. `hasData` evita marcar "dentro da meta" quando
 * o valor é 0 por falta de base (ex.: TTFQ 0 min sem nenhuma receita cotada).
 */
function buildIndicators(m, t) {
  const quoted = m.quotedPrescriptions > 0;
  return [
    {
      key: 'ttfq',
      icon: Clock,
      label: 'Tempo até a 1ª cotação',
      help: 'Média entre o envio da receita e a primeira cotação recebida.',
      value: m.avgTtfqMinutes,
      display: `${dec1(m.avgTtfqMinutes)} min`,
      target: t.ttfqMinutesMax,
      targetLabel: `Meta: até ${dec1(t.ttfqMinutesMax)} min`,
      better: 'lower',
      hasData: quoted,
    },
    {
      key: 'qpp',
      icon: Zap,
      label: 'Cotações por receita',
      help: 'Quantas farmácias, em média, respondem a cada receita enviada.',
      value: m.quotesPerPrescription,
      display: dec1(m.quotesPerPrescription),
      target: t.quotesPerPrescriptionMin,
      targetLabel: `Meta: pelo menos ${dec1(t.quotesPerPrescriptionMin)}`,
      better: 'higher',
      hasData: m.totalPrescriptions > 0,
    },
    {
      key: 'acceptance',
      icon: TrendingUp,
      label: 'Taxa de aceitação',
      help: 'Cotações aceitas sobre receitas que receberam ao menos uma cotação.',
      value: m.acceptanceRate,
      display: `${dec1(m.acceptanceRate)}%`,
      target: t.acceptanceRateMin,
      targetLabel: `Meta: pelo menos ${dec1(t.acceptanceRateMin)}%`,
      better: 'higher',
      hasData: quoted,
    },
    {
      key: 'leakage',
      icon: ShieldCheck,
      label: 'Vazamento estimado',
      help: 'Receitas cotadas que foram canceladas sem fechar pedido na plataforma.',
      value: m.leakageEstimatePercent,
      display: `${dec1(m.leakageEstimatePercent)}%`,
      target: t.leakageMax,
      targetLabel: `Limite: até ${dec1(t.leakageMax)}%`,
      better: 'lower',
      hasData: quoted,
    },
  ].map((ind) => ({
    ...ind,
    pass: ind.better === 'lower' ? ind.value <= ind.target : ind.value >= ind.target,
  }));
}

/** /admin/metrics — validação do piloto (telemetria agregada, sem dados pessoais) */
export default function PilotMetrics() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['adminPilotMetrics'],
    queryFn: adminApi.pilotMetrics,
  });

  const m = data?.metrics;
  const t = data?.targets;
  const indicators = m && t ? buildIndicators(m, t) : [];
  const evaluated = indicators.filter((i) => i.hasData);
  const passing = evaluated.filter((i) => i.pass).length;
  const events = data?.anonymizedEvents || [];

  return (
    <>
      <PageHeader
        eyebrow="Conformidade"
        title="Métricas do piloto"
        description="Indicadores de validação do piloto comparados às metas. Telemetria agregada e anonimizada: nenhum dado pessoal de paciente ou de receita sai do servidor."
        actions={
          data && (
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn(isFetching && 'animate-spin')} aria-hidden="true" /> Atualizar
            </Button>
          )
        }
      />

      {isLoading ? (
        <LoadingState variant="cards" rows={4} message="Calculando métricas do piloto..." />
      ) : isError ? (
        <ErrorState title="Não foi possível carregar as métricas do piloto" onRetry={refetch} />
      ) : !m || !t ? (
        <EmptyState icon={BarChart3} title="Métricas indisponíveis" description="O servidor não retornou indicadores para o piloto." />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="pilot-goals">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="pilot-goals" className="font-heading text-lg font-semibold text-foreground">Metas de validação</h2>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {evaluated.length === 0 ? (
                  'Ainda sem receitas cotadas para avaliar as metas.'
                ) : (
                  <>
                    <span className="num text-foreground">{passing}</span> de <span className="num text-foreground">{evaluated.length}</span> metas atingidas
                    {dataUpdatedAt ? ` · atualizado ${formatRelative(dataUpdatedAt)}` : ''}
                  </>
                )}
              </p>
            </div>
            <Stagger step={0.06} inView={false} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {indicators.map((ind) => (
                <StaggerItem key={ind.key} y={12} className="h-full">
                  <IndicatorCard indicator={ind} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          <section aria-labelledby="pilot-volume">
            <h2 id="pilot-volume" className="mb-3 font-heading text-lg font-semibold text-foreground">Volume do piloto</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={FileText} label="Receitas enviadas" value={m.totalPrescriptions} hint={`${m.quotedPrescriptions} com ao menos uma cotação`} />
              <StatCard icon={Zap} label="Cotações enviadas" value={m.totalQuotes} hint={`${m.acceptedQuotes} aceitas pelos pacientes`} tone="info" />
              <StatCard icon={PackageCheck} label="Pedidos entregues" value={m.deliveredOrders} hint={`de ${m.totalOrders} pedidos criados`} />
              <StatCard icon={Building2} label="Farmácias credenciadas" value={m.activePharmacies} hint="Aptas a enviar cotações" tone="neutral" />
            </div>
          </section>

          <section aria-labelledby="pilot-events">
            <div className="mb-3">
              <h2 id="pilot-events" className="font-heading text-lg font-semibold text-foreground">Últimos eventos de telemetria</h2>
              <p className="mt-1 text-sm text-muted-foreground">Amostra com identificadores opacos (até 10 eventos). Não é possível chegar ao paciente a partir deles.</p>
            </div>
            {events.length === 0 ? (
              <EmptyState icon={Activity} title="Nenhum evento registrado" description="Os eventos aparecem quando as farmácias começarem a responder às receitas do piloto." />
            ) : (
              <AdminTable
                caption="Eventos anonimizados de telemetria"
                getRowId={(e) => `${e.anonymousId}-${e.timestamp}-${e.event}`}
                rows={events}
                columns={[
                  {
                    key: 'event',
                    header: 'Evento',
                    primary: true,
                    cell: (e) => (
                      <span className="block">
                        <span className="block font-medium text-foreground">{PILOT_EVENTS[e.event] || e.event}</span>
                        <code className="text-[0.6875rem] text-muted-foreground">{e.event}</code>
                      </span>
                    ),
                  },
                  { key: 'anon', header: 'ID opaco', cell: (e) => <code className="text-xs">{e.anonymousId}</code> },
                  {
                    key: 'ttq',
                    header: 'Tempo de resposta',
                    cell: (e) => <Num>{e.timeToQuoteMinutes ? `${dec1(e.timeToQuoteMinutes)} min` : '—'}</Num>,
                  },
                  { key: 'price', header: 'Valor', headClassName: 'text-right', className: 'text-right', cell: (e) => <Num>{e.priceCents ? formatCents(e.priceCents) : '—'}</Num> },
                  { key: 'at', header: 'Data e hora', cell: (e) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(e.timestamp)}</span> },
                ]}
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}

/**
 * Valor vs meta. O estado vem com ícone + texto (nunca só a cor) e um medidor com a marca da meta.
 */
function IndicatorCard({ indicator: ind }) {
  const Icon = ind.icon;
  const state = !ind.hasData ? 'nodata' : ind.pass ? 'pass' : 'fail';
  const stateUi = {
    pass: { icon: CheckCircle2, text: 'Dentro da meta', cls: 'text-success', fill: 'bg-success', track: 'bg-success-wash' },
    fail: { icon: TriangleAlert, text: 'Fora da meta', cls: 'text-[hsl(4_62%_42%)]', fill: 'bg-coral', track: 'bg-coral-wash' },
    nodata: { icon: CircleDashed, text: 'Sem dados suficientes', cls: 'text-muted-foreground', fill: 'bg-muted-foreground/40', track: 'bg-muted' },
  }[state];
  const StateIcon = stateUi.icon;
  // Escala do medidor: a meta fica em 50% (ou o valor, se for maior, ocupa a barra toda)
  const scaleMax = Math.max(ind.target * 2, ind.value, 1);
  const pct = Math.min(100, (Math.max(0, ind.value) / scaleMax) * 100);
  const targetPct = Math.min(100, (ind.target / scaleMax) * 100);

  return (
    <article
      aria-label={`${ind.label}: ${ind.display}. ${ind.targetLabel}. ${stateUi.text}.`}
      className={cn(
        'flex h-full flex-col rounded-2xl border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)]',
        state === 'fail' ? 'border-[color-mix(in_oklab,var(--coral)_40%,var(--border))]' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{ind.label}</p>
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 font-heading text-[1.875rem] font-semibold leading-none tracking-tight text-foreground">{ind.hasData ? ind.display : '—'}</p>
      <p className={cn('mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium', stateUi.cls)}>
        <StateIcon className="size-4" aria-hidden="true" /> {stateUi.text}
      </p>

      <div className="mt-4" aria-hidden="true">
        <div className={cn('relative h-2 rounded-full', stateUi.track)}>
          {ind.hasData && (
            <motion.div
              className={cn('absolute inset-y-0 left-0 rounded-full', stateUi.fill)}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
              style={{ width: `${pct}%`, originX: 0 }}
            />
          )}
          <span className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70" style={{ left: `${targetPct}%` }} />
        </div>
      </div>
      <p className="num mt-2 text-xs text-muted-foreground">{ind.targetLabel}</p>
      <p className="mt-auto pt-3 text-xs leading-relaxed text-muted-foreground">{ind.help}</p>
    </article>
  );
}
