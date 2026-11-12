import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, FileUp, FilterX, SearchX, ShieldCheck } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchField from '@/components/shared/SearchField';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { Stagger, StaggerItem } from '@/components/motion';
import { useOpenPharmacies } from '@/components/layout/PublicLayout';
import { useAuth } from '@/context/AuthContext';
import { publicApi } from '@/services/endpoints';
import PublicHero from './components/PublicHero';
import PharmacyCard from './components/PharmacyCard';
import { pharmacyList } from './components/pharmacy-utils';
import { usePageMeta } from '@/lib/seo';

const ALL_CITIES = 'ALL';

function DirectorySkeleton() {
  return (
    <div data-testid="loading-state" aria-busy="true" aria-live="polite" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Carregando farmácias credenciadas…</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border p-6">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
          <Skeleton className="mt-5 h-6 w-32 rounded-full" />
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-6 h-px w-full" />
          <Skeleton className="mt-4 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function NetworkSummary({ total, openNow }) {
  if (!total) return null;
  return (
    <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <p className="eyebrow mb-3">Agora na rede</p>
      <div className="flex items-end gap-6">
        <div>
          <p className="num text-4xl text-foreground">{openNow}</p>
          <p className="mt-1 text-sm text-muted-foreground">{openNow === 1 ? 'aberta agora' : 'abertas agora'}</p>
        </div>
        <div className="h-12 w-px bg-border" aria-hidden="true" />
        <div>
          <p className="num text-4xl text-foreground">{total}</p>
          <p className="mt-1 text-sm text-muted-foreground">{total === 1 ? 'farmácia credenciada' : 'farmácias credenciadas'}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Calculado com os horários informados por cada farmácia, no fuso dela. Atualiza a cada minuto.
      </p>
    </div>
  );
}

/** /pharmacies — diretório público de farmácias credenciadas (GET /pharmacies/public) */
export default function Pharmacies() {
  const { isAuthenticated, userType } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get('busca') || '';
  const city = params.get('cidade') || '';
  const openNow = params.get('abertas') === '1';
  const hasFilters = Boolean(search || city || openNow);

  usePageMeta({
    title: 'Farmácias credenciadas · MedConnect',
    description:
      'Conheça as farmácias de manipulação credenciadas na MedConnect, com horários e status de funcionamento ao vivo. Envie sua receita e receba cotações.',
  });

  const setFilter = useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );
  const onSearch = useCallback((v) => setFilter('busca', v), [setFilter]);

  const network = useOpenPharmacies();
  const cities = useMemo(() => {
    const set = new Map();
    pharmacyList(network.data).forEach((p) => {
      if (p.city) set.set(p.city, p.state ? `${p.city}, ${p.state}` : p.city);
    });
    return Array.from(set.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [network.data]);

  const query = useQuery({
    queryKey: ['publicPharmacies', 'directory', { search, city, openNow }],
    queryFn: () => publicApi.pharmacies({ search, city, openNow: openNow || undefined }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: 1,
  });
  const list = pharmacyList(query.data);
  const filterKey = `${search}|${city}|${openNow}`;

  const quoteTo = isAuthenticated && userType === 'PATIENT' ? '/new-quote' : '/register';

  return (
    <div>
      <PublicHero
        eyebrow="Diretório público"
        title="Farmácias credenciadas"
        lead="Toda farmácia desta lista passou pela verificação de documentos da MedConnect — licença sanitária, autorização de funcionamento e farmacêutico responsável com registro no CRF. Veja quem está aberto agora, onde entrega e como foi avaliada."
        aside={network.isSuccess ? <NetworkSummary total={network.total} openNow={network.openNow} /> : null}
      />

      <section aria-labelledby="diretorio-titulo" className="container-page py-10 md:py-14">
        <h2 id="diretorio-titulo" className="sr-only">
          Lista de farmácias
        </h2>

        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <SearchField
            value={search}
            onChange={onSearch}
            label="Buscar farmácia por nome ou região de entrega"
            placeholder="Buscar por nome ou região…"
            className="md:max-w-sm"
          />
          {cities.length > 1 && (
            <Select value={city || ALL_CITIES} onValueChange={(v) => setFilter('cidade', v === ALL_CITIES ? '' : v)}>
              <SelectTrigger aria-label="Filtrar por cidade" className="h-10 w-full md:w-56">
                <SelectValue placeholder="Todas as cidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CITIES}>Todas as cidades</SelectItem>
                {cities.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Toggle
            variant="outline"
            size="lg"
            pressed={openNow}
            onPressedChange={(v) => setFilter('abertas', v ? '1' : '')}
            className="h-10 justify-start gap-2 rounded-lg px-3.5 aria-pressed:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] aria-pressed:bg-accent aria-pressed:text-accent-foreground md:justify-center"
          >
            <span aria-hidden="true" className={cn('size-2 rounded-full', openNow ? 'bg-primary animate-pulse-soft' : 'bg-muted-foreground/40')} />
            Abertas agora
          </Toggle>
          {hasFilters && (
            <Button variant="ghost" onClick={() => setParams({}, { replace: true })} className="text-muted-foreground md:ml-1">
              <FilterX aria-hidden="true" /> Limpar filtros
            </Button>
          )}
          {query.isSuccess && (list.length > 0 || hasFilters) && (
            <p aria-live="polite" className="text-sm text-muted-foreground md:ml-auto">
              <span className="num text-foreground">{list.length}</span>{' '}
              {list.length === 1 ? 'farmácia' : 'farmácias'}
              {hasFilters ? (list.length === 1 ? ' encontrada' : ' encontradas') : ''}
            </p>
          )}
        </div>

        <div className={cn('mt-8 transition-opacity duration-200', query.isFetching && query.isPlaceholderData && 'opacity-60')}>
          {query.isPending ? (
            <DirectorySkeleton />
          ) : query.isError ? (
            <ErrorState
              title="Não foi possível carregar as farmácias"
              message="Verifique sua conexão e tente novamente em instantes."
              onRetry={() => query.refetch()}
            />
          ) : list.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Nenhuma farmácia com esses filtros"
                description={
                  openNow
                    ? 'Nenhuma farmácia credenciada está aberta neste momento. Você pode enviar a receita mesmo assim — as farmácias respondem dentro do horário delas.'
                    : 'Tente outro nome ou outra cidade.'
                }
                action={
                  <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                    <FilterX aria-hidden="true" /> Limpar filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Building2}
                title="Novas farmácias estão em credenciamento"
                description="Assim que uma farmácia concluir a verificação de documentos, ela aparece nesta lista."
                action={
                  <Button asChild variant="outline">
                    <Link to="/register?type=pharmacy">Credenciar minha farmácia</Link>
                  </Button>
                }
              />
            )
          ) : (
            <Stagger key={filterKey} step={0.06} inView={false} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <StaggerItem key={p.id} className="min-w-0">
                  <PharmacyCard pharmacy={p} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </section>

      <section aria-labelledby="contatos-titulo" className="border-t border-border bg-mint-wash">
        <div className="container-page flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-16">
          <div className="flex max-w-2xl gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="contatos-titulo" className="font-heading text-xl font-semibold text-foreground">
                Por que não mostramos telefone e endereço?
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
                Os contatos da farmácia aparecem nas cotações que você receber. Assim a receita, a cotação e o pedido ficam registrados num só lugar.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to={quoteTo}>
              <FileUp aria-hidden="true" /> Enviar receita e cotar
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
