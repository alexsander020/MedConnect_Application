import { useQuery } from '@tanstack/react-query';
import { Eye, ShieldCheck, MapPin, Phone, User } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import StatusBadge from '@/components/shared/StatusBadge';
import OrderTimeline from '@/components/shared/OrderTimeline';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import ErrorState from '@/components/ErrorState';
import { pharmacyApi } from '@/services/endpoints';
import { formatDate, formatDateTime, formatPhone } from '@/lib/format';
import { usePrescriptionViewer } from './usePrescriptionViewer';
import { deliveryDaysLabel, orderDeadline, orderPriceLabel, shortId } from './utils';

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="font-heading text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Detalhe do pedido em Sheet lateral. O contato do paciente vem decifrado de GET /orders/:id,
 * que registra o acesso (VIEW_CONTACT_DATA) na trilha de auditoria — por isso só buscamos ao abrir.
 * `summary` é o item da listagem (status otimista); `actions` renderiza as transições válidas.
 */
export default function OrderDetailSheet({ summary, open, onOpenChange, actions }) {
  const orderId = summary?.id;
  const viewer = usePrescriptionViewer();
  const detail = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => pharmacyApi.order(orderId),
    enabled: open && !!orderId,
  });

  const data = detail.data;
  const status = summary?.status ?? data?.status;
  const history = (data?.history?.length ? data.history : summary?.history) || [];
  const merged = { ...(data || {}), ...(summary || {}), quote: summary?.quote || data?.quote };
  const deadline = orderDeadline(merged);
  const patient = data?.quote?.prescription?.patient;
  const prescriptionId = merged.quote?.prescriptionId || merged.quote?.prescription?.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <SheetTitle className="text-lg">
              Pedido <span className="num">#{shortId(orderId)}</span>
            </SheetTitle>
            {status && <StatusBadge kind="order" status={status} />}
          </div>
          <SheetDescription>Aprovado pelo paciente em {formatDateTime(merged.createdAt)}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          <Section title="Entrega">
            {detail.isLoading ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            ) : detail.isError ? (
              <ErrorState
                title="Não foi possível carregar o contato"
                message="Tente novamente para ver os dados de entrega deste pedido."
                onRetry={detail.refetch}
                className="py-8"
              />
            ) : (
              <>
                <KeyValueList>
                  <KeyValue label={<span className="inline-flex items-center gap-1.5"><User className="size-3.5" aria-hidden="true" /> Paciente</span>}>
                    {patient?.name || '—'}
                  </KeyValue>
                  <KeyValue label={<span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" aria-hidden="true" /> Telefone</span>}>
                    {patient?.phone ? (
                      <a href={`tel:${String(patient.phone).replace(/\D/g, '')}`} className="num text-primary underline-offset-4 hover:underline">
                        {formatPhone(patient.phone)}
                      </a>
                    ) : 'Não informado'}
                  </KeyValue>
                  <KeyValue label={<span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden="true" /> Endereço</span>}>
                    {patient?.address || 'Não informado'}
                  </KeyValue>
                </KeyValueList>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  Dados liberados só para a entrega deste pedido. Cada consulta fica registrada na trilha de auditoria (LGPD).
                </p>
              </>
            )}
          </Section>

          <Section title="Proposta aceita">
            <KeyValueList>
              <KeyValue label="Valor total"><span className="num">{orderPriceLabel(merged)}</span></KeyValue>
              <KeyValue label="Prazo prometido">{deliveryDaysLabel(merged.quote?.deliveryDays)}</KeyValue>
              <KeyValue label="Previsão de entrega">
                {deadline ? (
                  <span className={deadline.overdue ? 'text-[hsl(4_62%_42%)]' : undefined}>
                    {formatDate(deadline.date, { weekday: 'long', day: '2-digit', month: 'long' })}
                    {deadline.overdue && ' · prazo vencido'}
                  </span>
                ) : '—'}
              </KeyValue>
              {merged.quote?.notes && (
                <KeyValue label="Suas observações"><span className="whitespace-pre-line font-normal">{merged.quote.notes}</span></KeyValue>
              )}
            </KeyValueList>
            {prescriptionId && (
              <Button variant="outline" size="sm" onClick={() => viewer.open(prescriptionId)} disabled={!!viewer.pendingId}>
                {viewer.pendingId ? <Spinner /> : <Eye aria-hidden="true" />} Ver receita
              </Button>
            )}
          </Section>

          <Section title="Andamento">
            <OrderTimeline status={status} createdAt={merged.createdAt} history={history} />
          </Section>
        </div>

        {actions && (
          <SheetFooter className="mt-0 flex-row flex-wrap justify-end border-t border-border px-6 py-4">
            {actions}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
