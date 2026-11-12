import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Contact, FileCheck2, MailCheck, MailWarning, ShieldCheck, UserX, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import SearchField from '@/components/shared/SearchField';
import DataPagination from '@/components/shared/DataPagination';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { adminApi } from '@/services/endpoints';
import { accountStatuses, consentTypeLabels, roleLabels } from '@/constants/status';
import { formatDate, formatDateTime, formatNumber, formatPhone, formatRelative } from '@/lib/format';
import AdminTable from './components/AdminTable';
import DetailSheet, { AuditNotice, MiniStat, SheetSection } from './components/DetailSheet';
import AccountStatusControl from './components/AccountStatusControl';
import { FilterBar, FilterSelect } from './components/FilterBar';
import ListState from './components/ListState';
import { Num, TwoLine } from './components/cells';
import { countActive, useSticky, useUrlFilters } from './components/useUrlFilters';
import { accountStatusErrorMessage } from './components/labels';

const DEFAULTS = { search: '', role: 'ALL', status: 'ALL', page: 1, id: '' };
const FILTER_KEYS = ['search', 'role', 'status'];
// A rota /admin/users lista pacientes e administradores (farmácias têm tela própria)
const ROLE_OPTIONS = [
  { value: 'PATIENT', label: roleLabels.PATIENT.label },
  { value: 'ADMIN', label: roleLabels.ADMIN.label },
];
const STATUS_OPTIONS = Object.entries(accountStatuses).map(([value, e]) => ({ value, label: e.label }));

/** Motivo pelo qual a suspensão está bloqueada (o backend aplica as mesmas regras) */
function suspendBlockedReason(user, currentUserId) {
  if (!user) return null;
  if (user.id === currentUserId) return 'Esta é a sua conta: um administrador não pode suspender a si mesmo.';
  if (user.role === 'ADMIN') return 'Contas de administrador não podem ser suspensas por outro administrador. Fale com o responsável pela plataforma.';
  return null;
}

/** /admin/users — pacientes e administradores */
export default function Users() {
  const { values, setFilter, setPage, setParam, clear } = useUrlFilters(DEFAULTS);
  const params = { search: values.search, role: values.role, status: values.status, page: values.page };
  const list = useQuery({
    queryKey: ['adminUsers', params],
    queryFn: () => adminApi.users(params),
    placeholderData: (prev) => prev,
  });
  const rows = list.data?.data || [];
  const activeId = useSticky(values.id);
  const active = countActive(values, DEFAULTS, FILTER_KEYS);

  const columns = [
    {
      key: 'name',
      header: 'Usuário',
      primary: true,
      className: 'max-w-[280px]',
      cell: (u) => <TwoLine title={u.isAnonymized ? 'Conta anonimizada' : u.name} subtitle={u.isAnonymized ? 'Dados removidos a pedido do titular' : u.email} />,
    },
    { key: 'role', header: 'Papel', cell: (u) => <StatusBadge kind="role" status={u.role} dot={false} /> },
    { key: 'status', header: 'Conta', cell: (u) => <StatusBadge kind="account" status={u.status} /> },
    { key: 'cpf', header: 'CPF', cell: (u) => <Num>{u.cpf || '—'}</Num>, className: 'whitespace-nowrap' },
    {
      key: 'email',
      header: 'E-mail',
      mobile: false,
      cell: (u) =>
        u.emailVerified ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-success"><MailCheck className="size-3.5" aria-hidden="true" /> Verificado</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><MailWarning className="size-3.5" aria-hidden="true" /> Não verificado</span>
        ),
    },
    {
      key: 'counts',
      header: 'Receitas',
      cell: (u) => <span className="num text-[0.8125rem]">{formatNumber(u.counts?.prescriptions ?? 0)}</span>,
    },
    {
      key: 'lastLoginAt',
      header: 'Último acesso',
      cell: (u) => <span className="whitespace-nowrap text-muted-foreground">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Nunca'}</span>,
    },
    { key: 'createdAt', header: 'Cadastro', mobile: false, cell: (u) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Usuários"
        description="Pacientes e administradores da plataforma. A listagem mostra só o necessário; telefone, endereço e consentimentos ficam no detalhe, com leitura registrada."
      />
      <FilterBar activeCount={active} onClear={() => clear(FILTER_KEYS)}>
        <SearchField
          value={values.search}
          onChange={(v) => setFilter('search', v)}
          label="Buscar usuários por nome ou e-mail"
          placeholder="Nome ou e-mail"
          className="md:w-[280px] md:max-w-none"
        />
        <FilterSelect label="Filtrar por papel" value={values.role} onChange={(v) => setFilter('role', v)} options={ROLE_OPTIONS} allLabel="Todos os papéis" />
        <FilterSelect label="Filtrar por status da conta" value={values.status} onChange={(v) => setFilter('status', v)} options={STATUS_OPTIONS} allLabel="Todas as contas" />
      </FilterBar>

      <ListState
        isLoading={list.isLoading}
        isError={list.isError && !list.data}
        onRetry={list.refetch}
        errorTitle="Erro ao carregar usuários"
        isEmpty={rows.length === 0}
        emptyIcon={UsersIcon}
        emptyTitle={active ? 'Nenhum usuário com esses filtros' : 'Nenhum usuário cadastrado'}
        emptyDescription={active ? 'Ajuste a busca ou limpe os filtros para ver mais resultados.' : 'Os pacientes aparecem aqui assim que criarem a conta.'}
        emptyAction={active ? <Button variant="outline" onClick={() => clear(FILTER_KEYS)}>Limpar filtros</Button> : null}
      >
        <AdminTable
          caption="Usuários da plataforma"
          columns={columns}
          rows={rows}
          busy={list.isFetching && list.isPlaceholderData}
          onRowClick={(u) => setParam('id', u.id)}
          rowLabel={(u) => (u.isAnonymized ? 'conta anonimizada' : u.name)}
        />
        <DataPagination page={list.data?.page} totalPages={list.data?.totalPages} total={list.data?.total} onPageChange={setPage} />
      </ListState>

      <UserDetailSheet
        userId={activeId}
        summary={rows.find((r) => r.id === activeId)}
        open={Boolean(values.id)}
        onOpenChange={(open) => !open && setParam('id', '')}
      />
    </>
  );
}

function UserDetailSheet({ userId, summary, open, onOpenChange }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ['adminUser', userId],
    queryFn: () => adminApi.user(userId),
    enabled: Boolean(userId),
    // Cada leitura gera um registro ADMIN_VIEW_USER na trilha: sem releituras automáticas
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
  const u = detail.data;
  const base = u || summary || {};

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }) => adminApi.setUserStatus(userId, status, reason),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminUser', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminAuditLogs'] });
      toast.success(
        status === 'SUSPENDED' ? 'A conta foi suspensa. As sessões abertas expiram em até 15 minutos.' : 'A conta foi reativada.',
        status === 'SUSPENDED' ? 'Usuário suspenso' : 'Usuário reativado'
      );
    },
    onError: (err) => toast.error(accountStatusErrorMessage(err)),
  });

  const consents = u?.consents || [];
  const name = base.isAnonymized ? 'Conta anonimizada' : base.name;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={name || 'Usuário'}
      description={base.isAnonymized ? 'Dados pessoais removidos a pedido do titular (LGPD)' : base.email}
      badges={
        base.id && (
          <>
            {base.role && <StatusBadge kind="role" status={base.role} dot={false} />}
            {base.status && <StatusBadge kind="account" status={base.status} />}
            {base.id === currentUser?.id && <StatusBadge tone="info" dot={false}>Você</StatusBadge>}
          </>
        )
      }
      isLoading={detail.isLoading}
      isError={detail.isError}
      onRetry={detail.refetch}
      errorTitle="Não foi possível carregar os dados do usuário"
      footer={
        u && (
          <AccountStatusControl
            status={u.status}
            subjectName={name}
            subjectKind="conta"
            blockedReason={suspendBlockedReason(u, currentUser?.id)}
            loading={statusMutation.isPending}
            onSubmit={(vars) => statusMutation.mutateAsync(vars)}
          />
        )
      }
    >
      {u && (
        <>
          <AuditNotice>
            Abrir este detalhe ficou registrado na trilha de auditoria, com data, IP e motivo de acesso.{' '}
            <Link to={`/admin/audit?resource=User&resourceId=${u.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
              Ver registros desta conta
            </Link>
          </AuditNotice>

          {u.status === 'SUSPENDED' && (
            <div role="status" className="flex gap-3 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3.5 text-sm">
              <Ban className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">Conta suspensa{u.suspendedAt ? ` em ${formatDateTime(u.suspendedAt)}` : ''}</p>
                <p className="mt-0.5 break-words text-muted-foreground">Motivo: {u.suspensionReason || 'não informado'}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <MiniStat label="Receitas" value={formatNumber(u.counts?.prescriptions ?? 0)} />
            <MiniStat label="Avaliações" value={formatNumber(u.counts?.reviews ?? 0)} />
            <MiniStat label="Último acesso" value={u.lastLoginAt ? formatDate(u.lastLoginAt, { day: '2-digit', month: 'short' }) : '—'} hint={u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Nunca entrou'} />
          </div>

          <SheetSection title="Dados de contato" icon={Contact}>
            <KeyValueList>
              <KeyValue label="E-mail">
                <span className="flex flex-wrap items-center gap-2">
                  {u.email}
                  {u.emailVerified ? <StatusBadge tone="success" dot={false}>Verificado</StatusBadge> : <StatusBadge tone="neutral" dot={false}>Não verificado</StatusBadge>}
                </span>
              </KeyValue>
              <KeyValue label="CPF"><span className="num">{u.cpf || '—'}</span></KeyValue>
              <KeyValue label="Telefone"><span className="num">{u.phone ? formatPhone(u.phone) : '—'}</span></KeyValue>
              <KeyValue label="Endereço">{u.address || '—'}</KeyValue>
              <KeyValue label="Cadastro em">{formatDateTime(u.createdAt)}</KeyValue>
            </KeyValueList>
            <p className="text-xs text-muted-foreground">O CPF é exibido mascarado; o número completo não sai do servidor.</p>
          </SheetSection>

          <SheetSection title="Consentimentos (LGPD)" icon={FileCheck2}>
            {consents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">Nenhum consentimento registrado para esta conta.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {consents.map((c, i) => (
                  <li key={`${c.consentType}-${c.consentedAt}-${i}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{consentTypeLabels[c.consentType] || c.consentType}</p>
                      <p className="text-xs text-muted-foreground">
                        Versão <span className="num">{c.textVersion}</span> · aceito em {formatDateTime(c.consentedAt)}
                        {c.revokedAt && <> · revogado em {formatDateTime(c.revokedAt)}</>}
                      </p>
                    </div>
                    {c.revokedAt ? (
                      <StatusBadge tone="neutral" className="self-start"><UserX className="size-3" aria-hidden="true" /> Revogado</StatusBadge>
                    ) : (
                      <StatusBadge tone="success" className="self-start" dot={false}><CheckCircle2 className="size-3" aria-hidden="true" /> Ativo</StatusBadge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SheetSection>

          {u.role === 'ADMIN' && (
            <p className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Administradores têm acesso à gestão completa. Toda ação desta conta também fica na trilha de auditoria.
            </p>
          )}
        </>
      )}
    </DetailSheet>
  );
}
