import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CloudOff, MapPin, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import { FadeUp, Stagger, StaggerItem } from '@/components/motion';
import { useOpenPharmacies } from '@/components/layout/PublicLayout';
import { computeOpenStatus } from '@/lib/business-hours';
import PharmacyHours from './PharmacyHours';
import RatingSummary from './RatingSummary';
import { formatLocation, pharmacyList } from './pharmacy-utils';

const MAX_ROWS = 6;
const COLUMNS = ['Farmácia', 'Cidade/UF', 'Área de entrega', 'Agora', 'Avaliação'];

/** Painel para lista vazia ou indisponível — com "linhas fantasma" para não parecer uma quebra */
function DirectoryNotice({ icon: Icon, title, description, children }) {
  return (
    <div role="status" className="relative overflow-hidden rounded-2xl border border-border bg-background">
      <div aria-hidden="true" className="hidden grid-cols-[1.4fr_1fr_1.2fr_1fr_1fr] gap-4 border-b border-border bg-muted/50 px-6 py-3 md:grid">
        {COLUMNS.map((c) => (
          <span key={c} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            {c}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-12 hidden flex-col md:flex">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid flex-1 grid-cols-[1.4fr_1fr_1.2fr_1fr_1fr] items-center gap-4 border-b border-border/60 px-6 opacity-40 last:border-0">
            <span className="h-3 w-2/3 rounded-full bg-muted" />
            <span className="h-3 w-1/2 rounded-full bg-muted" />
            <span className="h-3 w-3/4 rounded-full bg-muted" />
            <span className="h-5 w-20 rounded-full bg-muted" />
            <span className="h-3 w-16 rounded-full bg-muted" />
          </div>
        ))}
      </div>
      <div className="relative flex flex-col items-center px-6 py-12 text-center md:py-16">
        <div className="absolute inset-0 hidden bg-[radial-gradient(closest-side,var(--background)_55%,transparent)] md:block" aria-hidden="true" />
        <span className="relative mb-4 inline-flex size-12 items-center justify-center rounded-full bg-accent text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="relative font-heading text-lg font-semibold text-foreground">{title}</h3>
        <p className="relative mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
        {children && <div className="relative mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div data-testid="loading-state" aria-busy="true" className="overflow-hidden rounded-2xl border border-border bg-background">
      <span className="sr-only">Carregando farmácias credenciadas…</span>
      <Skeleton className="h-11 rounded-none" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-t border-border px-6 py-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="hidden h-4 w-1/5 md:block" />
          <Skeleton className="ml-auto h-6 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Seção da landing: farmácias credenciadas reais (GET /pharmacies/public) com status ao vivo */
export default function CredentialedPharmacies() {
  const { data, isPending, isError, refetch, isFetching, total, openNow } = useOpenPharmacies();

  // Abertas primeiro (ordem calculada uma vez por carga; as pílulas seguem vivas)
  const rows = useMemo(() => {
    const now = new Date();
    return pharmacyList(data)
      .map((p) => ({ p, open: computeOpenStatus(p.businessHours, p.timezone, now).isOpen }))
      .sort((a, b) => Number(b.open) - Number(a.open) || a.p.name.localeCompare(b.p.name, 'pt-BR'))
      .slice(0, MAX_ROWS)
      .map(({ p }) => p);
  }, [data]);

  return (
    <section aria-labelledby="credenciadas-titulo" className="bg-mint-wash">
      <div className="container-page py-16 md:py-20 lg:py-24">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <FadeUp inView className="max-w-2xl">
            <p className="eyebrow mb-4">Rede credenciada</p>
            <h2 id="credenciadas-titulo" className="text-section text-foreground">
              Farmácias credenciadas
            </h2>
            <p className="text-lead mt-4 text-muted-foreground">
              Todas passaram pela verificação de documentos da MedConnect. O status de funcionamento é calculado ao vivo, com os horários e o fuso de cada farmácia.
            </p>
          </FadeUp>
          {total > 0 && (
            <FadeUp inView delay={0.08} className="flex shrink-0 flex-col items-start gap-3 md:items-end">
              <p className="text-sm text-muted-foreground">
                <span className="num text-foreground">{openNow}</span> {openNow === 1 ? 'aberta' : 'abertas'} agora ·{' '}
                <span className="num text-foreground">{total}</span> {total === 1 ? 'credenciada' : 'credenciadas'}
              </p>
              <Button asChild variant="outline">
                <Link to="/pharmacies">
                  Ver todas as farmácias <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </FadeUp>
          )}
        </div>

        <div className="mt-10">
          {isPending ? (
            <TableSkeleton />
          ) : isError ? (
            <DirectoryNotice
              icon={CloudOff}
              title="A lista de farmácias não carregou agora"
              description="Isso costuma se resolver em instantes. Tente de novo ou abra o diretório completo."
            >
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw aria-hidden="true" className={isFetching ? 'animate-spin' : undefined} /> Tentar novamente
              </Button>
              <Button asChild variant="ghost">
                <Link to="/pharmacies">Abrir diretório</Link>
              </Button>
            </DirectoryNotice>
          ) : rows.length === 0 ? (
            <DirectoryNotice
              icon={Building2}
              title="Novas farmácias estão em credenciamento"
              description="Estamos verificando os documentos das primeiras farmácias. Elas aparecem aqui assim que o credenciamento é aprovado."
            >
              <Button asChild variant="outline">
                <Link to="/register?type=pharmacy">Credenciar minha farmácia</Link>
              </Button>
            </DirectoryNotice>
          ) : (
            <>
              {/* Desktop/tablet: tabela */}
              <div className="hidden overflow-hidden rounded-2xl border border-border bg-background md:block">
                <table className="w-full text-sm">
                  <caption className="sr-only">Farmácias credenciadas, com cidade, área de entrega, status de funcionamento e avaliação</caption>
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      {COLUMNS.map((c) => (
                        <th key={c} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground first:pl-6">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <Stagger as="tbody" step={0.04}>
                    {rows.map((p) => (
                      <StaggerItem as="tr" y={8} key={p.id} className="border-b border-border align-top last:border-0">
                        <th scope="row" className="py-4 pl-6 pr-5 text-left font-medium text-foreground">
                          {p.name}
                        </th>
                        <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{formatLocation(p)}</td>
                        <td className="max-w-[16rem] px-5 py-4 text-muted-foreground">
                          <span className="line-clamp-2">{p.deliveryArea || 'Informada na cotação'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <OpenStatusPill hours={p.businessHours} timezone={p.timezone} size="sm" />
                          {p.businessHours?.length > 0 && (
                            <div className="mt-1">
                              <PharmacyHours name={p.name} hours={p.businessHours} timezone={p.timezone} size="xs" className="-ml-1.5 h-7 px-1.5 text-xs" />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <RatingSummary averageRating={p.averageRating} reviewsCount={p.reviewsCount} compact />
                        </td>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </table>
              </div>

              {/* Celular: cards empilhados */}
              <Stagger as="ul" step={0.04} className="grid gap-3 md:hidden">
                {rows.map((p) => (
                  <StaggerItem as="li" y={8} key={p.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-heading text-base font-semibold text-foreground">{p.name}</h3>
                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" aria-hidden="true" /> {formatLocation(p)}
                        </p>
                      </div>
                    </div>
                    <OpenStatusPill hours={p.businessHours} timezone={p.timezone} size="sm" className="mt-3" />
                    <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                      <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="line-clamp-2">{p.deliveryArea || 'Área de entrega informada na cotação'}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <RatingSummary averageRating={p.averageRating} reviewsCount={p.reviewsCount} compact />
                      {p.businessHours?.length > 0 && (
                        <PharmacyHours name={p.name} hours={p.businessHours} timezone={p.timezone} size="xs" className="ml-0 h-7 px-1.5 text-xs" />
                      )}
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
