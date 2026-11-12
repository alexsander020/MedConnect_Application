import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, ChevronRight, FileText, FileUp, FlaskConical, Hourglass, MapPin, Package, PackageCheck, PawPrint,
  Sparkles, Star, Store, Tags, Truck,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import StarRating from '@/components/StarRating';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { FadeUp, Stagger, StaggerItem } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { patientApi, publicApi } from '@/services/endpoints';
import { computeOpenStatus } from '@/lib/business-hours';
import { firstName, formatRelative } from '@/lib/format';
import { isVetPrescription } from '@/lib/vet';
import OrderProgress from './components/OrderProgress';
import { VetBadge } from './components/vet-ui';
import {
  asArray, awaitingQuotes, countOpenQuotes, formatQuotePrice, isOrderActive, openQuotesOf, shortId,
} from './components/patient-utils';

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Monta os "próximos passos" a partir do estado real das receitas e pedidos */
function buildNextSteps({ prescriptions, orders, openQuotes, waiting }) {
  const steps = [];
  if (openQuotes > 0) {
    steps.push({
      icon: Tags,
      title: `Você tem ${plural(openQuotes, 'cotação', 'cotações')} para comparar`,
      text: 'Compare preço, prazo e avaliação e aprove a que preferir.',
      to: '/quote-offers',
      cta: 'Comparar cotações',
    });
  }
  const onTheWay = orders.filter((o) => o.status === 'DELIVERY');
  if (onTheWay.length > 0) {
    const first = onTheWay[0];
    steps.push({
      icon: Truck,
      title: onTheWay.length === 1 ? 'Seu pedido saiu para entrega' : `${onTheWay.length} pedidos a caminho`,
      text: `Pedido ${shortId(first.id)}${first.quote?.pharmacy?.name ? ` · ${first.quote.pharmacy.name}` : ''}`,
      to: `/order/${first.id}`,
      cta: 'Acompanhar',
    });
  }
  // Só sugere avaliar quando a API informa explicitamente que ainda não há avaliação
  const toReview = orders.find((o) => o.status === 'DELIVERED' && o.review === null);
  if (toReview) {
    steps.push({
      icon: Star,
      title: 'Conte como foi seu pedido',
      text: `Sua avaliação de ${toReview.quote?.pharmacy?.name || 'farmácia'} ajuda outros pacientes.`,
      to: `/review/${toReview.id}`,
      cta: 'Avaliar',
    });
  }
  if (waiting > 0) {
    steps.push({
      icon: Hourglass,
      title: `${plural(waiting, 'receita aguardando', 'receitas aguardando')} cotações`,
      text: 'As farmácias credenciadas estão analisando. Avisamos assim que chegar uma proposta.',
    });
  }
  if (prescriptions.length === 0 && orders.length === 0) {
    steps.push({
      icon: FileUp,
      title: 'Envie sua primeira receita',
      text: 'Uma foto ou o PDF da receita basta. Farmácias credenciadas respondem com cotações.',
      to: '/new-quote',
      cta: 'Enviar receita',
    });
  }
  if (steps.length === 0) {
    steps.push({
      icon: Sparkles,
      title: 'Tudo em dia por aqui',
      text: 'Quando precisar de uma nova fórmula, é só enviar a receita.',
      to: '/new-quote',
      cta: 'Enviar receita',
    });
  }
  return steps.slice(0, 3);
}

function NextSteps({ steps }) {
  return (
    <section aria-labelledby="proximos-passos" className="rounded-2xl border border-border bg-mint-wash p-5 md:p-6">
      <h2 id="proximos-passos" className="eyebrow">Próximos passos</h2>
      <Stagger as="ul" step={0.06} inView={false} className="mt-3 divide-y divide-[color-mix(in_oklab,var(--primary)_14%,transparent)]">
        {steps.map((s) => (
          <StaggerItem as="li" key={s.title} y={10} className="flex items-start gap-3 py-3.5 first:pt-1 last:pb-0 sm:items-center">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-primary sm:size-11">
              <s.icon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[0.9375rem] font-medium text-foreground">{s.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
              {s.to && (
                <Button asChild variant="outline" size="sm" className="self-start bg-background sm:self-center">
                  <Link to={s.to}>
                    {s.cta} <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function SectionCard({ title, action, children, className }) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="font-heading text-base font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

function RecentPrescriptions({ prescriptions }) {
  const recent = prescriptions.slice(0, 4);
  if (recent.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nenhuma receita enviada"
        description="Envie a receita da sua fórmula para receber cotações."
        className="py-8"
        action={<Button asChild size="sm"><Link to="/new-quote"><FileUp aria-hidden="true" /> Enviar receita</Link></Button>}
      />
    );
  }
  return (
    <Stagger as="ul" step={0.06} className="-my-1 divide-y divide-border">
      {recent.map((p) => {
        const open = openQuotesOf(p).length;
        const isVet = isVetPrescription(p);
        const Icon = isVet ? PawPrint : FileText;
        return (
          <StaggerItem as="li" key={p.id} y={10} className="flex items-center gap-3 py-3">
            <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary sm:inline-flex">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                <span className="truncate">
                  <span className="sr-only sm:not-sr-only">Receita </span>
                  <span className="num">{shortId(p.id)}</span>
                  {isVet && p.pet?.name && <> · {p.pet.name}</>}
                </span>
                {isVet && <VetBadge>Pet</VetBadge>}
              </p>
              <p className="text-xs text-muted-foreground">
                Enviada {formatRelative(p.createdAt)}
                {open > 0 && <> · {plural(open, 'cotação', 'cotações')}</>}
              </p>
            </div>
            {open > 0 ? (
              <Button asChild size="xs" variant="outline">
                <Link to="/quote-offers" aria-label={`Comparar cotações da receita ${shortId(p.id)}`}>Comparar</Link>
              </Button>
            ) : (
              <StatusBadge kind="prescription" status={p.status} />
            )}
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

function ActiveOrders({ orders }) {
  const active = orders.filter(isOrderActive).slice(0, 3);
  if (active.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Nenhum pedido em andamento"
        description="Ao aprovar uma cotação, o pedido aparece aqui com cada etapa da manipulação."
        className="py-8"
      />
    );
  }
  return (
    <Stagger as="ul" step={0.06} className="space-y-3">
      {active.map((o) => (
        <StaggerItem as="li" key={o.id} y={10}>
          <Link
            to={`/order/${o.id}`}
            className="group block rounded-xl border border-border bg-background p-4 transition-colors hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{o.quote?.pharmacy?.name || 'Farmácia credenciada'}</p>
                <p className="text-xs text-muted-foreground">
                  Pedido <span className="num">{shortId(o.id)}</span> · <span className="num">{formatQuotePrice(o.quote)}</span>
                  {isVetPrescription(o.quote?.prescription) && o.quote?.prescription?.pet?.name && (
                    <> · Pet: {o.quote.prescription.pet.name}</>
                  )}
                </p>
              </div>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <OrderProgress status={o.status} className="mt-3" />
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function OpenPharmaciesStrip() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicPharmacies', 'navbar'],
    queryFn: () => publicApi.pharmacies(),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
  if (isError) return null;
  const list = asArray(data?.data);
  if (!isLoading && list.length === 0) return null;

  const now = new Date();
  const withStatus = list
    .map((p) => ({ ...p, open: computeOpenStatus(p.businessHours, p.timezone, now).isOpen }))
    .sort((a, b) => Number(b.open) - Number(a.open));
  const openCount = withStatus.filter((p) => p.open).length;

  return (
    <section aria-labelledby="farmacias-abertas" className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="farmacias-abertas" className="font-heading text-lg font-semibold text-foreground">Farmácias abertas agora</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Consultando horários…'
              : openCount > 0
                ? `${plural(openCount, 'farmácia credenciada aberta', 'farmácias credenciadas abertas')} neste momento.`
                : 'Nenhuma aberta agora — sua receita fica na fila e é cotada na abertura.'}
          </p>
        </div>
        <Button asChild variant="link" size="sm" className="px-0">
          <Link to="/pharmacies">Ver todas <ArrowRight aria-hidden="true" /></Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="flex gap-3 overflow-hidden" aria-hidden="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[104px] w-64 shrink-0 rounded-2xl" />)}
        </div>
      ) : (
        <Stagger
          as="ul"
          step={0.06}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3"
        >
          {withStatus.slice(0, 6).map((p) => (
            <StaggerItem as="li" key={p.id} y={12} className="w-[260px] shrink-0 snap-start md:w-auto">
              <div className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <Store className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    {(p.city || p.state) && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden="true" />
                        {[p.city, p.state].filter(Boolean).join(' — ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                  <OpenStatusPill hours={p.businessHours} timezone={p.timezone} size="sm" />
                  {p.reviewsCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <StarRating rating={p.averageRating} size={12} label={`Avaliação de ${p.name}`} />
                      <span className="num">{Number(p.averageRating).toFixed(1).replace('.', ',')}</span>
                    </span>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}

/** Início do paciente */
export default function Dashboard() {
  const { currentUser } = useAuth();
  const { vetEnabled } = usePublicConfig();
  const prescriptionsQ = useQuery({ queryKey: ['myPrescriptions'], queryFn: patientApi.prescriptions });
  const ordersQ = useQuery({ queryKey: ['myOrders'], queryFn: patientApi.orders });

  const prescriptions = asArray(prescriptionsQ.data);
  const orders = asArray(ordersQ.data);
  const name = firstName(currentUser?.name);

  const openQuotes = countOpenQuotes(prescriptions);
  const waiting = awaitingQuotes(prescriptions).length;
  const inProgress = orders.filter(isOrderActive).length;
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;

  const isLoading = prescriptionsQ.isLoading || ordersQ.isLoading;
  const isError = prescriptionsQ.isError || ordersQ.isError;

  return (
    <>
      <PageHeader
        eyebrow="Área do paciente"
        title={name ? `Olá, ${name}` : 'Olá!'}
        description="Acompanhe suas receitas, compare cotações e siga cada pedido até a entrega."
        actions={
          <>
            {vetEnabled && (
              <Button asChild size="lg" variant="outline">
                <Link to="/new-quote" state={{ kind: 'VETERINARY' }}>
                  <PawPrint aria-hidden="true" /> Receita do pet
                </Link>
              </Button>
            )}
            <Button asChild size="lg">
              <Link to="/new-quote">
                <FileUp aria-hidden="true" /> Enviar receita
              </Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="space-y-6">
          <LoadingState variant="cards" rows={4} message="Carregando seu resumo…" />
          <LoadingState variant="list" rows={2} />
        </div>
      ) : isError ? (
        <ErrorState
          title="Erro ao carregar seu resumo"
          message="Não foi possível buscar suas receitas e pedidos agora. Verifique sua conexão e tente novamente."
          onRetry={() => {
            prescriptionsQ.refetch();
            ordersQ.refetch();
          }}
        />
      ) : (
        <>
          <Stagger step={0.06} inView={false} className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StaggerItem y={12}>
              <StatCard icon={Hourglass} tone="amber" label="Aguardando cotação" value={waiting} hint="Receitas sem proposta ainda" />
            </StaggerItem>
            <StaggerItem y={12}>
              <StatCard icon={Tags} tone="info" label="Cotações recebidas" value={openQuotes} hint="Prontas para comparar" />
            </StaggerItem>
            <StaggerItem y={12}>
              <StatCard icon={FlaskConical} tone="primary" label="Pedidos em andamento" value={inProgress} hint="Em manipulação ou entrega" />
            </StaggerItem>
            <StaggerItem y={12}>
              <StatCard icon={PackageCheck} tone="neutral" label="Entregues" value={delivered} hint="Pedidos concluídos" />
            </StaggerItem>
          </Stagger>

          <FadeUp duration={0.45} y={12} delay={0.1} className="mt-6">
            <NextSteps steps={buildNextSteps({ prescriptions, orders, openQuotes, waiting })} />
          </FadeUp>

          <div className="mt-6 grid gap-4 md:gap-6 lg:grid-cols-2">
            <SectionCard
              title="Receitas recentes"
              action={
                prescriptions.length > 0 && (
                  <Button asChild variant="link" size="sm" className="px-0">
                    <Link to="/quote-offers">Ver cotações <ArrowRight aria-hidden="true" /></Link>
                  </Button>
                )
              }
            >
              <RecentPrescriptions prescriptions={prescriptions} />
            </SectionCard>
            <SectionCard
              title="Pedidos em andamento"
              action={
                orders.length > 0 && (
                  <Button asChild variant="link" size="sm" className="px-0">
                    <Link to="/orders">Ver todos <ArrowRight aria-hidden="true" /></Link>
                  </Button>
                )
              }
            >
              <ActiveOrders orders={orders} />
            </SectionCard>
          </div>
        </>
      )}

      <OpenPharmaciesStrip />
    </>
  );
}
