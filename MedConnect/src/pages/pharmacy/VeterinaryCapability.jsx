import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowRight, Ban, CheckCircle2, FileText, Hourglass, Info, LifeBuoy, PawPrint, Trash2, UploadCloud, XCircle,
} from 'lucide-react';
import { cn } from 'cn';
import { validarCrf, validarCrmv, validarRegistroMapa, UFS_BRASIL } from '@medconnect/validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { FadeUp } from '@/components/motion';
import { useToast } from '@/context/ToastContext';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { pharmacyApi } from '@/services/endpoints';
import { formatDate, formatDateTime } from '@/lib/format';
import { serverMessage } from './components/utils';
import { CapabilityStatusBadge } from './components/vet';
import { usePharmacyCapabilities } from './components/vetUtils';

const MAX_FILES = 5;
const MAX_FILE_MB = 10;
const ACCEPTED = '.pdf,image/png,image/jpeg';
const EMPTY_FORM = {
  mapaRegistrationNumber: '',
  crmvCompanyRegistration: '',
  crmvCompanyUf: 'SP',
  technicalResponsibleName: '',
  technicalResponsibleCrf: '',
  technicalResponsibleCrfUf: 'SP',
};

const isAcceptedFile = (file) =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name) || file.type === 'image/png' || file.type === 'image/jpeg';

/** Validação de formato (a conferência documental cabe à equipe MedConnect) */
function validate(form, files) {
  if (!validarRegistroMapa(form.mapaRegistrationNumber.trim())) {
    return 'Informe um registro MAPA válido (ex.: SP-12345-6), como consta no certificado do Ministério da Agricultura.';
  }
  if (!validarCrmv(form.crmvCompanyRegistration.trim(), form.crmvCompanyUf)) {
    return 'Informe o registro da empresa no CRMV e a UF.';
  }
  if (!form.technicalResponsibleName.trim()) return 'Informe o nome do farmacêutico responsável técnico.';
  if (!validarCrf(form.technicalResponsibleCrf.trim(), form.technicalResponsibleCrfUf)) {
    return 'Informe o CRF do responsável técnico e a UF.';
  }
  if (files.length === 0) return 'Anexe ao menos 1 documento comprobatório (certificado MAPA, certidão do CRMV ou do CRF).';
  return null;
}

function UfSelect({ id, label, value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className="w-24 shrink-0 data-[size=default]:h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="max-h-72">
        {UFS_BRASIL.map((uf) => (
          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusHeader({ icon: Icon, tone, title, status, subtitle }) {
  const tones = {
    warning: 'bg-amber-wash text-amber',
    success: 'bg-success-wash text-success',
    error: 'bg-coral-wash text-coral',
  };
  return (
    <div className="flex items-start gap-3">
      <span className={cn('inline-flex size-12 shrink-0 items-center justify-center rounded-full', tones[tone])}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-1">
        <h2 className="flex flex-wrap items-center gap-2 font-heading text-lg font-semibold text-foreground">
          {title}
          <CapabilityStatusBadge status={status} />
        </h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function ReasonBox({ label, reason, fallback }) {
  return (
    <div className="rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">“{reason || fallback}”</p>
    </div>
  );
}

function CapabilityDetails({ cap }) {
  const count = cap.evidenceCount ?? cap.evidenceFileKeys?.length ?? 0;
  return (
    <KeyValueList>
      <KeyValue label="Registro no MAPA">{cap.mapaRegistrationNumber || '—'}</KeyValue>
      {cap.crmvCompanyRegistration && (
        <KeyValue label="CRMV da empresa">{cap.crmvCompanyRegistration}/{cap.crmvCompanyUf}</KeyValue>
      )}
      {cap.technicalResponsibleName && (
        <KeyValue label="Responsável técnico">
          {cap.technicalResponsibleName} (CRF {cap.technicalResponsibleCrf}/{cap.technicalResponsibleCrfUf})
        </KeyValue>
      )}
      <KeyValue label="Documentos">
        <span className="num">{count}</span> {count === 1 ? 'documento enviado' : 'documentos enviados'} (armazenamento privado)
      </KeyValue>
    </KeyValueList>
  );
}

/** Situação atual da habilitação VETERINARY_COMPOUNDING */
function StatusCard({ cap, onResubmit }) {
  let body;
  if (cap.status === 'PENDING_VERIFICATION') {
    body = (
      <>
        <StatusHeader
          icon={Hourglass}
          tone="warning"
          status={cap.status}
          title="Solicitação em análise"
          subtitle={`Enviada em ${formatDateTime(cap.createdAt)}`}
        />
        <div className="rounded-xl bg-muted/60 px-4 py-3">
          <p className="text-sm font-medium text-foreground">O que acontece agora</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>A equipe MedConnect confere os documentos e a regularidade do registro no MAPA.</li>
            <li>A inscrição da empresa no CRMV e o CRF do responsável técnico entram no checklist regulatório.</li>
            <li>Com a aprovação, as receitas veterinárias passam a aparecer nas suas solicitações.</li>
          </ul>
        </div>
        <CapabilityDetails cap={cap} />
      </>
    );
  } else if (cap.status === 'VERIFIED') {
    body = (
      <>
        <StatusHeader
          icon={CheckCircle2}
          tone="success"
          status={cap.status}
          title="Habilitação veterinária ativa"
          subtitle={cap.verifiedAt ? `Aprovada em ${formatDate(cap.verifiedAt)}` : undefined}
        />
        <p className="text-sm leading-relaxed text-foreground/80">
          Sua farmácia está habilitada para manipular fórmulas veterinárias. As receitas dos tutores já aparecem nas solicitações e você pode enviar propostas.
        </p>
        <CapabilityDetails cap={cap} />
        <Button asChild className="w-fit">
          <Link to="/pharmacy/requests">Ir para as solicitações <ArrowRight aria-hidden="true" /></Link>
        </Button>
      </>
    );
  } else if (cap.status === 'REJECTED') {
    body = (
      <>
        <StatusHeader
          icon={XCircle}
          tone="error"
          status={cap.status}
          title="Solicitação recusada"
          subtitle={cap.updatedAt ? `Avaliada em ${formatDate(cap.updatedAt)}` : undefined}
        />
        <ReasonBox label="Motivo informado pela equipe" reason={cap.rejectionReason} fallback="Documentação ilegível ou com divergência cadastral." />
        <p className="text-sm text-muted-foreground">Revise os dados e envie uma nova solicitação com os documentos corrigidos.</p>
        <Button onClick={onResubmit} className="w-fit">Reenviar com correções</Button>
      </>
    );
  } else {
    body = (
      <>
        <StatusHeader
          icon={Ban}
          tone="error"
          status={cap.status}
          title="Habilitação veterinária suspensa"
          subtitle={cap.updatedAt ? `Suspensa em ${formatDate(cap.updatedAt)}` : undefined}
        />
        <ReasonBox label="Motivo da suspensão" reason={cap.rejectionReason} fallback="Suspensão cautelar administrativa." />
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Sua farmácia não recebe novas receitas veterinárias.</li>
          <li>Novas cotações veterinárias ficam bloqueadas.</li>
          <li className="font-medium text-foreground">
            Pedidos e cotações já aprovados anteriormente seguem seu fluxo normal de produção e entrega, para não interromper o tratamento dos animais.
          </li>
        </ul>
        <Button asChild variant="outline" className="w-fit">
          <Link to="/pharmacy/support"><LifeBuoy aria-hidden="true" /> Falar com o atendimento</Link>
        </Button>
      </>
    );
  }
  return (
    <FadeUp duration={0.4} y={8}>
      <Card className="rounded-2xl">
        <CardContent className="space-y-5 pt-6">{body}</CardContent>
      </Card>
    </FadeUp>
  );
}

function RequestForm({ initial, resubmitting, onCancel, onDone }) {
  const toast = useToast();
  const fileInput = useRef(null);
  const [form, setForm] = useState(initial);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append('mapaRegistrationNumber', form.mapaRegistrationNumber.trim());
      data.append('crmvCompanyRegistration', form.crmvCompanyRegistration.trim());
      data.append('crmvCompanyUf', form.crmvCompanyUf);
      data.append('technicalResponsibleName', form.technicalResponsibleName.trim());
      data.append('technicalResponsibleCrf', form.technicalResponsibleCrf.trim());
      data.append('technicalResponsibleCrfUf', form.technicalResponsibleCrfUf);
      files.forEach((f) => data.append('evidences', f));
      return pharmacyApi.requestVeterinaryCapability(data);
    },
    onSuccess: () => {
      toast.success('A equipe MedConnect vai conferir os documentos e avisar você por notificação.', 'Solicitação enviada');
      onDone();
    },
    onError: (err) => setError(serverMessage(err, 'Não foi possível enviar a solicitação. Tente novamente.')),
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    const valid = incoming.filter((f) => isAcceptedFile(f) && f.size <= MAX_FILE_MB * 1024 * 1024);
    if (valid.length < incoming.length) {
      setError(`Use apenas PDF, JPEG ou PNG de até ${MAX_FILE_MB} MB.`);
    } else {
      setError('');
    }
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = (e) => {
    e.preventDefault();
    const problem = validate(form, files);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <FadeUp duration={0.4} y={8}>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle role="heading" aria-level={2} className="text-[1.0625rem]">
            {resubmitting ? 'Reenviar documentação' : 'Solicitar habilitação veterinária'}
          </CardTitle>
          <CardDescription>
            Informe os registros e anexe os comprovantes. Sua operação humana continua ativa durante a análise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="grid gap-5">
            {error && (
              <p role="alert" className="flex gap-2 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3 text-sm text-foreground">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" /> {error}
              </p>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid content-start gap-2">
                <Label htmlFor="mapa-registration-input">Registro no MAPA *</Label>
                <Input
                  id="mapa-registration-input"
                  className="h-10"
                  placeholder="Ex: SP-12345-6"
                  value={form.mapaRegistrationNumber}
                  onChange={set('mapaRegistrationNumber')}
                  aria-describedby="mapa-hint"
                  autoComplete="off"
                />
                <p id="mapa-hint" className="text-xs text-muted-foreground">Como consta no certificado do Ministério da Agricultura e Pecuária.</p>
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="crmv-company-input">Registro da empresa no CRMV *</Label>
                <div className="flex gap-2">
                  <Input
                    id="crmv-company-input"
                    className="h-10"
                    placeholder="Ex: 12345-J"
                    value={form.crmvCompanyRegistration}
                    onChange={set('crmvCompanyRegistration')}
                    autoComplete="off"
                  />
                  <UfSelect id="crmv-company-uf" label="UF do CRMV da empresa" value={form.crmvCompanyUf} onChange={(v) => setForm((f) => ({ ...f, crmvCompanyUf: v }))} />
                </div>
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="rt-name-input">Responsável técnico (farmacêutico) *</Label>
                <Input
                  id="rt-name-input"
                  className="h-10"
                  placeholder="Ex: Dr. Roberto Guimarães"
                  value={form.technicalResponsibleName}
                  onChange={set('technicalResponsibleName')}
                  autoComplete="off"
                />
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="rt-crf-input">CRF do responsável técnico *</Label>
                <div className="flex gap-2">
                  <Input
                    id="rt-crf-input"
                    className="h-10"
                    placeholder="Ex: 65432"
                    value={form.technicalResponsibleCrf}
                    onChange={set('technicalResponsibleCrf')}
                    autoComplete="off"
                  />
                  <UfSelect id="rt-crf-uf" label="UF do CRF do responsável técnico" value={form.technicalResponsibleCrfUf} onChange={(v) => setForm((f) => ({ ...f, technicalResponsibleCrfUf: v }))} />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="evidence-upload">Documentos comprobatórios *</Label>
              <p id="evidence-hint" className="text-xs text-muted-foreground">
                Certificado do MAPA, certidão do CRMV (PJ) e do CRF do responsável técnico. PDF, JPEG ou PNG, até {MAX_FILE_MB} MB cada, no máximo {MAX_FILES} arquivos. Armazenamento privado: só a equipe de verificação acessa.
              </p>
              <label
                htmlFor="evidence-upload"
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border bg-mint-wash/40 px-4 py-6 text-center transition-colors hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] focus-within:ring-3 focus-within:ring-ring/50"
              >
                <UploadCloud className="size-7 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">Selecionar documentos</span>
                <span className="text-xs text-muted-foreground">
                  <span className="num">{files.length}</span>/{MAX_FILES} anexados
                </span>
                <input
                  ref={fileInput}
                  id="evidence-upload"
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  aria-describedby="evidence-hint"
                  className="sr-only"
                  onChange={(e) => addFiles(e.target.files)}
                  disabled={files.length >= MAX_FILES}
                />
              </label>
              {files.length > 0 && (
                <ul className="grid gap-2" aria-label="Documentos anexados">
                  {files.map((file, idx) => (
                    <li key={`${file.name}-${idx}`} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                      <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`Remover ${file.name}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-muted/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Conferimos apenas o formato dos registros aqui; a validação documental é feita pela equipe MedConnect antes da aprovação.
            </p>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
              {resubmitting && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancelar</Button>
              )}
              <Button type="submit" size="lg" disabled={mutation.isPending}>
                {mutation.isPending ? <Spinner /> : <PawPrint aria-hidden="true" />} Enviar para análise
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </FadeUp>
  );
}

/** Habilitação para manipulação veterinária (/pharmacy/veterinary-capability) — VET_ENABLED */
export default function VeterinaryCapability() {
  const queryClient = useQueryClient();
  const { vetEnabled, isLoading: loadingConfig } = usePublicConfig();
  const caps = usePharmacyCapabilities(vetEnabled);
  const [resubmit, setResubmit] = useState(null);

  const cap = caps.vetCapability;
  const header = (
    <PageHeader
      eyebrow="Credenciamento"
      title="Habilitação veterinária"
      description="Registro no MAPA, inscrição da empresa no CRMV e farmacêutico responsável técnico: exigidos para cotar receitas veterinárias (Decreto nº 5.053/2004 e IN MAPA nº 11/2005)."
      actions={
        cap?.status === 'VERIFIED' ? (
          <Button asChild>
            <Link to="/pharmacy/requests">Ver receitas veterinárias <ArrowRight aria-hidden="true" /></Link>
          </Button>
        ) : null
      }
    />
  );

  if (loadingConfig || (vetEnabled && caps.isLoading)) {
    return (
      <>
        {header}
        <LoadingState variant="detail" message="Carregando a habilitação…" />
      </>
    );
  }

  if (!vetEnabled) {
    return (
      <>
        {header}
        <FadeUp duration={0.4} y={8} className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <PawPrint className="size-6" aria-hidden="true" />
          </span>
          <h2 className="font-heading text-lg font-medium text-foreground">Habilitação veterinária indisponível</h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            A MedConnect ainda não recebe receitas veterinárias. Avisaremos quando a vertical for liberada.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/pharmacy">Voltar ao painel</Link>
          </Button>
        </FadeUp>
      </>
    );
  }

  if (caps.isError) {
    return (
      <>
        {header}
        <ErrorState
          title="Erro ao carregar a habilitação"
          message="Não foi possível consultar a situação da habilitação veterinária. Tente novamente."
          onRetry={caps.refetch}
        />
      </>
    );
  }

  const done = () => {
    setResubmit(null);
    queryClient.invalidateQueries({ queryKey: ['pharmacyCapabilities'] });
    queryClient.invalidateQueries({ queryKey: ['availablePrescriptions'] });
    queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
  };

  const showForm = !cap || resubmit;
  return (
    <>
      {header}
      <div className="mx-auto grid max-w-3xl gap-6">
        {cap && !resubmit && (
          <StatusCard
            cap={cap}
            onResubmit={() =>
              setResubmit({
                mapaRegistrationNumber: cap.mapaRegistrationNumber || '',
                crmvCompanyRegistration: cap.crmvCompanyRegistration || '',
                crmvCompanyUf: cap.crmvCompanyUf || 'SP',
                technicalResponsibleName: cap.technicalResponsibleName || '',
                technicalResponsibleCrf: cap.technicalResponsibleCrf || '',
                technicalResponsibleCrfUf: cap.technicalResponsibleCrfUf || 'SP',
              })
            }
          />
        )}
        {showForm && (
          <RequestForm
            key={resubmit ? 'resubmit' : 'new'}
            initial={resubmit || EMPTY_FORM}
            resubmitting={!!resubmit}
            onCancel={() => setResubmit(null)}
            onDone={done}
          />
        )}
      </div>
    </>
  );
}
