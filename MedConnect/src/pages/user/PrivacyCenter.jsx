import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight, Ban, CheckCircle2, Download, FileCheck2, LifeBuoy, PencilLine, ScrollText, ShieldCheck, Trash2, UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { FadeUp, Stagger, StaggerItem } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { privacyApi } from '@/services/endpoints';
import { consentTypeLabels } from '@/constants/status';
import { formatDateTime } from '@/lib/format';
import DeleteAccountDialog from './components/DeleteAccountDialog';
import { asArray, friendlyError, localDateStamp } from './components/patient-utils';

/** Baixa um objeto como arquivo JSON */
function downloadJson(data, filename) {
  const json = JSON.stringify(data ?? {}, null, 2);
  const a = document.createElement('a');
  let objectUrl = null;
  if (typeof Blob !== 'undefined' && typeof URL.createObjectURL === 'function') {
    objectUrl = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
    a.href = objectUrl;
  } else {
    a.href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
  }
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

const RIGHTS = [
  { icon: FileCheck2, title: 'Acesso e portabilidade', text: 'Baixe uma cópia dos seus dados em formato aberto (JSON).' },
  { icon: PencilLine, title: 'Correção', text: 'Atualize nome, telefone e endereço em Meus dados.', to: '/profile' },
  { icon: Ban, title: 'Revogação do consentimento', text: 'Retire a autorização para tratarmos seus dados de saúde.' },
  { icon: UserX, title: 'Eliminação', text: 'Peça a exclusão da conta e a anonimização dos seus dados.' },
];

function ConsentList({ history }) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Nenhum consentimento registrado"
        description="Quando você autorizar o uso dos seus dados (por exemplo, ao enviar uma receita), o registro aparece aqui."
        className="py-8"
      />
    );
  }
  return (
    <Stagger as="ul" step={0.04} inView={false} className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {history.map((c) => (
        <StaggerItem as="li" key={c.id || `${c.consentType}-${c.consentedAt}`} y={8} className="flex flex-col gap-2 bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{consentTypeLabels[c.consentType] || c.consentType}</p>
            <p className="text-xs text-muted-foreground">
              Versão <span className="num">{c.textVersion || '—'}</span> · concedido em <span className="num">{formatDateTime(c.consentedAt)}</span>
              {c.revokedAt && (
                <> · revogado em <span className="num">{formatDateTime(c.revokedAt)}</span></>
              )}
            </p>
          </div>
          {c.revokedAt ? <StatusBadge tone="neutral">Revogado</StatusBadge> : <StatusBadge tone="success">Ativo</StatusBadge>}
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/** Privacidade e dados (LGPD art. 18): consentimentos, exportação e exclusão da conta */
export default function PrivacyCenter() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const consentQ = useQuery({ queryKey: ['consentStatus'], queryFn: privacyApi.consentStatus });
  const status = consentQ.data || {};
  const history = asArray(status.history);
  const activeCount = history.filter((c) => !c.revokedAt).length;

  const revoke = useMutation({
    mutationFn: () => privacyApi.revokeConsent({ reason: 'Revogado pelo titular nas configurações' }),
    onSuccess: (res) => {
      setRevokeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['consentStatus'] });
      toast.warning(
        res?.message || 'Consentimento revogado. Novos usos foram bloqueados.',
        'Consentimento revogado'
      );
    },
    onError: (err) => toast.error(friendlyError(err, 'Não foi possível revogar o consentimento. Tente novamente.')),
  });

  const exportData = useMutation({
    mutationFn: () => privacyApi.exportMyData(),
    onSuccess: (data) => {
      downloadJson(data, `medconnect-meus-dados-${localDateStamp()}.json`);
      toast.success('O arquivo JSON com seus dados foi baixado.', 'Exportação concluída');
    },
    onError: (err) => toast.error(friendlyError(err, 'Não foi possível exportar seus dados. Tente novamente.')),
  });

  const anonymize = useMutation({
    mutationFn: () => privacyApi.anonymizeMyAccount(),
    onSuccess: async (res) => {
      setDeleteOpen(false);
      toast.success(res?.mensagem || res?.message || 'Conta e dados anonimizados com sucesso.', 'Conta excluída');
      await logout();
      queryClient.clear();
      navigate('/', { replace: true });
    },
    onError: (err) => toast.error(friendlyError(err, 'Não foi possível concluir a exclusão. Tente novamente ou fale com o atendimento.')),
  });

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Privacidade e dados"
        description="Veja o que você autorizou e exerça seus direitos de titular previstos na LGPD (Lei 13.709/2018, art. 18)."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Consentimentos */}
          <FadeUp duration={0.4} y={12}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading">
                  <ShieldCheck className="size-5 text-primary" aria-hidden="true" /> Seus consentimentos
                </CardTitle>
                <CardDescription>Cada autorização fica registrada com a versão do termo e a data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {consentQ.isLoading ? (
                  <LoadingState variant="list" rows={2} message="Carregando seus consentimentos…" />
                ) : consentQ.isError ? (
                  <ErrorState
                    title="Erro ao carregar consentimentos"
                    message="Não foi possível buscar seus consentimentos agora. Tente novamente."
                    onRetry={consentQ.refetch}
                    className="py-8"
                  />
                ) : (
                  <>
                    <div
                      className={
                        status.hasActiveHealthConsent
                          ? 'flex items-start gap-3 rounded-xl bg-success-wash px-4 py-3 text-sm'
                          : 'flex items-start gap-3 rounded-xl bg-amber-wash px-4 py-3 text-sm'
                      }
                    >
                      {status.hasActiveHealthConsent ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <Ban className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
                      )}
                      <p className="leading-relaxed text-foreground">
                        {status.hasActiveHealthConsent ? (
                          <>Consentimento para dados de saúde <strong>ativo</strong>{status.latestConsent?.textVersion ? <> (versão <span className="num">{status.latestConsent.textVersion}</span>)</> : null}. Você pode enviar receitas normalmente.</>
                        ) : status.isRevoked ? (
                          <>Consentimento para dados de saúde <strong>revogado</strong>. Novos envios de receita estão bloqueados até você autorizar de novo ao enviar uma receita.</>
                        ) : (
                          <>Você ainda não autorizou o uso de dados de saúde. A autorização é pedida quando você envia uma receita.</>
                        )}
                      </p>
                    </div>
                    <ConsentList history={history} />
                  </>
                )}
              </CardContent>
              {activeCount > 0 && (
                <CardFooter className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">Revogar bloqueia novos envios e inicia a exclusão dos seus dados.</p>
                  <Button variant="destructive" onClick={() => setRevokeOpen(true)}>
                    <Ban aria-hidden="true" /> Revogar consentimentos
                  </Button>
                </CardFooter>
              )}
            </Card>
          </FadeUp>

          {/* Exportação */}
          <FadeUp duration={0.4} y={12} delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading">
                  <Download className="size-5 text-primary" aria-hidden="true" /> Exportar meus dados
                </CardTitle>
                <CardDescription>
                  Baixe um arquivo JSON com seu cadastro, receitas, pedidos, avaliações, consentimentos e chamados de atendimento.
                  A exportação fica registrada na trilha de auditoria.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="num text-xs text-muted-foreground">medconnect-meus-dados-{localDateStamp()}.json</p>
                <Button variant="outline" onClick={() => exportData.mutate()} disabled={exportData.isPending}>
                  {exportData.isPending ? <Spinner /> : <Download aria-hidden="true" />} Exportar meus dados
                </Button>
              </CardFooter>
            </Card>
          </FadeUp>

          {/* Exclusão */}
          <FadeUp duration={0.4} y={12} delay={0.1}>
            <Card className="ring-[color-mix(in_oklab,var(--coral)_35%,transparent)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading">
                  <Trash2 className="size-5 text-coral" aria-hidden="true" /> Excluir minha conta
                </CardTitle>
                <CardDescription>
                  Remove seus dados de identificação e encerra o acesso. Registros exigidos pela vigilância sanitária são mantidos
                  pelo prazo legal, sem vínculo com seus dados de contato.
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-end">
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                  <Trash2 aria-hidden="true" /> Excluir conta e anonimizar dados
                </Button>
              </CardFooter>
            </Card>
          </FadeUp>
        </div>

        <aside className="space-y-6" aria-label="Seus direitos e documentos">
          <FadeUp duration={0.4} y={12} delay={0.05}>
            <div className="rounded-2xl border border-border bg-mint-wash p-5">
              <p className="eyebrow mb-3">Seus direitos</p>
              <Stagger as="ul" step={0.06} inView={false} className="space-y-3.5">
                {RIGHTS.map((r) => (
                  <StaggerItem as="li" key={r.title} y={8} className="flex gap-3">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                      <r.icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {r.to ? <Link to={r.to} className="underline-offset-2 hover:underline">{r.title}</Link> : r.title}
                      </span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">{r.text}</span>
                    </span>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </FadeUp>
          <FadeUp duration={0.4} y={12} delay={0.1}>
            <nav aria-label="Documentos e ajuda" className="rounded-2xl border border-border bg-card p-2">
              {[
                { to: '/privacy', label: 'Política de Privacidade', icon: ShieldCheck },
                { to: '/terms', label: 'Termos de Uso', icon: ScrollText },
                { to: '/support', label: 'Falar com o atendimento', icon: LifeBuoy },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <l.icon className="size-4 text-primary" aria-hidden="true" />
                  <span className="flex-1">{l.label}</span>
                  <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </FadeUp>
        </aside>
      </div>

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={(v) => !revoke.isPending && setRevokeOpen(v)}
        title="Revogar seus consentimentos?"
        description="Você pode autorizar de novo no futuro, ao enviar uma nova receita."
        confirmLabel="Revogar consentimentos"
        destructive
        loading={revoke.isPending}
        onConfirm={() => revoke.mutate()}
      >
        <ul className="space-y-2 rounded-xl border border-border bg-amber-wash/60 p-4 text-sm leading-relaxed text-foreground">
          <li>• Novos envios de receita ficam bloqueados imediatamente.</li>
          <li>• O fluxo de exclusão e anonimização dos seus dados é iniciado.</li>
          <li>• Por segurança, suas sessões são encerradas e você precisará entrar novamente.</li>
        </ul>
      </ConfirmDialog>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        loading={anonymize.isPending}
        onConfirm={() => anonymize.mutate()}
      />
    </>
  );
}
