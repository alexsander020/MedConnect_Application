import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle, Camera, EyeOff, FileText, FolderOpen, Info, Lock, PawPrint, Plus, RefreshCw, Send, ShieldCheck, Upload,
  User, X,
} from 'lucide-react';
import { UFS_BRASIL, validarCrmv } from '@medconnect/validation';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { EASE_OUT, Stagger, StaggerItem } from '@/components/motion';
import { api } from '@/services/api';
import { petsApi, privacyApi, publicApi } from '@/services/endpoints';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { formatWeight, speciesLabel, VET_DOCUMENT_LABELS } from '@/lib/vet';
import { formatDate } from '@/lib/format';
import { errorCode, errorStatus, friendlyError } from './components/patient-utils';
import { NativeSelect } from './components/vet-ui';
import { PHARMACEUTICAL_FORM_LABELS } from './components/vet-format';

/** Mesmas regras do servidor (multer 10 MB + magic bytes PDF/JPEG/PNG) */
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXT = /\.(pdf|jpe?g|png)$/i;
const ACCEPT_ATTR = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 10 * 1024 * 1024;
const NOTES_MAX = 500;
const FLAVORING_MAX = 60;

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function validatePrescriptionFile(file) {
  if (!file) return 'Anexe a receita para continuar.';
  const type = (file.type || '').toLowerCase();
  if (type.includes('heic') || type.includes('heif') || /\.hei[cf]$/i.test(file.name || '')) {
    return 'Fotos em HEIC não são aceitas. Use "Tirar foto" ou envie a imagem em JPG ou PNG.';
  }
  const typeOk = type ? ACCEPTED_MIME.includes(type) : ACCEPTED_EXT.test(file.name || '');
  if (!typeOk) return 'Formato não aceito. Envie a receita em PDF, JPG ou PNG.';
  if (file.size === 0) return 'O arquivo está vazio. Escolha outro arquivo.';
  if (file.size > MAX_BYTES) return `O arquivo tem ${formatSize(file.size)}. O limite é de 10 MB.`;
  return null;
}

/** Mesmo payload de patientApi.uploadPrescription, com progresso real do envio */
function uploadPrescription(formData, onProgress) {
  return api
    .post('/prescriptions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e?.total) onProgress(Math.min(100, Math.round((e.loaded * 100) / e.total)));
      },
    })
    .then((r) => r.data);
}

function SuccessCheck() {
  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-accent text-primary"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: EASE_OUT }}
        />
      </svg>
    </motion.span>
  );
}

function SuccessPanel({ onReset, vet = false }) {
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const next = [
    vet
      ? { title: 'Análise pelas farmácias', text: 'Farmácias habilitadas para manipulação veterinária avaliam a fórmula e preparam a cotação.' }
      : { title: 'Análise pelas farmácias', text: 'Farmácias de manipulação credenciadas avaliam a fórmula e preparam a cotação.' },
    { title: 'Cotações para comparar', text: 'Avisamos nas notificações quando chegar cada proposta, com preço e prazo.' },
    { title: 'Você escolhe', text: 'Aprove a cotação que preferir e acompanhe a manipulação até a entrega.' },
  ];
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="mx-auto flex w-full max-w-xl flex-col items-center rounded-2xl border border-border bg-card px-5 py-10 text-center shadow-[0_1px_2px_hsl(190_30%_12%/0.04)] sm:px-10 sm:py-12"
      role="status"
    >
      <SuccessCheck />
      <h2 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold text-foreground outline-none">
        Receita enviada!
      </h2>
      <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
        {vet
          ? 'A receita do seu pet já está disponível para as farmácias habilitadas. Você será avisado assim que chegar a primeira cotação.'
          : 'Sua receita já está disponível para as farmácias credenciadas. Você será avisado assim que chegar a primeira cotação.'}
      </p>
      <Stagger as="ol" step={0.12} delay={0.3} inView={false} className="mt-8 w-full space-y-3 text-left">
        {next.map((s, i) => (
          <StaggerItem as="li" key={s.title} y={10} className="flex gap-3 rounded-xl border border-border bg-mint-wash/60 p-3.5">
            <span className="num inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-sm text-primary">{i + 1}</span>
            <span>
              <span className="block text-sm font-medium text-foreground">{s.title}</span>
              <span className="block text-sm text-muted-foreground">{s.text}</span>
            </span>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button asChild size="lg">
          <Link to="/dashboard">Ir para o início</Link>
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onReset}>
          Enviar outra receita
        </Button>
      </div>
    </motion.div>
  );
}

function FilePreview({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const isImage = file.type?.startsWith('image/');
  useEffect(() => {
    if (!isImage || typeof URL.createObjectURL !== 'function') {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL?.(url);
  }, [file, isImage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="flex items-center gap-4 rounded-2xl border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-mint-wash/60 p-3 sm:p-4"
    >
      <span className="relative inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background text-primary">
        {previewUrl ? (
          <img src={previewUrl} alt="Pré-visualização da receita" className="size-full object-cover" />
        ) : (
          <FileText className="size-7" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {isImage ? 'Imagem' : 'PDF'} · <span className="num">{formatSize(file.size)}</span> · pronto para envio
        </p>
        <label htmlFor="gallery-upload" className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline">
          <RefreshCw className="size-3" aria-hidden="true" /> Trocar arquivo
        </label>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remover arquivo">
        <X aria-hidden="true" />
      </Button>
    </motion.div>
  );
}

function UploadProgress({ value }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Lock className="size-4 text-primary" aria-hidden="true" /> Enviando com segurança…
        </span>
        <span className="num text-muted-foreground" aria-hidden="true">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso do envio da receita"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <motion.span
          className="block h-full w-full origin-left rounded-full bg-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        />
      </div>
      {pct >= 100 && <p className="mt-2 text-xs text-muted-foreground">Verificando o arquivo…</p>}
    </div>
  );
}

function ConsentBlock({ terms, checked, onChange, error, revokedAt, checkboxRef, vet = false }) {
  const term = terms?.activeVersions?.PRESCRIPTION_UPLOAD || terms?.currentHealthConsent || null;
  return (
    <fieldset
      className={cn(
        'rounded-2xl border p-4 transition-colors sm:p-5',
        error ? 'border-[color-mix(in_oklab,var(--coral)_55%,var(--border))] bg-coral-wash/50' : 'border-border bg-mint-wash/60'
      )}
    >
      <legend className="sr-only">Consentimento para dados de saúde</legend>
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-health"
          ref={checkboxRef}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          aria-invalid={!!error}
          aria-describedby={['consent-help', term?.text && 'consent-text', error && 'consent-error'].filter(Boolean).join(' ')}
          className="mt-0.5 size-5 bg-background"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="consent-health" className="block cursor-pointer text-sm leading-snug font-medium">
            {vet
              ? 'Autorizo o tratamento dos dados desta receita veterinária, do animal e dos meus dados de tutor para cotação, verificação regulatória, manipulação e entrega (LGPD, art. 11, I).'
              : 'Autorizo o tratamento dos dados de saúde desta receita para cotação, manipulação e entrega (LGPD, art. 11, I).'}
          </Label>
          <p id="consent-help" className="text-xs leading-relaxed text-muted-foreground">
            {term?.version ? <>Termo vigente <span className="num">{term.version}</span>. </> : null}
            Obrigatório para enviar. Você pode revogar quando quiser em{' '}
            <Link to="/privacy-center" className="font-medium text-primary underline-offset-2 hover:underline">Privacidade e dados</Link>.
          </p>
          {term?.text && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="mb-1 text-xs font-semibold text-foreground">{term.title}</p>
              <p
                id="consent-text"
                tabIndex={0}
                aria-label="Texto completo do termo de consentimento"
                className="max-h-28 overflow-y-auto pr-1 text-xs leading-relaxed text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {term.text}
              </p>
            </div>
          )}
        </div>
      </div>
      {revokedAt !== undefined && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-wash px-3 py-2 text-xs leading-relaxed text-[hsl(32_80%_28%)]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Você revogou este consentimento{revokedAt ? ` em ${formatDate(revokedAt)}` : ''}. Ao marcar a caixa e enviar, um novo consentimento será registrado.
          </span>
        </p>
      )}
      {error && (
        <p id="consent-error" role="alert" className="mt-3 text-sm font-medium text-[hsl(4_62%_42%)]">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-sm font-medium text-[hsl(4_62%_42%)]">
      {children}
    </p>
  );
}

/** Seletor "Para mim" / "Para meu pet" (só aparece com a vertical veterinária ligada) */
function KindSelector({ kind, onChange, disabled }) {
  const options = [
    { value: 'HUMAN', label: 'Para mim', icon: User },
    { value: 'VETERINARY', label: 'Para meu pet', icon: PawPrint },
  ];
  return (
    <div role="group" aria-label="Para quem é a receita" className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl border border-border bg-card p-1.5 sm:max-w-md">
      {options.map(({ value, label, icon: Icon }) => {
        const active = kind === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(value)}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60',
              active ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4" aria-hidden="true" /> {label}
          </button>
        );
      })}
    </div>
  );
}

/** Preferências do tutor (forma e sabor) seguem para as farmácias junto com as observações */
function composeNotes(notes, { isVet, pharmaceuticalForm, flavoring }) {
  const parts = [notes.trim()];
  if (isVet) {
    if (pharmaceuticalForm) parts.push(`Forma farmacêutica preferida: ${PHARMACEUTICAL_FORM_LABELS[pharmaceuticalForm] || pharmaceuticalForm}`);
    if (flavoring.trim()) parts.push(`Sabor/aromatização: ${flavoring.trim()}`);
  }
  return parts.filter(Boolean).join('\n');
}

const EMPTY_VET = {
  petId: '',
  prescriberName: '',
  prescriberCrmv: '',
  prescriberUf: '',
  vetDocumentType: 'MAGISTRAL',
  controlledNotificationNumber: '',
  pharmaceuticalForm: '',
  flavoring: '',
};

function validateVet(vet, { controlledEnabled }) {
  const errors = {};
  if (!vet.petId) errors.petId = 'Selecione para qual animal é a receita.';
  if (!vet.prescriberName.trim()) errors.prescriberName = 'Informe o nome do médico veterinário que assinou a receita.';
  if (!vet.prescriberUf) errors.prescriberUf = 'Selecione a UF do CRMV.';
  if (!vet.prescriberCrmv.trim()) errors.prescriberCrmv = 'Informe o número do CRMV do prescritor.';
  else if (vet.prescriberUf && !validarCrmv(vet.prescriberCrmv, vet.prescriberUf)) {
    errors.prescriberCrmv = 'Informe um CRMV válido para a UF selecionada (apenas números, até 7 dígitos).';
  }
  if (vet.vetDocumentType === 'CONTROLLED_NOTIFICATION') {
    if (!controlledEnabled) errors.vetDocumentType = 'Receitas de controle especial veterinário não estão habilitadas no momento.';
    else if (!vet.controlledNotificationNumber.trim()) errors.controlledNotificationNumber = 'Informe o número da notificação de receita.';
  }
  return errors;
}

const VET_FIELD_ORDER = ['petId', 'prescriberName', 'prescriberCrmv', 'prescriberUf', 'vetDocumentType', 'controlledNotificationNumber'];
const VET_FIELD_IDS = {
  petId: 'pet-select',
  prescriberName: 'prescriber-name',
  prescriberCrmv: 'prescriber-crmv',
  prescriberUf: 'prescriber-uf',
  vetDocumentType: 'vet-document-type',
  controlledNotificationNumber: 'controlled-notification-number',
};

/** Nova cotação: envio da receita (PDF/JPG/PNG até 10 MB) com consentimento versionado — humana ou veterinária */
export default function NewQuote() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { vetEnabled, vetControlledEnabled } = usePublicConfig();
  const [kindChoice, setKindChoice] = useState(location.state?.kind === 'VETERINARY' ? 'VETERINARY' : 'HUMAN');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [notes, setNotes] = useState('');
  const [vet, setVet] = useState(EMPTY_VET);
  const [vetErrors, setVetErrors] = useState({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [revokedFlag, setRevokedFlag] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(false);
  const consentRef = useRef(null);
  const fileZoneRef = useRef(null);
  const formRef = useRef(null);

  // Sem a flag, o fluxo é sempre o humano (mesmo que a navegação peça "Para meu pet")
  const kind = vetEnabled ? kindChoice : 'HUMAN';
  const isVet = kind === 'VETERINARY';

  const termsQ = useQuery({ queryKey: ['consentTerms'], queryFn: publicApi.consentTerms, staleTime: 60 * 60 * 1000, retry: 0 });
  const consentQ = useQuery({ queryKey: ['consentStatus'], queryFn: privacyApi.consentStatus, retry: 0 });
  const petsQ = useQuery({ queryKey: ['myPets'], queryFn: petsApi.list, enabled: isVet, retry: 0 });
  const pets = Array.isArray(petsQ.data) ? petsQ.data : [];
  const isRevoked = revokedFlag || consentQ.data?.isRevoked === true;
  const revokedAt = isRevoked ? consentQ.data?.latestConsent?.revokedAt || null : undefined;

  const setVetField = (field, value) => {
    setVet((v) => ({ ...v, [field]: value }));
    setVetErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Após uma revogação o servidor bloqueia novos envios: o aceite explícito desta tela registra um novo consentimento
      if (isRevoked) await privacyApi.giveConsent('HEALTH_DATA_PROCESSING');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consent', 'true');
      const finalNotes = composeNotes(notes, { isVet, ...vet });
      if (finalNotes) formData.append('notes', finalNotes);
      if (isVet) {
        formData.append('kind', 'VETERINARY');
        formData.append('petId', vet.petId);
        formData.append('prescriberName', vet.prescriberName.trim());
        formData.append('prescriberCrmv', vet.prescriberCrmv.trim());
        formData.append('prescriberUf', vet.prescriberUf);
        formData.append('vetDocumentType', vet.vetDocumentType);
        if (vet.vetDocumentType === 'CONTROLLED_NOTIFICATION') {
          formData.append('controlledNotificationNumber', vet.controlledNotificationNumber.trim());
        }
      }
      setProgress(0);
      return uploadPrescription(formData, setProgress);
    },
    onSuccess: () => {
      setDone(true);
      setRevokedFlag(false);
      queryClient.invalidateQueries({ queryKey: ['myPrescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['consentStatus'] });
      window.scrollTo?.({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      const code = errorCode(err);
      if (code === 'CONSENT_REQUIRED') {
        setConsentError('Para enviar a receita, marque a autorização de uso dos dados de saúde.');
        consentRef.current?.focus();
      } else if (code === 'CONSENT_REVOKED') {
        setRevokedFlag(true);
        setConsent(false);
        setConsentError('Seu consentimento foi revogado. Marque a autorização novamente para registrar um novo consentimento e enviar.');
        consentRef.current?.focus();
      } else if (['INVALID_FILE_CONTENT', 'MALWARE_DETECTED', 'MISSING_FILE'].includes(code)) {
        setFileError(friendlyError(err, 'O arquivo não pôde ser aceito. Envie um PDF, JPG ou PNG.'));
        fileZoneRef.current?.focus();
      } else if (errorStatus(err) === 413 || code === 'LIMIT_FILE_SIZE') {
        setFileError('O arquivo passa do limite de 10 MB.');
        fileZoneRef.current?.focus();
      } else if (code === 'INVALID_PRESCRIBER_CRMV') {
        setVetErrors({ prescriberCrmv: 'O CRMV informado não tem um formato válido para a UF selecionada.' });
      } else if (code === 'ANIMAL_FOOD_PRODUCING_NOT_SUPPORTED') {
        setVetErrors({ petId: 'Ainda não atendemos manipulação para animais destinados à produção de alimentos.' });
      } else if (code === 'ANIMAL_NOT_FOUND') {
        setVetErrors({ petId: 'Este animal não foi encontrado. Atualize a lista em "Meus pets" e tente novamente.' });
        queryClient.invalidateQueries({ queryKey: ['myPets'] });
      } else {
        setSubmitError(friendlyError(err, 'Não foi possível enviar sua receita agora. Verifique sua conexão e tente novamente.'));
      }
    },
    onSettled: () => setProgress(null),
  });

  const pickFile = (f) => {
    if (!f) return;
    setSubmitError('');
    const problem = validatePrescriptionFile(f);
    if (problem) {
      setFile(null);
      setFileError(problem);
      return;
    }
    setFileError('');
    setFile(f);
  };

  const onInputChange = (e) => {
    pickFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (mutation.isPending) return;
    pickFile(e.dataTransfer?.files?.[0]);
  };

  const focusField = (id) => formRef.current?.querySelector(`#${id}`)?.focus();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    let ok = true;
    let firstInvalid = null;

    if (isVet) {
      const errors = validateVet(vet, { controlledEnabled: vetControlledEnabled });
      setVetErrors(errors);
      const first = VET_FIELD_ORDER.find((f) => errors[f]);
      if (first) {
        ok = false;
        firstInvalid = () => focusField(VET_FIELD_IDS[first]);
      }
    }
    const problem = file ? validatePrescriptionFile(file) : `Anexe o arquivo da ${isVet ? 'receita veterinária' : 'sua receita médica'}.`;
    if (problem) {
      setFileError(problem);
      ok = false;
      firstInvalid ||= () => fileZoneRef.current?.focus();
    }
    if (!consent) {
      setConsentError('Para enviar a receita, marque a autorização de uso dos dados de saúde.');
      ok = false;
      firstInvalid ||= () => consentRef.current?.focus();
    }
    if (!ok) {
      firstInvalid?.();
      return;
    }
    mutation.mutate();
  };

  const changeKind = (value) => {
    setKindChoice(value);
    setVetErrors({});
    setSubmitError('');
  };

  const reset = () => {
    setFile(null);
    setNotes('');
    setVet(EMPTY_VET);
    setVetErrors({});
    setConsent(false);
    setConsentError('');
    setFileError('');
    setSubmitError('');
    setDone(false);
    mutation.reset();
  };

  const uploading = mutation.isPending;
  let step = 0;
  const nextStep = () => {
    step += 1;
    return step;
  };
  const describedBy = (field, extra) => [extra, vetErrors[field] && `${VET_FIELD_IDS[field]}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <>
      <PageHeader
        eyebrow={isVet ? 'Saúde do meu pet' : 'Minha saúde'}
        title="Nova cotação"
        description={
          isVet
            ? 'Envie a receita veterinária do seu pet. Farmácias habilitadas para manipulação veterinária respondem com preço e prazo, sem compromisso.'
            : 'Envie a receita da sua fórmula manipulada. Farmácias credenciadas respondem com preço e prazo, sem compromisso.'
        }
      />

      {vetEnabled && !done && <KindSelector kind={kind} onChange={changeKind} disabled={uploading} />}

      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <SuccessPanel key="success" onReset={reset} vet={isVet} />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
          >
            <Card className="gap-0 py-0">
              <CardContent className="p-4 sm:p-6">
                <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6" aria-busy={uploading}>
                  {/* Animal e prescritor (vertical veterinária) */}
                  {isVet && (
                    <fieldset className="space-y-4" disabled={uploading}>
                      <legend className="sr-only">Animal e médico veterinário prescritor</legend>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="font-heading text-base font-semibold text-foreground">{nextStep()}. Animal e prescritor</h2>
                        <Link to="/my-pets" className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline">
                          <PawPrint className="size-3.5" aria-hidden="true" /> Gerenciar pets
                        </Link>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pet-select">Animal *</Label>
                        {petsQ.isLoading ? (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Carregando seus animais…</p>
                        ) : petsQ.isError ? (
                          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash/60 px-4 py-3 text-sm">
                            <span className="flex-1">Não foi possível carregar seus animais.</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => petsQ.refetch()}>Tentar novamente</Button>
                          </div>
                        ) : pets.length === 0 ? (
                          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-mint-wash/50 p-4 sm:flex-row sm:items-center">
                            <p className="flex-1 text-sm text-foreground">Você ainda não cadastrou nenhum pet. Cadastre o animal para enviar a receita dele.</p>
                            <Button asChild size="sm">
                              <Link to="/my-pets"><Plus aria-hidden="true" /> Cadastrar pet</Link>
                            </Button>
                          </div>
                        ) : (
                          <NativeSelect
                            id="pet-select"
                            value={vet.petId}
                            onChange={(e) => setVetField('petId', e.target.value)}
                            aria-invalid={!!vetErrors.petId}
                            aria-describedby={describedBy('petId')}
                          >
                            <option value="">Selecione o animal…</option>
                            {pets.map((p) => (
                              <option key={p.id} value={p.id}>
                                {[p.name, speciesLabel(p.species), formatWeight(p.weightGrams)].filter(Boolean).join(' · ')}
                              </option>
                            ))}
                          </NativeSelect>
                        )}
                        <FieldError id="pet-select-error">{vetErrors.petId}</FieldError>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="prescriber-name">Nome do médico veterinário *</Label>
                        <Input
                          id="prescriber-name"
                          value={vet.prescriberName}
                          onChange={(e) => setVetField('prescriberName', e.target.value)}
                          placeholder="Ex.: Dra. Mariana Costa"
                          autoComplete="off"
                          className="h-11 rounded-lg bg-background"
                          aria-invalid={!!vetErrors.prescriberName}
                          aria-describedby={describedBy('prescriberName')}
                        />
                        <FieldError id="prescriber-name-error">{vetErrors.prescriberName}</FieldError>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <div className="space-y-2">
                          <Label htmlFor="prescriber-crmv">CRMV do prescritor *</Label>
                          <Input
                            id="prescriber-crmv"
                            value={vet.prescriberCrmv}
                            onChange={(e) => setVetField('prescriberCrmv', e.target.value)}
                            placeholder="Ex.: 12345"
                            inputMode="numeric"
                            autoComplete="off"
                            className="h-11 rounded-lg bg-background"
                            aria-invalid={!!vetErrors.prescriberCrmv}
                            aria-describedby={describedBy('prescriberCrmv', 'prescriber-crmv-help')}
                          />
                          <p id="prescriber-crmv-help" className="text-xs text-muted-foreground">Número que aparece no carimbo da receita.</p>
                          <FieldError id="prescriber-crmv-error">{vetErrors.prescriberCrmv}</FieldError>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prescriber-uf">UF do CRMV *</Label>
                          <NativeSelect
                            id="prescriber-uf"
                            value={vet.prescriberUf}
                            onChange={(e) => setVetField('prescriberUf', e.target.value)}
                            aria-invalid={!!vetErrors.prescriberUf}
                            aria-describedby={describedBy('prescriberUf')}
                          >
                            <option value="">UF</option>
                            {UFS_BRASIL.map((uf) => (
                              <option key={uf} value={uf}>{uf}</option>
                            ))}
                          </NativeSelect>
                          <FieldError id="prescriber-uf-error">{vetErrors.prescriberUf}</FieldError>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vet-document-type">Tipo de receita</Label>
                        <NativeSelect
                          id="vet-document-type"
                          value={vet.vetDocumentType}
                          onChange={(e) => setVetField('vetDocumentType', e.target.value)}
                          aria-invalid={!!vetErrors.vetDocumentType}
                          aria-describedby={describedBy('vetDocumentType')}
                        >
                          <option value="MAGISTRAL">{VET_DOCUMENT_LABELS.MAGISTRAL}</option>
                          {vetControlledEnabled && <option value="CONTROLLED_NOTIFICATION">{VET_DOCUMENT_LABELS.CONTROLLED_NOTIFICATION}</option>}
                        </NativeSelect>
                        <FieldError id="vet-document-type-error">{vetErrors.vetDocumentType}</FieldError>
                      </div>

                      {vet.vetDocumentType === 'CONTROLLED_NOTIFICATION' && vetControlledEnabled && (
                        <div className="space-y-2">
                          <Label htmlFor="controlled-notification-number">Número da notificação de receita *</Label>
                          <Input
                            id="controlled-notification-number"
                            value={vet.controlledNotificationNumber}
                            onChange={(e) => setVetField('controlledNotificationNumber', e.target.value)}
                            placeholder="Ex.: NOT-2026-98765"
                            autoComplete="off"
                            className="h-11 rounded-lg bg-background"
                            aria-invalid={!!vetErrors.controlledNotificationNumber}
                            aria-describedby={describedBy('controlledNotificationNumber', 'controlled-help')}
                          />
                          <p id="controlled-help" className="text-xs text-muted-foreground">
                            A farmácia confere a notificação manualmente e pode pedir a via original na entrega.
                          </p>
                          <FieldError id="controlled-notification-number-error">{vetErrors.controlledNotificationNumber}</FieldError>
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="pharmaceutical-form">Forma farmacêutica <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                          <NativeSelect
                            id="pharmaceutical-form"
                            value={vet.pharmaceuticalForm}
                            onChange={(e) => setVetField('pharmaceuticalForm', e.target.value)}
                          >
                            <option value="">A critério da farmácia</option>
                            {Object.entries(PHARMACEUTICAL_FORM_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </NativeSelect>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="flavoring">Sabor ou aromatização <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                          <Input
                            id="flavoring"
                            value={vet.flavoring}
                            onChange={(e) => setVetField('flavoring', e.target.value.slice(0, FLAVORING_MAX))}
                            maxLength={FLAVORING_MAX}
                            placeholder="Ex.: carne, frango, peixe"
                            className="h-11 rounded-lg bg-background"
                          />
                        </div>
                      </div>

                      <p className="flex items-start gap-2 rounded-xl border border-border bg-mint-wash/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>
                          <span className="font-medium text-foreground">Importante:</span> a farmácia credenciada confere a receita e a plataforma não substitui a orientação do médico veterinário.
                        </span>
                      </p>
                    </fieldset>
                  )}

                  {/* Arquivo */}
                  <div className="space-y-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">{nextStep()}. {isVet ? 'Receita veterinária' : 'Receita médica'}</h2>
                    <input
                      id="gallery-upload"
                      type="file"
                      accept={ACCEPT_ATTR}
                      onChange={onInputChange}
                      disabled={uploading}
                      className="peer sr-only"
                      aria-describedby="file-rules file-error"
                      aria-invalid={!!fileError}
                      aria-label="Escolher arquivo da receita (PDF, JPG ou PNG)"
                      ref={fileZoneRef}
                    />
                    {file ? (
                      <div className="rounded-2xl peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                        <FilePreview file={file} onRemove={() => setFile(null)} />
                      </div>
                    ) : (
                      <label
                        htmlFor="gallery-upload"
                        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false);
                        }}
                        onDrop={onDrop}
                        className={cn(
                          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 sm:py-12',
                          dragActive
                            ? 'border-primary bg-accent'
                            : fileError
                              ? 'border-[color-mix(in_oklab,var(--coral)_55%,var(--border))] bg-coral-wash/40'
                              : 'border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-mint-wash/50 hover:bg-mint-wash'
                        )}
                      >
                        <motion.span
                          animate={{ y: dragActive ? -4 : 0 }}
                          transition={{ duration: 0.2, ease: EASE_OUT }}
                          className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-background text-primary"
                        >
                          <Upload className="size-6" aria-hidden="true" />
                        </motion.span>
                        <span className="font-heading text-[0.9375rem] font-medium text-foreground">
                          {dragActive ? 'Solte o arquivo aqui' : (
                            <>
                              <span className="text-primary md:hidden">Escolher arquivo</span>
                              <span className="hidden md:inline">
                                Arraste a receita para cá ou <span className="text-primary underline-offset-2 hover:underline">escolha um arquivo</span>
                              </span>
                            </>
                          )}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FolderOpen className="size-3.5" aria-hidden="true" /> PDF, JPG ou PNG · até 10 MB
                        </span>
                      </label>
                    )}

                    <input
                      id="camera-upload"
                      type="file"
                      accept="image/jpeg,image/png"
                      capture="environment"
                      onChange={onInputChange}
                      disabled={uploading}
                      className="peer/cam sr-only"
                      aria-label="Tirar foto da receita com a câmera"
                    />
                    <label
                      htmlFor="camera-upload"
                      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted peer-focus-visible/cam:ring-3 peer-focus-visible/cam:ring-ring/50 md:hidden"
                    >
                      <Camera className="size-4 text-primary" aria-hidden="true" /> Tirar foto da receita
                    </label>

                    <p id="file-rules" className="text-xs leading-relaxed text-muted-foreground">
                      {isVet
                        ? 'A receita precisa estar legível e completa: medicamento, dosagem, identificação do animal, assinatura e carimbo com o CRMV do veterinário.'
                        : 'A receita precisa estar legível e completa: nome do medicamento, dosagem, assinatura e carimbo do médico.'}
                    </p>
                    {fileError && (
                      <p id="file-error" role="alert" className="flex items-start gap-1.5 text-sm font-medium text-[hsl(4_62%_42%)]">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {fileError}
                      </p>
                    )}
                  </div>

                  {/* Observações */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <Label htmlFor="quote-notes" className="font-heading text-base font-semibold">{nextStep()}. Observações <span className="font-sans text-sm font-normal text-muted-foreground">(opcional)</span></Label>
                      <span id="notes-count" className="num text-xs text-muted-foreground" aria-live="polite">
                        {notes.length}/{NOTES_MAX}
                      </span>
                    </div>
                    <Textarea
                      id="quote-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
                      maxLength={NOTES_MAX}
                      rows={3}
                      disabled={uploading}
                      placeholder={isVet ? 'Ex.: o pet aceita melhor petiscos; evitar corantes.' : 'Ex.: prefiro cápsula vegetal, sem corante.'}
                      aria-describedby="notes-help notes-count"
                      className="min-h-24 resize-y"
                    />
                    <p id="notes-help" className="text-xs text-muted-foreground">
                      As farmácias leem este texto para preparar a cotação — o arquivo da receita só é liberado para a farmácia que você escolher. Fica guardado de forma cifrada.
                    </p>
                  </div>

                  {/* Consentimento */}
                  <div className="space-y-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">{nextStep()}. Autorização</h2>
                    <ConsentBlock
                      terms={termsQ.data}
                      checked={consent}
                      onChange={(v) => {
                        setConsent(v);
                        if (v) setConsentError('');
                      }}
                      error={consentError}
                      revokedAt={revokedAt}
                      checkboxRef={consentRef}
                      vet={isVet}
                    />
                  </div>

                  {uploading && progress !== null && <UploadProgress value={progress} />}

                  {submitError && (
                    <div role="alert" className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash/60 px-4 py-3 text-sm text-foreground">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={uploading}>
                    {uploading ? <Spinner /> : <Send aria-hidden="true" />}
                    {uploading ? 'Enviando receita…' : 'Solicitar orçamento agora'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <aside className="space-y-4" aria-label="Como funciona e proteção dos dados">
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="eyebrow mb-3">Como funciona</p>
                <Stagger as="ol" step={0.12} inView={false} className="space-y-4">
                  {[
                    ['Envie a receita', 'Foto nítida ou PDF, em poucos segundos.'],
                    ['Receba cotações', isVet ? 'Farmácias habilitadas para uso veterinário respondem com preço e prazo.' : 'Farmácias credenciadas respondem com preço e prazo.'],
                    ['Escolha e acompanhe', 'Aprove a melhor proposta e siga a manipulação.'],
                  ].map(([title, text], i) => (
                    <StaggerItem as="li" key={title} y={8} className="flex gap-3">
                      <span className="num inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-primary">{i + 1}</span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{title}</span>
                        <span className="block text-xs leading-relaxed text-muted-foreground">{text}</span>
                      </span>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
              <div className="rounded-2xl border border-border bg-mint-wash/60 p-5">
                <p className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Seus dados protegidos
                </p>
                <ul className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
                  <li className="flex gap-2"><Lock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" /> O arquivo fica em armazenamento privado e só é aberto por link temporário.</li>
                  <li className="flex gap-2"><EyeOff className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" /> Metadados da foto, como localização, são removidos no envio.</li>
                  <li className="flex gap-2"><FileText className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" /> Cada visualização da receita fica registrada.</li>
                </ul>
              </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
