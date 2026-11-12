import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock3, FileLock2, MapPin, Phone, Star, Store, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import OrderTimeline from '@/components/shared/OrderTimeline';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { FadeUp } from '@/components/motion';
import { patientApi } from '@/services/endpoints';
import { formatDateTime, formatPhone } from '@/lib/format';
import ViewPrescriptionButton from './components/ViewPrescriptionButton';
import { canReview, deliveryLabel, errorStatus, formatQuotePrice, shortId } from './components/patient-utils';

const HEADLINES = {
  PRODUCTION: { title: 'Sua fórmula está sendo manipulada', text: 'A farmácia já recebeu a receita e está preparando o seu pedido.' },
  DELIVERY: { title: 'Seu pedido saiu para entrega', text: 'Fique atento: a entrega está a caminho do endereço combinado.' },
  DELIVERED: { title: 'Pedido entregue', text: 'Esperamos que esteja tudo certo com a sua fórmula.' },
  CANCELLED: { title: 'Pedido cancelado', text: 'Este pedido foi cancelado e não seguirá para manipulação.' },
};

function BackButton() {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to="/orders"><ArrowLeft aria-hidden="true" /> Meus pedidos</Link>
    </Button>
  );
}

/** Acompanhamento de um pedido do paciente */
export default function OrderTracking() {
  const { id } = useParams();
  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => patientApi.order(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <>
        <PageHeader eyebrow="Pedido" title="Carregando pedido…" actions={<BackButton />} />
        <LoadingState variant="detail" message="Carregando os dados do pedido…" />
      </>
    );
  }

  if (isError || !order) {
    const status = errorStatus(error);
    const notFound = status === 404 || status === 403 || (!isError && !order);
    return (
      <>
        <PageHeader eyebrow="Pedido" title="Acompanhar pedido" actions={<BackButton />} />
        <ErrorState
          title={notFound ? 'Pedido não encontrado' : 'Erro ao carregar o pedido'}
          message={
            notFound
              ? 'Não encontramos este pedido na sua conta. Confira o link ou volte para a lista de pedidos.'
              : 'Não foi possível buscar os dados deste pedido agora. Verifique sua conexão e tente novamente.'
          }
          onRetry={notFound ? undefined : refetch}
        />
      </>
    );
  }

  const quote = order.quote || {};
  const pharmacy = quote.pharmacy || null;
  const pharmacyName = pharmacy?.name || 'Farmácia credenciada';
  const prescriptionId = quote.prescriptionId || quote.prescription?.id;
  const headline = HEADLINES[order.status] || HEADLINES.PRODUCTION;
  const history = Array.isArray(order.history) ? order.history : [];
  const phone = pharmacy?.phone ? formatPhone(pharmacy.phone) : null;

  return (
    <>
      <PageHeader
        eyebrow={`Pedido ${shortId(order.id)}`}
        title={headline.title}
        description={headline.text}
        actions={<BackButton />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <FadeUp duration={0.4} y={12}>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="font-heading text-base font-semibold">Acompanhamento</CardTitle>
                  <CardDescription>Atualizado {formatDateTime(order.updatedAt || order.createdAt)}</CardDescription>
                </div>
                <StatusBadge kind="order" status={order.status} />
              </CardHeader>
              <CardContent>
                <OrderTimeline status={order.status} createdAt={order.createdAt} history={history} />
              </CardContent>
            </Card>
          </FadeUp>

          {order.status === 'CANCELLED' && (
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash/60 p-4 text-sm">
              <XCircle className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden="true" />
              <p className="leading-relaxed text-foreground">
                Se você não esperava o cancelamento, fale com a farmácia ou com o{' '}
                <Link to="/support" className="font-medium text-primary underline underline-offset-2">atendimento MedConnect</Link>.
              </p>
            </div>
          )}

          {canReview(order) && (
            <FadeUp duration={0.4} y={12} delay={0.1}>
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-mint-wash p-5 sm:flex-row sm:items-center">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                  <Star className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-[0.9375rem] font-semibold text-foreground">Como foi seu pedido?</p>
                  <p className="text-sm text-muted-foreground">Avalie {pharmacyName}. Sua opinião ajuda outros pacientes a escolher.</p>
                </div>
                <Button asChild>
                  <Link to={`/review/${order.id}`}>Avaliar pedido</Link>
                </Button>
              </div>
            </FadeUp>
          )}
          {order.status === 'DELIVERED' && order.review && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="size-4 fill-amber text-amber" aria-hidden="true" /> Você já avaliou este pedido. Obrigado!
            </p>
          )}
          <FadeUp duration={0.4} y={12} delay={0.12}>
            <section aria-labelledby="sua-receita" className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center">
              <span className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary sm:inline-flex">
                <FileLock2 className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="sua-receita" className="font-heading text-[0.9375rem] font-semibold text-foreground">Sua receita</h2>
                <p className="flex items-start gap-1.5 text-sm leading-relaxed text-muted-foreground">
                  <Clock3 className="mt-1 size-3.5 shrink-0" aria-hidden="true" />
                  Por segurança, a receita abre em um link temporário, válido por 5 minutos. Cada acesso fica registrado.
                </p>
              </div>
              <ViewPrescriptionButton prescriptionId={prescriptionId} className="self-start sm:self-center" />
            </section>
          </FadeUp>
        </div>

        <aside className="space-y-6" aria-label="Detalhes do pedido">
          <FadeUp duration={0.4} y={12} delay={0.05}>
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="font-heading text-base font-semibold">Resumo</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border rounded-xl border border-border">
                  {[
                    ['Valor total', <span key="v" className="text-base">{formatQuotePrice(quote)}</span>],
                    ['Prazo informado', deliveryLabel(quote.deliveryDays)],
                    ['Aprovado em', formatDateTime(order.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="num text-right text-sm text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                {quote.notes && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground">Observações da farmácia</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">{quote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeUp>

          <FadeUp duration={0.4} y={12} delay={0.1}>
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="font-heading text-base font-semibold">Farmácia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="flex items-center gap-3 font-medium text-foreground">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <Store className="size-[18px]" aria-hidden="true" />
                  </span>
                  {pharmacyName}
                </p>
                {phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <a href={`tel:${String(pharmacy.phone).replace(/[^\d+]/g, '')}`} className="num font-medium text-primary underline-offset-2 hover:underline">
                      {phone}
                    </a>
                  </p>
                )}
                {pharmacy?.address && (
                  <p className="flex items-start gap-2 text-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 break-words">{pharmacy.address}</span>
                  </p>
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {phone || pharmacy?.address
                    ? 'O contato da farmácia fica visível porque você aprovou a cotação dela.'
                    : 'A farmácia ainda não informou telefone ou endereço. Fale com o atendimento se precisar.'}
                </p>
              </CardContent>
            </Card>
          </FadeUp>

        </aside>
      </div>
    </>
  );
}
