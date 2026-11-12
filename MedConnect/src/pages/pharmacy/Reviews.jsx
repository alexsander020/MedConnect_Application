import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { MessageSquareText, Star, X } from 'lucide-react';
import { cn } from 'cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import StarRating from '@/components/StarRating';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { EASE_OUT, Stagger, StaggerItem } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { pharmacyApi } from '@/services/endpoints';
import { formatDate, initials } from '@/lib/format';

const fmtAvg = (n) => n.toFixed(1).replace('.', ',');

function Summary({ reviews, filter, onFilter }) {
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((stars) => {
    const n = reviews.filter((r) => r.rating === stars).length;
    return { stars, n, pct: count ? n / count : 0 };
  });
  const withComment = reviews.filter((r) => r.comment?.trim()).length;

  return (
    <Card className="mb-6 rounded-2xl">
      <CardContent className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <p className="text-sm font-medium text-muted-foreground">Nota média</p>
          <p className="num mt-1 text-[3.5rem] leading-none tracking-tight text-foreground">{count ? fmtAvg(avg) : '—'}</p>
          <StarRating rating={avg} size={20} className="mt-3" label="Nota média" />
          <p className="mt-2 text-sm text-muted-foreground">
            {count ? `${count} ${count === 1 ? 'avaliação' : 'avaliações'} · ${withComment} com comentário` : 'Nenhuma avaliação ainda'}
          </p>
        </div>
        <div>
          <p id="dist-label" className="mb-3 text-sm font-medium text-foreground">Distribuição das notas</p>
          <ul aria-labelledby="dist-label" className="space-y-1.5">
            {dist.map(({ stars, n, pct }, i) => {
              const active = filter === stars;
              return (
                <li key={stars}>
                  <button
                    type="button"
                    onClick={() => onFilter(active ? null : stars)}
                    aria-pressed={active}
                    disabled={n === 0}
                    aria-label={`${stars} ${stars === 1 ? 'estrela' : 'estrelas'}: ${n} ${n === 1 ? 'avaliação' : 'avaliações'}${n ? (active ? '. Remover filtro' : '. Filtrar') : ''}`}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
                      active ? 'bg-accent' : 'enabled:hover:bg-muted'
                    )}
                  >
                    <span className="num inline-flex w-8 shrink-0 items-center gap-1 text-sm text-foreground">
                      {stars}
                      <Star className="size-3.5 fill-amber text-amber" aria-hidden="true" />
                    </span>
                    <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <motion.span
                        className="absolute inset-0 rounded-full bg-amber"
                        style={{ originX: 0 }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: pct }}
                        transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: EASE_OUT }}
                      />
                    </span>
                    <span className="num w-14 shrink-0 text-right text-xs text-muted-foreground">
                      {n} <span className="font-normal">({Math.round(pct * 100)}%)</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/** Avaliações recebidas (/pharmacy/reviews) — GET /reviews/pharmacy/:id (nome do paciente já abreviado pela API) */
export default function Reviews() {
  const { currentUser } = useAuth();
  const pharmacyId = currentUser?.id;
  const [filter, setFilter] = useState(null);
  const [onlyComments, setOnlyComments] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pharmacyReviews', pharmacyId],
    queryFn: () => pharmacyApi.reviews(pharmacyId),
    enabled: !!pharmacyId,
  });
  const reviews = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const list = reviews
    .filter((r) => !filter || r.rating === filter)
    .filter((r) => !onlyComments || r.comment?.trim());

  return (
    <>
      <PageHeader
        eyebrow="Reputação"
        title="Avaliações"
        description="O que os pacientes disseram depois de receber as fórmulas. A nota média aparece para quem compara cotações."
      />

      {isLoading ? (
        <>
          <Skeleton className="mb-6 h-[220px] rounded-2xl" />
          <LoadingState variant="list" rows={3} message="Carregando avaliações…" />
        </>
      ) : isError ? (
        <ErrorState title="Erro ao carregar avaliações" message="Não foi possível buscar as avaliações agora. Tente novamente." onRetry={refetch} />
      ) : (
        <>
          <Summary reviews={reviews} filter={filter} onFilter={setFilter} />

          {reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="Nenhuma avaliação recebida ainda"
              description="Depois que um pedido é entregue, o paciente pode dar uma nota de 1 a 5 e deixar um comentário."
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-medium text-foreground">
                  {filter ? `Avaliações com ${filter} ${filter === 1 ? 'estrela' : 'estrelas'}` : 'Todas as avaliações'}
                  <span className="num ml-2 text-sm font-normal text-muted-foreground">({list.length})</span>
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  {filter && (
                    <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>
                      <X aria-hidden="true" /> Limpar filtro
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch id="only-comments" checked={onlyComments} onCheckedChange={setOnlyComments} />
                    <Label htmlFor="only-comments" className="font-normal">Só com comentário</Label>
                  </div>
                </div>
              </div>

              {list.length === 0 ? (
                <EmptyState icon={Star} title="Nenhuma avaliação neste filtro" description="Ajuste os filtros para ver outras avaliações." />
              ) : (
                <Stagger key={`${filter}-${onlyComments}`} as="ul" step={0.05} inView={false} className="grid gap-4 md:grid-cols-2">
                  {list.map((r) => (
                    <StaggerItem as="li" key={r.id} y={12} className="min-w-0">
                      <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)]">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className="bg-accent text-xs font-semibold text-primary">{initials(r.patientName || 'Paciente')}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{r.patientName || 'Paciente'}</p>
                            <p className="text-xs text-muted-foreground">
                              <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
                            </p>
                          </div>
                          <StarRating rating={r.rating} size={14} />
                        </div>
                        {r.comment?.trim() ? (
                          <blockquote className="mt-4 whitespace-pre-line break-words text-[0.9375rem] leading-relaxed text-foreground/90">
                            “{r.comment.trim()}”
                          </blockquote>
                        ) : (
                          <p className="mt-4 text-sm italic text-muted-foreground">O paciente deixou só a nota, sem comentário.</p>
                        )}
                      </article>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
