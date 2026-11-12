import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import ChangePasswordCard from '@/components/account/ChangePasswordCard';
import { useAuth } from '@/context/AuthContext';
import { patientApi } from '@/services/endpoints';
import { formatDateTime, formatRelative, initials } from '@/lib/format';

/** /admin/account — identidade do administrador logado + troca de senha */
export default function Account() {
  const { currentUser } = useAuth();
  // GET /users/me também atende ADMIN; mesma chave usada pela área do paciente
  const me = useQuery({ queryKey: ['patientMe'], queryFn: patientApi.me, retry: 0 });
  const profile = { ...currentUser, ...(me.data || {}) };

  return (
    <>
      <PageHeader eyebrow="Conta" title="Minha conta" description="Seus dados de acesso como administrador e a troca de senha." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" /> Identidade
            </CardTitle>
            <CardDescription>O nome e o e-mail são definidos no cadastro do administrador e não podem ser alterados por aqui.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-lg font-semibold text-primary">
                {initials(profile.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-heading text-lg font-semibold text-foreground">{profile.name || 'Administrador'}</p>
                <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <StatusBadge kind="role" status={profile.role || 'ADMIN'} dot={false} />
                  {profile.status && <StatusBadge kind="account" status={profile.status} />}
                </div>
              </div>
            </div>
            <KeyValueList>
              <KeyValue label="E-mail">
                <span className="flex flex-wrap items-center gap-2">
                  {profile.email || '—'}
                  {me.data && (profile.emailVerified ? <StatusBadge tone="success" dot={false}>Verificado</StatusBadge> : <StatusBadge tone="neutral" dot={false}>Não verificado</StatusBadge>)}
                </span>
              </KeyValue>
              <KeyValue label="Último acesso">
                {profile.lastLoginAt ? `${formatDateTime(profile.lastLoginAt)} (${formatRelative(profile.lastLoginAt)})` : '—'}
              </KeyValue>
              <KeyValue label="Conta criada em">{profile.createdAt ? formatDateTime(profile.createdAt) : '—'}</KeyValue>
            </KeyValueList>
            {me.isError && <p className="text-xs text-muted-foreground">Não foi possível carregar todos os dados da conta agora. Os dados básicos da sessão estão acima.</p>}
            <p className="flex items-start gap-2.5 rounded-xl border border-border bg-mint-wash px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
              <ScrollText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Tudo o que você consulta ou altera na gestão fica na{' '}
                <Link to={currentUser?.id ? `/admin/audit?actorId=${currentUser.id}` : '/admin/audit'} className="font-medium text-primary underline-offset-4 hover:underline">
                  trilha de auditoria
                </Link>
                , inclusive trocas de senha.
              </span>
            </p>
          </CardContent>
        </Card>
        <ChangePasswordCard />
      </div>
    </>
  );
}
