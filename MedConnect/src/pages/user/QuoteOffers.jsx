import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownWideNarrow, BadgeCheck, Check, Clock, FileUp, Hourglass, Tags, Truck, Zap } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import StarRating from '@/components/StarRating';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/context/ToastContext';
import { patientApi, publicApi } from '@/services/endpoints';
import { formatDate, formatRelative } from '@/lib/format';
import { isVetPrescription } from '@/lib/vet';
import ViewPrescriptionButton from './components/ViewPrescriptionButton';
import { VetBadge } from './components/vet-ui';
import { petSummary, pharmaceuticalFormLabel } from './components/vet-format';
import {
  asArray, awaitingQuotes, deliveryLabel, errorStatus, formatQuotePrice, friendlyError, openQuotesOf, priceCentsOf, shortId,
} from './components/patient-utils';

const SORTS = {
  price: { label: 'Menor preço', icon: Tags },
  speed: { label: 'Menor prazo', icon: Zap },
};

const daysValue = (q) => (q.deliveryDays === null || q.deliveryDays === undefined ? Number.POSITIVE_INFINITY : Number(q.deliveryDays));
const priceValue = (q) => priceCentsOf(q) ?? Number.POSITIVE_INFINITY;

function sortQuotes(quotes, sort) {
  const list = [...quotes];
  if (sort === 'speed') return list.sort((a, b) => daysValue(a) - daysValue(b) || priceValue(a) - priceValue(b));
  return list.sort((a, b) => priceValue(a) - priceValue(b) || daysValue(a) - daysValue(b));
}

function QuoteCard({ quote, rating, cheapest, fastest, onAccept, disabled }) {
  const pharmacyName = quote.pharmacy?.name || 'Farmácia credenciada';
  const highlighted = cheapest || fastest;
  return (
    <article
      aria-label={`Cotação de ${pharmacyName}`}
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)] transition-shadow hover:shadow-[0_8px_24px_-12px_hsl(190_30%_12%/0.18)]',
        highlighted ? 'border-[color-mix(in_oklab,var(--primary)_55%,var(--border))] ring-1 ring-[color-mix(in_oklab,var(--primary)_25%,transparent)]' : 'border-border'
      )}
    >
      {(cheapest || fastest) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {cheapest && <StatusBadge tone="success">Menor preço</StatusBadge>}
          {fastest && <StatusBadge tone="info">Mais rápido</StatusBadge>}
        </div>
      )}
      <h3 className="font-heading text-base font-semibold leading-snug text-foreground">{pharmacyName}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {rating?.reviewsCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <StarRating rating={rating.averageRating} size={13} label={`Avaliação de ${pharmacyName}`} />
            <span className="num text-foreground">{Number(rating.averageRating).toFixed(1).replace('.', ',')}</span>
            <span>({rating.reviewsCount} {rating.reviewsCount === 1 ? 'avaliação' : 'avaliações'})</span>
          </span>
        ) : (
          <span>Sem avaliações ainda</span>
        )}
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1"><BadgeCheck className="size-3.5 text-primary" aria-hidden="true" /> Credenciada</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-mint-wash/60 p-3">
        <div>
          <dt className="text-xs text-muted-foreground">Valor total</dt>
          <dd className="num mt-0.5 text-2xl leading-none text-foreground">{formatQuotePrice(quote)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Prazo</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Truck className="size-4 text-primary" aria-hidden="true" />
            <span className="num">{deliveryLabel(quote.deliveryDays)}</span>
          </dd>
        </div>
      </dl>

      {(quote.pharmaceuticalForm || quote.flavoring || quote.estimatedPreparationDays != null) && (
        <dl className="mt-3 space-y-1 text-sm">
          {quote.pharmaceuticalForm && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Forma farmacêutica</dt>
              <dd className="text-right text-foreground">{pharmaceuticalFormLabel(quote.pharmaceuticalForm)}</dd>
            </div>
          )}
          {quote.flavoring && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Sabor</dt>
              <dd className="text-right text-foreground">{quote.flavoring}</dd>
            </div>
          )}
          {quote.estimatedPreparationDays != null && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Manipulação</dt>
              <dd className="num text-right text-foreground">{deliveryLabel(quote.estimatedPreparationDays)}</dd>
            </div>
          )}
        </dl>
      )}

      {quote.notes && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Observações da farmácia</p>
          <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-foreground">{quote.notes}</p>
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" aria-hidden="true" /> Recebida {formatRelative(quote.createdAt)}
      </p>

      <div className="mt-auto pt-4">
        <Button type="button" className="w-full" onClick={() => onAccept(quote)} disabled={disabled}>
          <Check aria-hidden="true" /> Aprovar cotação e fazer pedido
        </Button>
      </div>
    </article>
  );
}

function PrescriptionGroup({ prescription, quotes, sort, ratings, onAccept, disabled }) {
  const sorted = sortQuotes(quotes, sort);
  const multiple = quotes.length > 1;
  const minPrice = Math.min(...quotes.map(priceValue));
  const minDays = Math.min(...quotes.map(daysValue));
  const headingId = `receita-${prescription.id}`;
  const isVet = isVetPrescription(prescription);
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id={headingId} className="flex flex-wrap items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <span>
              {isVet ? 'Receita veterinária' : 'Receita'} <span className="num">{shortId(prescription.id)}</span>
            </span>
            {isVet && <VetBadge>Veterinário</VetBadge>}
          </h2>
          {isVet && prescription.pet && (
            <p className="text-sm font-medium text-primary">Animal: {petSummary(prescription.pet)}</p>
          )}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>Enviada em {formatDate(prescription.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{quotes.length} {quotes.length === 1 ? 'cotação' : 'cotações'}</span>
            <StatusBadge kind="prescription" status={prescription.status} className="ml-1" />
          </p>
        </div>
        <ViewPrescriptionButton prescriptionId={prescription.id} size="sm" variant="outline" className="self-start sm:self-auto" />
      </div>
      <Stagger step={0.06} inView={false} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((q) => (
          <StaggerItem key={q.id} y={14} className="h-full">
            <QuoteCard
              quote={q}
              rating={ratings[q.pharmacyId || q.pharmacy?.id]}
              cheapest={multiple && Number.isFinite(minPrice) && priceValue(q) === minPrice}
              fastest={multiple && Number.isFinite(minDays) && daysValue(q) === minDays}
              onAccept={onAccept}
              disabled={disabled}
            />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/** Comparador de cotações recebidas, agrupadas por receita */
export default function QuoteOffers() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState('price');
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['myPrescriptions'], queryFn: patientApi.prescriptions });
  // Avaliação pública das farmácias (a listagem de cotações não traz nota)
  const pharmaciesQ = useQuery({
    queryKey: ['publicPharmacies', 'navbar'],
    queryFn: () => publicApi.pharmacies(),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const prescriptions = asArray(data);
  const groups = useMemo(
    () => prescriptions.map((p) => ({ prescription: p, quotes: openQuotesOf(p) })).filter((g) => g.quotes.length > 0),
    [prescriptions]
  );
  const ratings = useMemo(() => {
    const map = {};
    asArray(pharmaciesQ.data?.data).forEach((p) => {
      map[p.id] = { averageRating: p.averageRating, reviewsCount: p.reviewsCount };
    });
    return map;
  }, [pharmaciesQ.data]);
  const waiting = awaitingQuotes(prescriptions).length;
  const totalQuotes = groups.reduce((acc, g) => acc + g.quotes.length, 0);

  const accept = useMutation({
    mutationFn: (quoteId) => patientApi.acceptQuote(quoteId),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['myPrescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setSelected(null);
      toast.success('A farmácia foi avisada e já pode iniciar a manipulação.', 'Pedido confirmado');
      if (order?.id) navigate(`/order/${order.id}`);
      else navigate('/orders');
    },
    onError: (err) => {
      setSelected(null);
      if (errorStatus(err) === 409) {
        toast.warning(friendlyError(err, 'Esta receita já tem um pedido aprovado.'), 'Cotação indisponível');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['myOrders'] });
        return;
      }
      toast.error(friendlyError(err, 'Não foi possível aprovar a cotação. Tente novamente.'));
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Minha saúde"
        title="Cotações recebidas"
        description="Compare preço, prazo e avaliação das farmácias. Ao aprovar uma cotação, o pedido segue direto para a manipulação e as demais são recusadas."
      />

      {isLoading ? (
        <LoadingState variant="cards" rows={3} message="Carregando suas cotações…" />
      ) : isError ? (
        <ErrorState
          title="Erro ao carregar cotações"
          message="Não foi possível buscar as propostas enviadas pelas farmácias. Verifique sua conexão e tente novamente."
          onRetry={refetch}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma cotação para comparar"
          description={
            waiting > 0
              ? 'Suas receitas estão com as farmácias credenciadas. Avisaremos assim que chegar a primeira proposta.'
              : 'Envie uma receita para receber cotações de farmácias de manipulação credenciadas.'
          }
          action={
            <Button asChild>
              <Link to="/new-quote"><FileUp aria-hidden="true" /> Enviar receita</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <p className="px-1 text-sm text-muted-foreground">
              <span className="num text-foreground">{totalQuotes}</span> {totalQuotes === 1 ? 'cotação' : 'cotações'} em{' '}
              <span className="num text-foreground">{groups.length}</span> {groups.length === 1 ? 'receita' : 'receitas'}
            </p>
            <div className="flex items-center gap-2">
              <span id="sort-label" className="sr-only items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground sm:not-sr-only sm:flex">
                <ArrowDownWideNarrow className="size-4" aria-hidden="true" /> Ordenar por
              </span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={sort}
                onValueChange={(v) => v && setSort(v)}
                aria-labelledby="sort-label"
                className="w-full sm:w-fit"
              >
                {Object.entries(SORTS).map(([key, s]) => (
                  <ToggleGroupItem key={key} value={key} className="flex-1 px-3 data-[state=on]:bg-accent data-[state=on]:text-primary sm:flex-none">
                    <s.icon aria-hidden="true" /> {s.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          {groups.map((g) => (
            <PrescriptionGroup
              key={g.prescription.id}
              prescription={g.prescription}
              quotes={g.quotes}
              sort={sort}
              ratings={ratings}
              onAccept={setSelected}
              disabled={accept.isPending}
            />
          ))}

          {waiting > 0 && (
            <p className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-mint-wash/50 px-4 py-3 text-sm text-muted-foreground">
              <Hourglass className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {waiting === 1 ? 'Mais 1 receita aguardando cotações.' : `Mais ${waiting} receitas aguardando cotações.`} Avisaremos quando chegarem.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !accept.isPending) setSelected(null);
        }}
        title="Aprovar esta cotação?"
        description={
          selected
            ? `Ao confirmar, ${selected.pharmacy?.name || 'a farmácia'} recebe seu pedido e inicia a manipulação. As outras cotações desta receita serão recusadas automaticamente.`
            : undefined
        }
        confirmLabel="Confirmar pedido"
        loading={accept.isPending}
        onConfirm={() => selected && accept.mutate(selected.id)}
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-mint-wash/60 p-4">
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Farmácia</dt>
              <dd className="text-sm font-medium text-foreground">{selected.pharmacy?.name || 'Farmácia credenciada'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Valor total</dt>
              <dd className="num text-xl text-foreground">{formatQuotePrice(selected)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Prazo</dt>
              <dd className="num text-sm font-medium text-foreground">{deliveryLabel(selected.deliveryDays)}</dd>
            </div>
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}
