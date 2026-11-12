import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Building2, Check, ExternalLink, FileText, Search, ShieldCheck, Stethoscope, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { adminApi } from '@/services/endpoints';
import { CAPABILITY_STATUS_LABELS, CAPABILITY_TYPE_LABELS } from '@/lib/vet';
import { apiErrorMessage, formatCnpj, formatDate, formatRelative } from '@/lib/format';
import { resolveApiUrl } from '@/pages/user/components/patient-utils';
import { FilterBar, FilterSelect } from './FilterBar';
import ListState from './ListState';
import { CnpjSummary } from './PharmacyBits';
import { SheetSection } from './DetailSheet';
import { Num } from './cells';
import { toOptions } from './labels';
import { CAPABILITIES_QUERY_KEY, CAPABILITY_TONES, useAdminCapabilities } from './capabilities';

/**
 * Habilitações regulatórias das farmácias (PharmacyCapability): manipulação humana (ANVISA) e
 * veterinária (MAPA/CRMV). A análise da habilitação veterinária exige o checklist regulatório.
 */

const TYPE_OPTIONS = toOptions(CAPABILITY_TYPE_LABELS);
const STATUS_OPTIONS = toOptions(CAPABILITY_STATUS_LABELS);

/** Conferências obrigatórias antes de aprovar a manipulação veterinária (gravadas na trilha de auditoria) */
const VET_CHECKLIST = [
  { key: 'mapaChecked', label: 'Registro no MAPA conferido' },
  { key: 'crmvChecked', label: 'CRMV da empresa conferido' },
  { key: 'rtCrfChecked', label: 'Responsável técnico e CRF conferidos' },
];
const EMPTY_CHECKLIST = { mapaChecked: false, crmvChecked: false, rtCrfChecked: false };

function CapabilityBadge({ status }) {
  return (
    <StatusBadge tone={CAPABILITY_TONES[status] || 'neutral'} status={status}>
      {CAPABILITY_STATUS_LABELS[status] || status}
    </StatusBadge>
  );
}

// ─── Aba "Habilitações" ─────────────────────────────────────────────────────

export function CapabilitiesPanel({ query, type, status, onTypeChange, onStatusChange, activeFilters, onClear }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null); // { type: 'approve' | 'reject' | 'suspend', capability }
  const all = Array.isArray(query.data) ? query.data : [];
  const rows = all.filter((c) => (type === 'ALL' || c.type === type) && (status === 'ALL' || c.status === status));

  const mutation = useMutation({
    mutationFn: ({ kind, id, reason, checklist }) => {
      if (kind === 'approve') return adminApi.approveCapability(id, { checklist });
      if (kind === 'reject') return adminApi.rejectCapability(id, reason);
      return adminApi.suspendCapability(id, reason);
    },
    onSuccess: (_data, { kind, name }) => {
      queryClient.invalidateQueries({ queryKey: CAPABILITIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['adminAuditLogs'] });
      if (kind === 'approve') toast.success(`${name} foi habilitada e a farmácia foi notificada.`, 'Habilitação aprovada');
      else if (kind === 'reject') toast.info(`A solicitação de ${name} foi recusada e a farmácia foi notificada.`, 'Habilitação recusada');
      else toast.info('Novas receitas desse tipo deixam de chegar à farmácia. Pedidos já aceitos seguem normalmente.', 'Habilitação suspensa');
      setAction(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Não foi possível concluir a análise da habilitação.')),
  });

  const run = (extra) =>
    mutation.mutate({ kind: action.type, id: action.capability.id, name: action.capability.pharmacy?.name || 'A farmácia', ...extra });
  const close = (open) => !open && !mutation.isPending && setAction(null);
  const subject = action?.capability;

  return (
    <>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Confira o registro no MAPA, o CRMV da empresa e o farmacêutico responsável técnico antes de liberar a manipulação
        veterinária. Os documentos abrem por link temporário de 5 minutos e cada acesso fica na trilha de auditoria.
      </p>
      <FilterBar activeCount={activeFilters} onClear={onClear}>
        <FilterSelect label="Filtrar por tipo de habilitação" value={type} onChange={onTypeChange} options={TYPE_OPTIONS} allLabel="Todos os tipos" />
        <FilterSelect label="Filtrar por situação da habilitação" value={status} onChange={onStatusChange} options={STATUS_OPTIONS} allLabel="Todas as situações" />
      </FilterBar>

      <ListState
        isLoading={query.isLoading}
        isError={query.isError && !query.data}
        onRetry={query.refetch}
        errorTitle="Erro ao carregar solicitações de habilitação"
        isEmpty={rows.length === 0}
        emptyIcon={ShieldCheck}
        emptyTitle="Nenhuma habilitação com esses filtros"
        emptyDescription="Solicitações de habilitação veterinária aparecem aqui assim que a farmácia envia os documentos."
      >
        <Stagger as="ul" step={0.05} inView={false} className="space-y-4" aria-label="Habilitações regulatórias">
          {rows.map((capability) => (
            <StaggerItem as="li" key={capability.id} y={12}>
              <CapabilityCard capability={capability} onAction={(type) => setAction({ type, capability })} />
            </StaggerItem>
          ))}
        </Stagger>
      </ListState>

      <ApproveCapabilityDialog
        open={action?.type === 'approve'}
        onOpenChange={close}
        capability={subject}
        loading={mutation.isPending}
        onConfirm={(checklist) => run({ checklist })}
      />
      <ConfirmDialog
        open={action?.type === 'reject'}
        onOpenChange={close}
        title="Recusar habilitação?"
        description={subject ? `Informe o motivo regulatório. Ele é enviado a "${subject.pharmacy?.name}" para que a farmácia corrija a solicitação.` : ''}
        confirmLabel="Confirmar recusa"
        destructive
        loading={mutation.isPending}
        reason={{ label: 'Motivo da recusa', required: true, minLength: 5, placeholder: 'Ex.: registro no MAPA não localizado.' }}
        onConfirm={(reason) => run({ reason })}
      />
      <ConfirmDialog
        open={action?.type === 'suspend'}
        onOpenChange={close}
        title="Suspender habilitação?"
        description={
          subject
            ? `"${subject.pharmacy?.name}" deixa de receber novas receitas desse tipo. Pedidos já aceitos seguem normalmente e continuam visíveis para a administração.`
            : ''
        }
        confirmLabel="Confirmar suspensão"
        destructive
        loading={mutation.isPending}
        reason={{ label: 'Motivo da suspensão', required: true, minLength: 5, placeholder: 'Ex.: CRMV da empresa vencido.' }}
        onConfirm={(reason) => run({ reason })}
      />
    </>
  );
}

function CapabilityCard({ capability: c, onAction }) {
  const titleId = useId();
  const pharmacy = c.pharmacy || {};
  const isVet = c.type === 'VETERINARY_COMPOUNDING';
  const evidenceCount = c.evidenceCount ?? (Array.isArray(c.evidenceFileKeys) ? c.evidenceFileKeys.length : 0);

  return (
    <article aria-labelledby={titleId} className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            {isVet ? <Stethoscope className="size-5" aria-hidden="true" /> : <Building2 className="size-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="font-heading text-lg font-semibold leading-tight text-foreground">{pharmacy.name || 'Farmácia'}</h2>
              <StatusBadge tone="info" dot={false}>{CAPABILITY_TYPE_LABELS[c.type] || c.type}</StatusBadge>
              <CapabilityBadge status={c.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {pharmacy.cnpj && <>CNPJ <span className="num text-foreground">{formatCnpj(pharmacy.cnpj)}</span></>}
              {c.createdAt && <> · solicitada {formatRelative(c.createdAt)} ({formatDate(c.createdAt)})</>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:shrink-0 md:justify-end">
          {c.status !== 'VERIFIED' && (
            <Button type="button" onClick={() => onAction('approve')} className="flex-1 md:flex-none">
              <Check aria-hidden="true" /> Aprovar
            </Button>
          )}
          {c.status === 'PENDING_VERIFICATION' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onAction('reject')}
              className="flex-1 border-[color-mix(in_oklab,var(--coral)_40%,var(--border))] text-[hsl(4_62%_42%)] hover:bg-coral-wash md:flex-none"
            >
              <X aria-hidden="true" /> Recusar
            </Button>
          )}
          {c.status === 'VERIFIED' && (
            <Button type="button" variant="outline" onClick={() => onAction('suspend')} className="flex-1 md:flex-none">
              <Ban aria-hidden="true" /> Suspender
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-t border-border pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
            {isVet && <Field label="Registro no MAPA">{orMissing(c.mapaRegistrationNumber, (v) => <Num>{v}</Num>)}</Field>}
            {isVet && (
              <Field label="CRMV da empresa">
                {orMissing(c.crmvCompanyRegistration, (v) => <Num>{`${v}/${c.crmvCompanyUf || '—'}`}</Num>)}
              </Field>
            )}
            <Field label="Responsável técnico">{orMissing(c.technicalResponsibleName)}</Field>
            <Field label="CRF">{orMissing(c.technicalResponsibleCrf, (v) => <Num>{`${v}/${c.technicalResponsibleCrfUf || '—'}`}</Num>)}</Field>
            {c.verifiedAt && <Field label="Habilitada em">{formatDate(c.verifiedAt)}</Field>}
          </dl>
          {c.rejectionReason && (
            <p className="rounded-xl border border-[color-mix(in_oklab,var(--coral)_30%,var(--border))] bg-coral-wash/60 px-4 py-3 text-sm text-foreground">
              <span className="font-medium">Motivo registrado:</span> {c.rejectionReason}
            </p>
          )}
          <EvidenceLinks capabilityId={c.id} count={evidenceCount} pharmacyName={pharmacy.name} />
        </div>
        <CnpjCheck pharmacyId={c.pharmacyId} initialData={pharmacy.cnpjData} />
      </div>
    </article>
  );
}

/** Documentos de evidência: só por URL assinada de 5 minutos (cada abertura vira registro na auditoria) */
function EvidenceLinks({ capabilityId, count, pharmacyName }) {
  const toast = useToast();
  const [openingIndex, setOpeningIndex] = useState(null);

  if (!count) return <p className="text-sm text-muted-foreground">Nenhum documento de evidência enviado.</p>;

  const open = async (index) => {
    if (openingIndex !== null) return;
    // Abre a aba no clique para não ser barrada pelo bloqueador de pop-ups
    let win = null;
    try {
      win = window.open('', '_blank');
      if (win?.document?.body) win.document.body.textContent = 'Abrindo documento com segurança…';
    } catch {
      win = null;
    }
    setOpeningIndex(index);
    try {
      const data = await adminApi.capabilityEvidenceUrl(capabilityId, index);
      const url = resolveApiUrl(data?.signedUrl);
      if (!url) throw new Error('sem-url');
      if (win && !win.closed) {
        win.opener = null;
        win.location.href = url;
      } else {
        toast.show({
          type: 'info',
          title: 'Link do documento pronto',
          message: 'O navegador bloqueou a nova aba. O link vale por 5 minutos.',
          action: { label: 'Abrir documento', onClick: () => window.open(url, '_blank', 'noopener,noreferrer') },
        });
      }
    } catch (err) {
      if (win && !win.closed) win.close();
      toast.error(apiErrorMessage(err, 'Não foi possível abrir o documento agora. Tente novamente.'));
    } finally {
      setOpeningIndex(null);
    }
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground">Documentos de evidência (link temporário, acesso auditado)</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => open(index)}
              disabled={openingIndex !== null}
              aria-label={`Abrir documento ${index + 1}${pharmacyName ? ` de ${pharmacyName}` : ''} (nova aba)`}
            >
              {openingIndex === index ? <Spinner aria-hidden="true" /> : <FileText aria-hidden="true" />}
              Documento {index + 1}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Situação cadastral do CNPJ (Receita Federal). A consulta atualiza o cadastro da farmácia. */
function CnpjCheck({ pharmacyId, initialData }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const lookup = useMutation({
    // Endpoint fora do catálogo de endpoints.js (GET /admin/pharmacies/:id/cnpj-lookup)
    mutationFn: () => api.get(`/admin/pharmacies/${pharmacyId}/cnpj-lookup`).then((r) => r.data),
    onSuccess: (result) => {
      setData(result);
      toast.success('Situação cadastral consultada na Receita Federal.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Não foi possível consultar o CNPJ agora.')),
  });

  return (
    <div className="space-y-3">
      <CnpjSummary data={data || initialData} />
      {pharmacyId && (
        <Button type="button" variant="outline" size="sm" onClick={() => lookup.mutate()} disabled={lookup.isPending}>
          {lookup.isPending ? <Spinner aria-hidden="true" /> : <Search aria-hidden="true" />}
          Consultar CNPJ novamente
        </Button>
      )}
    </div>
  );
}

function ApproveCapabilityDialog({ open, onOpenChange, capability, loading, onConfirm }) {
  const [checklist, setChecklist] = useState(EMPTY_CHECKLIST);
  const baseId = useId();
  const isVet = capability?.type === 'VETERINARY_COMPOUNDING';
  const complete = !isVet || VET_CHECKLIST.every((item) => checklist[item.key]);

  const handleOpenChange = (next) => {
    if (!next) setChecklist(EMPTY_CHECKLIST);
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar habilitação?</AlertDialogTitle>
          <AlertDialogDescription>
            {capability
              ? `"${capability.pharmacy?.name}" passa a receber receitas de ${isVet ? 'manipulação veterinária' : 'manipulação humana'}. A farmácia será notificada.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isVet && (
          <fieldset className="space-y-3 rounded-xl border border-border bg-mint-wash/50 p-4">
            <legend className="px-1 text-sm font-medium text-foreground">Checklist regulatório obrigatório</legend>
            {VET_CHECKLIST.map((item) => (
              <div key={item.key} className="flex items-center gap-2.5">
                <Checkbox
                  id={`${baseId}-${item.key}`}
                  checked={checklist[item.key]}
                  onCheckedChange={(value) => setChecklist((prev) => ({ ...prev, [item.key]: value === true }))}
                />
                <Label htmlFor={`${baseId}-${item.key}`} className="text-sm font-normal">{item.label}</Label>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">As conferências ficam registradas na trilha de auditoria.</p>
          </fieldset>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading || !complete}
            onClick={(e) => {
              e.preventDefault();
              onConfirm(isVet ? checklist : undefined);
            }}
          >
            {loading && <Spinner />}
            Confirmar aprovação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Seção na ficha da farmácia ─────────────────────────────────────────────

/** Resumo das habilitações de uma farmácia (somente leitura; a análise fica na aba Habilitações) */
export function PharmacyCapabilitiesSection({ pharmacyId }) {
  const { data } = useAdminCapabilities();
  const list = (Array.isArray(data) ? data : []).filter((c) => c.pharmacyId === pharmacyId);
  if (!pharmacyId || list.length === 0) return null;
  const pending = list.some((c) => c.status === 'PENDING_VERIFICATION');

  return (
    <SheetSection title="Habilitações" icon={ShieldCheck}>
      <ul className="space-y-2.5">
        {list.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5">
            <span className="text-sm font-medium text-foreground">{CAPABILITY_TYPE_LABELS[c.type] || c.type}</span>
            <span className="flex flex-wrap items-center gap-2">
              {c.verifiedAt && c.status === 'VERIFIED' && <span className="text-xs text-muted-foreground">desde {formatDate(c.verifiedAt)}</span>}
              <CapabilityBadge status={c.status} />
            </span>
            {c.rejectionReason && <p className="w-full text-xs text-muted-foreground">Motivo: {c.rejectionReason}</p>}
          </li>
        ))}
      </ul>
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link to={`/admin/pharmacies?tab=capabilities${pending ? '' : '&capStatus=ALL'}`}>
          {pending ? 'Analisar solicitação pendente' : 'Ver na aba Habilitações'}
        </Link>
      </Button>
    </SheetSection>
  );
}

function orMissing(value, render = (v) => v) {
  return value ? render(value) : <span className="font-normal text-muted-foreground">Não informado</span>;
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-foreground">{children}</dd>
    </div>
  );
}
