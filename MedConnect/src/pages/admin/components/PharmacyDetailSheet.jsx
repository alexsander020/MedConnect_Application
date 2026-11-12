import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck, Ban, Building2, CalendarClock, Clock, ExternalLink, FileText, History, ScrollText, ShieldCheck, Star, XCircle,
} from 'lucide-react';
import { cn } from 'cn';
import StatusBadge from '@/components/shared/StatusBadge';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import { useToast } from '@/context/ToastContext';
import { adminApi } from '@/services/endpoints';
import { formatCents, formatCnpj, formatDate, formatDateTime, formatNumber, formatPhone } from '@/lib/format';
import DetailSheet, { AuditNotice, MiniStat, SheetSection } from './DetailSheet';
import AccountStatusControl from './AccountStatusControl';
import { BusinessHoursTable, CnpjSummary } from './PharmacyBits';
import { accountStatusErrorMessage } from './labels';

/**
 * Ficha completa da farmácia (GET /admin/pharmacies/:id — leitura auditada como ADMIN_VIEW_PHARMACY).
 * `summary`: item da listagem, usado no título enquanto o detalhe carrega e para `suspendedAt`.
 */
export default function PharmacyDetailSheet({ pharmacyId, summary, open, onOpenChange }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ['adminPharmacy', pharmacyId],
    queryFn: () => adminApi.pharmacy(pharmacyId),
    enabled: Boolean(pharmacyId),
    // Cada leitura gera um registro na trilha: evita releituras automáticas
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
  const p = detail.data;
  const base = p || summary || {};

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }) => adminApi.setPharmacyStatus(pharmacyId, status, reason),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['adminPharmacies'] });
      queryClient.invalidateQueries({ queryKey: ['adminPharmacy', pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminAuditLogs'] });
      toast.success(
        status === 'SUSPENDED'
          ? 'A farmácia foi suspensa e notificada. As sessões abertas expiram em até 15 minutos.'
          : 'A farmácia foi reativada e notificada.',
        status === 'SUSPENDED' ? 'Farmácia suspensa' : 'Farmácia reativada'
      );
    },
    onError: (err) => toast.error(accountStatusErrorMessage(err)),
  });

  const place = [base.city, base.state].filter(Boolean).join('/');

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={base.name || 'Farmácia'}
      description={[base.cnpj ? `CNPJ ${formatCnpj(base.cnpj)}` : null, place || null].filter(Boolean).join(' · ') || undefined}
      badges={
        base.id && (
          <>
            {base.verificationStatus && <StatusBadge kind="verification" status={base.verificationStatus} />}
            {base.status && <StatusBadge kind="account" status={base.status} />}
            {p && <OpenStatusPill size="sm" status={p.openStatus} />}
          </>
        )
      }
      isLoading={detail.isLoading}
      isError={detail.isError}
      onRetry={detail.refetch}
      errorTitle="Não foi possível carregar a ficha da farmácia"
      footer={
        p && (
          <AccountStatusControl
            status={p.status}
            subjectName={p.name}
            subjectKind="farmácia"
            reasonPlaceholder="Ex.: licença sanitária vencida, reclamações recorrentes de entrega…"
            loading={statusMutation.isPending}
            onSubmit={(vars) => statusMutation.mutateAsync(vars)}
          />
        )
      }
    >
      {p && (
        <>
          <AuditNotice>
            A abertura desta ficha foi registrada na trilha de auditoria.{' '}
            <Link to={`/admin/audit?resource=Pharmacy&resourceId=${p.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
              Ver registros desta farmácia
            </Link>
          </AuditNotice>

          {p.status === 'SUSPENDED' && (
            <div role="status" className="flex gap-3 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3.5 text-sm">
              <Ban className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  Conta suspensa{summary?.suspendedAt ? ` em ${formatDateTime(summary.suspendedAt)}` : ''}
                </p>
                <p className="mt-0.5 break-words text-muted-foreground">Motivo: {p.suspensionReason || 'não informado'}</p>
              </div>
            </div>
          )}

          <SheetSection title="Desempenho" icon={Star}>
            <div className="grid grid-cols-2 gap-2.5">
              <MiniStat label="Cotações enviadas" value={formatNumber(p.stats?.quotes)} hint={`${formatNumber(p.stats?.acceptedQuotes)} aceitas`} />
              <MiniStat label="Pedidos" value={formatNumber(p.stats?.orders)} hint={`${formatNumber(p.stats?.deliveredOrders)} entregues`} />
              <MiniStat label="Faturamento entregue" value={formatCents(p.stats?.gmvDeliveredCents)} />
              <MiniStat
                label="Avaliação média"
                value={p.stats?.reviewsCount ? Number(p.stats.averageRating || 0).toFixed(1).replace('.', ',') : '—'}
                hint={p.stats?.reviewsCount ? `${formatNumber(p.stats.reviewsCount)} avaliações` : 'Sem avaliações'}
              />
            </div>
          </SheetSection>

          <SheetSection title="Dados cadastrais" icon={Building2}>
            <KeyValueList>
              <KeyValue label="E-mail">{p.email}</KeyValue>
              <KeyValue label="Telefone"><span className="num">{p.phone ? formatPhone(p.phone) : '—'}</span></KeyValue>
              <KeyValue label="Endereço">{p.address || '—'}</KeyValue>
              <KeyValue label="Cidade/UF">{place || '—'}</KeyValue>
              <KeyValue label="Área de entrega">{p.deliveryArea || '—'}</KeyValue>
              {p.description && <KeyValue label="Apresentação"><span className="font-normal">{p.description}</span></KeyValue>}
              <KeyValue label="Serviços">
                {p.services?.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {p.services.map((s) => (
                      <span key={s} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">{s}</span>
                    ))}
                  </span>
                ) : (
                  '—'
                )}
              </KeyValue>
              <KeyValue label="Cadastro em">{formatDateTime(p.createdAt)}</KeyValue>
              <KeyValue label="Termos de uso">
                {p.termsAcceptedAt ? `Versão ${p.termsVersion || '—'}, aceitos em ${formatDate(p.termsAcceptedAt)}` : 'Aceite não registrado'}
              </KeyValue>
            </KeyValueList>
          </SheetSection>

          <SheetSection title="Credenciamento sanitário" icon={ShieldCheck}>
            <KeyValueList>
              <KeyValue label="Alvará sanitário"><span className="num">{p.sanitaryLicense || 'Não informado'}</span></KeyValue>
              <KeyValue label="AFE (Anvisa)"><span className="num">{p.operatingAuth || 'Não informado'}</span></KeyValue>
              <KeyValue label="Responsável técnico">{p.technicalResponsibleName || 'Não informado'}</KeyValue>
              <KeyValue label="CRF">
                <span className="num">{p.technicalResponsibleCrf ? `${p.technicalResponsibleCrf}/${p.technicalResponsibleUf || '—'}` : 'Não informado'}</span>
              </KeyValue>
              <KeyValue label="Documento comprobatório">
                {p.documentUrl ? (
                  <a href={p.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline">
                    <FileText className="size-4" aria-hidden="true" /> Abrir documento
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                ) : (
                  'Não enviado'
                )}
              </KeyValue>
            </KeyValueList>
            <CnpjSummary data={p.cnpjData} />
          </SheetSection>

          <SheetSection title="Horário de atendimento" icon={Clock}>
            {p.businessHours?.length ? (
              <BusinessHoursTable hours={p.businessHours} timezone={p.timezone} />
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                A farmácia ainda não cadastrou os horários de atendimento.
              </p>
            )}
          </SheetSection>

          <SheetSection title="Histórico de verificação" icon={History}>
            <VerificationHistory pharmacy={p} suspendedAt={summary?.suspendedAt} />
          </SheetSection>
        </>
      )}
    </DetailSheet>
  );
}

function VerificationHistory({ pharmacy: p, suspendedAt }) {
  const events = [{ icon: CalendarClock, tone: 'neutral', title: 'Cadastro recebido', at: p.createdAt }];
  if (p.verificationStatus === 'VERIFIED') {
    events.push({ icon: BadgeCheck, tone: 'success', title: 'Credenciamento aprovado', at: p.verifiedAt, text: 'Liberada para enviar cotações.' });
  } else if (p.verificationStatus === 'REJECTED') {
    events.push({ icon: XCircle, tone: 'error', title: 'Credenciamento recusado', at: p.verifiedAt, text: p.rejectionReason ? `Motivo: ${p.rejectionReason}` : null });
  } else {
    events.push({ icon: Clock, tone: 'warning', title: 'Aguardando análise do credenciamento', text: 'Aprove ou recuse na aba "Aguardando verificação".' });
  }
  if (p.status === 'SUSPENDED') {
    events.push({ icon: Ban, tone: 'error', title: 'Conta suspensa', at: suspendedAt, text: p.suspensionReason ? `Motivo: ${p.suspensionReason}` : null });
  }
  const toneCls = {
    neutral: 'bg-muted text-muted-foreground',
    success: 'bg-success-wash text-success',
    error: 'bg-coral-wash text-coral',
    warning: 'bg-amber-wash text-amber',
  };
  return (
    <ol className="space-y-4">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3">
          <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full', toneCls[e.tone])}>
            <e.icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-1">
            <p className="text-sm font-medium text-foreground">{e.title}</p>
            {e.at && <p className="num text-xs text-muted-foreground">{formatDateTime(e.at)}</p>}
            {e.text && <p className="mt-0.5 break-words text-sm text-muted-foreground">{e.text}</p>}
          </div>
        </li>
      ))}
      <li className="flex gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <ScrollText className="size-4" aria-hidden="true" />
        </span>
        <p className="pt-1.5 text-sm text-muted-foreground">
          Suspensões, reativações e acessos anteriores ficam na{' '}
          <Link to={`/admin/audit?resource=Pharmacy&resourceId=${p.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
            trilha de auditoria
          </Link>
          .
        </p>
      </li>
    </ol>
  );
}
