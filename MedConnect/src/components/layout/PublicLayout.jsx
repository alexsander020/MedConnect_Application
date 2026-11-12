import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, FileUp, LayoutDashboard, Mail, ShieldCheck } from 'lucide-react';
import { cn } from 'cn';
import Logo from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import { useAuth, homeFor } from '@/context/AuthContext';
import { publicApi } from '@/services/endpoints';
import { computeOpenStatus } from '@/lib/business-hours';

export const PUBLIC_NAV = [
  { to: '/#como-funciona', label: 'Como funciona' },
  { to: '/pharmacies', label: 'Farmácias' },
  { to: '/#para-farmacias', label: 'Para farmácias' },
  { to: '/help', label: 'Ajuda' },
];

/**
 * Quantas farmácias credenciadas estão abertas agora — alimenta a pílula do navbar.
 * Recalculado no cliente a cada minuto a partir dos horários públicos.
 */
export function useOpenPharmacies() {
  const query = useQuery({
    queryKey: ['publicPharmacies', 'navbar'],
    queryFn: () => publicApi.pharmacies(),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const list = query.data?.data || [];
  const openNow = list.filter((p) => computeOpenStatus(p.businessHours, p.timezone, now).isOpen).length;
  return { ...query, total: list.length, openNow };
}

function NetworkStatusPill({ className }) {
  const { isSuccess, total, openNow } = useOpenPharmacies();
  if (!isSuccess || total === 0) return null;
  const label =
    openNow > 0
      ? `${openNow} ${openNow === 1 ? 'farmácia aberta' : 'farmácias abertas'} agora`
      : 'Farmácias fechadas agora';
  return <OpenStatusPill className={className} size="sm" label={label} tone={openNow > 0 ? 'open' : 'closed'} />;
}

function scrollToHash(hash) {
  if (!hash) return;
  const el = document.getElementById(hash.replace('#', ''));
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function NavItem({ item, onNavigate, className }) {
  const location = useLocation();
  const isHash = item.to.includes('#');
  if (isHash) {
    const [path, hash] = item.to.split('#');
    return (
      <Link
        to={item.to}
        onClick={() => {
          onNavigate?.();
          if (location.pathname === (path || '/')) setTimeout(() => scrollToHash(hash), 0);
        }}
        className={cn('whitespace-nowrap rounded-md px-3 py-2 text-[0.9375rem] font-medium text-muted-foreground transition-colors hover:text-foreground', className)}
      >
        {item.label}
      </Link>
    );
  }
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'whitespace-nowrap rounded-md px-3 py-2 text-[0.9375rem] font-medium transition-colors hover:text-foreground',
          isActive ? 'text-foreground' : 'text-muted-foreground',
          className
        )
      }
    >
      {item.label}
    </NavLink>
  );
}

export function SiteNavbar() {
  const { isAuthenticated, userType } = useAuth();
  const [open, setOpen] = useState(false);
  const ctaTo = isAuthenticated ? (userType === 'PATIENT' ? '/new-quote' : homeFor(userType)) : '/register';
  const ctaLabel = isAuthenticated && userType !== 'PATIENT' ? 'Abrir painel' : 'Enviar receita';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="container-page flex h-[74px] items-center gap-4">
        <div className="flex shrink-0 flex-col justify-center">
          <Link to="/" aria-label="MedConnect — página inicial" className="rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Logo markClassName="size-8" />
          </Link>
          {/* Mobile: pílula de status logo abaixo da marca */}
          <NetworkStatusPill className="mt-0.5 h-4 border-0 bg-transparent px-0 text-[0.6875rem] 2xl:hidden" />
        </div>

        <nav aria-label="Principal" className="mx-auto hidden min-w-0 items-center gap-0.5 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
          <NetworkStatusPill className="hidden 2xl:inline-flex" />
          {isAuthenticated ? (
            <Button asChild variant="ghost">
              <Link to={homeFor(userType)}>
                <LayoutDashboard aria-hidden="true" /> Meu painel
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <Link to="/login">Entrar</Link>
            </Button>
          )}
          <Button asChild>
            <Link to={ctaTo}>
              <FileUp aria-hidden="true" /> {ctaLabel}
            </Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[86vw] max-w-sm p-0">
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle asChild>
                <span><Logo markClassName="size-8" /></span>
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Principal (celular)" className="flex flex-col gap-1 p-3">
              {PUBLIC_NAV.map((item) => (
                <NavItem key={item.to} item={item} onNavigate={() => setOpen(false)} className="px-3 py-3 text-base" />
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
              {isAuthenticated ? (
                <Button asChild variant="outline" size="lg" onClick={() => setOpen(false)}>
                  <Link to={homeFor(userType)}>Meu painel</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="lg" onClick={() => setOpen(false)}>
                  <Link to="/login">Entrar</Link>
                </Button>
              )}
              <Button asChild size="lg" onClick={() => setOpen(false)}>
                <Link to={ctaTo}>{ctaLabel}</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: 'Pacientes',
    links: [
      { to: '/register', label: 'Criar conta' },
      { to: '/#como-funciona', label: 'Como funciona' },
      { to: '/pharmacies', label: 'Farmácias credenciadas' },
      { to: '/help', label: 'Perguntas frequentes' },
    ],
  },
  {
    title: 'Farmácias',
    links: [
      { to: '/register?type=pharmacy', label: 'Credenciar minha farmácia' },
      { to: '/pharmacy-terms', label: 'Termo de adesão' },
      { to: '/login?type=pharmacy', label: 'Acesso da farmácia' },
    ],
  },
  {
    title: 'Legal e privacidade',
    links: [
      { to: '/privacy', label: 'Política de Privacidade' },
      { to: '/terms', label: 'Termos de Uso' },
      { to: '/help?category=PRIVACY#contato', label: 'Direitos do titular (LGPD)' },
      { to: '/help?category=GENERAL#contato', label: 'Canal de reclamações' },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-slate-deep text-slate-deep-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div className="space-y-4">
          <Logo inverted showTagline />
          <p className="max-w-xs text-sm leading-relaxed text-slate-deep-foreground/80">
            Envie sua receita uma vez e receba cotações de farmácias de manipulação verificadas. Você compara, escolhe e acompanha até a entrega.
          </p>
          <p className="inline-flex items-center gap-2 text-xs text-slate-deep-foreground/70">
            <ShieldCheck className="size-4 text-[hsl(166_46%_62%)]" aria-hidden="true" />
            Receitas em armazenamento privado, com links temporários e cada acesso registrado.
          </p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="mb-4 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/90">{col.title}</h2>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-slate-deep-foreground/80 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-slate-deep-foreground/70 md:flex-row md:items-center md:justify-between">
          <p>© {year} MedConnect. A dispensação é feita pela farmácia responsável, sob supervisão do seu responsável técnico (CRF).</p>
          <p>
            <Mail className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden="true" />
            Encarregado de dados (LGPD): fale pelo{' '}
            <Link to="/help?category=PRIVACY#contato" className="underline underline-offset-2 hover:text-white">formulário de contato</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

/** CTA fixa no rodapé do celular */
export function MobileCtaBar() {
  const { isAuthenticated, userType } = useAuth();
  if (isAuthenticated && userType !== 'PATIENT') return null;
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur md:hidden">
      <Button asChild size="lg" className="w-full">
        <Link to={isAuthenticated ? '/new-quote' : '/register'}>
          <FileUp aria-hidden="true" /> Enviar receita e cotar
        </Link>
      </Button>
    </div>
  );
}

export default function PublicLayout({ showMobileCta = true }) {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (hash) setTimeout(() => scrollToHash(hash), 50);
    else window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Pular para o conteúdo
      </a>
      <SiteNavbar />
      <main id="conteudo" className={cn('flex-1', showMobileCta && 'pb-20 md:pb-0')}>
        <Outlet />
      </main>
      <SiteFooter />
      {showMobileCta && <MobileCtaBar />}
    </div>
  );
}
