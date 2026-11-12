import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, FileUp, Tags, Package, Bell, LifeBuoy, User, ShieldCheck, LayoutDashboard, Inbox, Star, Settings,
  Building2, Users, FileText, ScrollText, BarChart3, LogOut, ChevronsUpDown, ExternalLink, PawPrint,
} from 'lucide-react';
import { cn } from 'cn';
import Logo, { LogoMark } from '@/components/brand/Logo';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail,
  SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import NotificationsBell from '@/components/layout/NotificationsBell';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import { PageTransition } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { adminApi, notificationsApi, pharmacyApi } from '@/services/endpoints';
import { initials } from '@/lib/format';
import { roleLabels } from '@/constants/status';
import { usePublicConfig } from '@/hooks/usePublicConfig';

/**
 * Navegação por papel. `badge` é uma chave resolvida em useNavBadges; `flag` esconde o item quando a
 * funcionalidade está desligada (ex.: vertical veterinária com VET_ENABLED=false).
 */
export const NAV = {
  PATIENT: [
    {
      label: 'Minha saúde',
      items: [
        { to: '/dashboard', label: 'Início', icon: Home, end: true },
        { to: '/new-quote', label: 'Nova cotação', icon: FileUp },
        { to: '/my-pets', label: 'Meus pets', icon: PawPrint, flag: 'vetEnabled' },
        { to: '/quote-offers', label: 'Cotações recebidas', icon: Tags },
        { to: '/orders', label: 'Meus pedidos', icon: Package },
      ],
    },
    {
      label: 'Conta',
      items: [
        { to: '/notifications', label: 'Notificações', icon: Bell, badge: 'notifications' },
        { to: '/support', label: 'Atendimento', icon: LifeBuoy },
        { to: '/profile', label: 'Meus dados', icon: User },
        { to: '/privacy-center', label: 'Privacidade e dados', icon: ShieldCheck },
      ],
    },
  ],
  PHARMACY: [
    {
      label: 'Operação',
      items: [
        { to: '/pharmacy', label: 'Visão geral', icon: LayoutDashboard, end: true },
        { to: '/pharmacy/requests', label: 'Solicitações', icon: Inbox },
        { to: '/pharmacy/orders', label: 'Pedidos', icon: Package },
        { to: '/pharmacy/reviews', label: 'Avaliações', icon: Star },
        { to: '/pharmacy/veterinary-capability', label: 'Habilitação veterinária', icon: PawPrint, flag: 'vetEnabled' },
      ],
    },
    {
      label: 'Farmácia',
      items: [
        { to: '/pharmacy/notifications', label: 'Notificações', icon: Bell, badge: 'notifications' },
        { to: '/pharmacy/support', label: 'Atendimento', icon: LifeBuoy },
        { to: '/pharmacy/settings', label: 'Configurações', icon: Settings },
      ],
    },
  ],
  ADMIN: [
    {
      label: 'Gestão',
      items: [
        { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
        { to: '/admin/pharmacies', label: 'Farmácias', icon: Building2, badge: 'pendingPharmacies' },
        { to: '/admin/users', label: 'Usuários', icon: Users },
        { to: '/admin/orders', label: 'Pedidos', icon: Package },
        { to: '/admin/prescriptions', label: 'Receitas', icon: FileText },
      ],
    },
    {
      label: 'Conformidade',
      items: [
        { to: '/admin/support', label: 'Atendimento', icon: LifeBuoy, badge: 'openTickets' },
        { to: '/admin/audit', label: 'Trilha de auditoria', icon: ScrollText },
        { to: '/admin/metrics', label: 'Métricas do piloto', icon: BarChart3 },
        { to: '/admin/account', label: 'Minha conta', icon: User },
      ],
    },
  ],
};

const ACCOUNT_HREF = { PATIENT: '/profile', PHARMACY: '/pharmacy/settings', ADMIN: '/admin/account' };
const NOTIFICATIONS_HREF = { PATIENT: '/notifications', PHARMACY: '/pharmacy/notifications', ADMIN: '/admin' };

function useNavBadges(role) {
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list, enabled: role !== 'ADMIN', staleTime: 60_000 });
  const overview = useQuery({ queryKey: ['adminOverview'], queryFn: adminApi.overview, enabled: role === 'ADMIN', staleTime: 60_000 });
  const unread = Array.isArray(notifications.data) ? notifications.data.filter((n) => !n.read).length : 0;
  return {
    notifications: unread,
    pendingPharmacies: overview.data?.pharmacies?.pending || 0,
    openTickets: (overview.data?.support?.open || 0),
  };
}

function SidebarNav({ role }) {
  const badges = useNavBadges(role);
  const flags = usePublicConfig();
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  return (
    <>
      {NAV[role].map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]">{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.filter((item) => !item.flag || flags[item.flag]).map((item) => {
                const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="h-10 text-[0.9375rem]">
                      <NavLink to={item.to} end={item.end} onClick={() => isMobile && setOpenMobile(false)}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {count > 0 && (
                      <SidebarMenuBadge className="num rounded-full bg-coral px-1.5 text-[0.6875rem] text-white peer-data-[active=true]/menu-button:text-white">
                        {count > 99 ? '99+' : count}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function UserMenu({ role, compact = false }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const name = currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuário';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            compact ? 'p-1' : 'w-full p-2'
          )}
          aria-label="Menu da conta"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
          </Avatar>
          {!compact && (
            <>
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-medium">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{roleLabels[role]?.label}</span>
              </span>
              <ChevronsUpDown className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={compact ? 'bottom' : 'top'} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{currentUser?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(ACCOUNT_HREF[role])}>
          <User aria-hidden="true" /> {role === 'PHARMACY' ? 'Configurações da farmácia' : 'Minha conta'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/help')}>
          <LifeBuoy aria-hidden="true" /> Central de ajuda
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/')}>
          <ExternalLink aria-hidden="true" /> Ir para o site
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          <LogOut aria-hidden="true" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Pílula "Aberta até…" da própria farmácia no topo do painel */
function PharmacyOpenPill() {
  const { data } = useQuery({ queryKey: ['pharmacyMe'], queryFn: pharmacyApi.me, staleTime: 5 * 60_000, retry: 0 });
  if (!data) return null;
  return (
    <Link to="/pharmacy/settings?tab=hours" className="hidden rounded-full sm:inline-flex" title="Editar horário de funcionamento">
      <OpenStatusPill hours={data.businessHours} timezone={data.timezone} size="sm" />
    </Link>
  );
}

const PATIENT_MOBILE_NAV = [
  { to: '/dashboard', label: 'Início', icon: Home, end: true },
  { to: '/new-quote', label: 'Cotar', icon: FileUp },
  { to: '/orders', label: 'Pedidos', icon: Package },
  { to: '/notifications', label: 'Avisos', icon: Bell },
  { to: '/profile', label: 'Conta', icon: User },
];

function PatientBottomNav() {
  return (
    <nav aria-label="Navegação inferior" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pt-1.5 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {PATIENT_MOBILE_NAV.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.6875rem] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="size-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Casca das áreas logadas (paciente, farmácia, admin):
 * sidebar recolhível (Sheet no celular), topo com notificações e menu da conta, transição de página.
 */
export default function AppShell({ role }) {
  const location = useLocation();
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
          <Link to={NAV[role][0].items[0].to} className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Início do painel">
            <span className="group-data-[collapsible=icon]:hidden"><Logo markClassName="size-8" /></span>
            <LogoMark className="hidden size-8 group-data-[collapsible=icon]:block" />
          </Link>
        </SidebarHeader>
        <SidebarContent className="py-2">
          <SidebarNav role={role} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <UserMenu role={role} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[hsl(170_25%_98.5%)]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:h-5" />
          <span className="font-heading text-sm font-medium text-muted-foreground">
            {role === 'PATIENT' ? 'Área do paciente' : role === 'PHARMACY' ? 'Painel da farmácia' : 'Administração'}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {role === 'PHARMACY' && <PharmacyOpenPill />}
            {role === 'PATIENT' && (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/new-quote"><FileUp aria-hidden="true" /> Nova cotação</Link>
              </Button>
            )}
            {role !== 'ADMIN' && <NotificationsBell allHref={NOTIFICATIONS_HREF[role]} />}
            <div className="md:hidden"><UserMenu role={role} compact /></div>
          </div>
        </header>
        <main id="conteudo" className={cn('mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 py-6 md:px-8 md:py-8', role === 'PATIENT' && 'pb-24 md:pb-8')}>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </SidebarInset>
      {role === 'PATIENT' && <PatientBottomNav />}
    </SidebarProvider>
  );
}
