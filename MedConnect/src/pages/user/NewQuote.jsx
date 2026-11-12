import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle, Camera, EyeOff, FileText, FolderOpen, Lock, RefreshCw, Send, ShieldCheck, Upload, X,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { EASE_OUT, Stagger, StaggerItem } from '@/components/motion';
import { api } from '@/services/api';
import { privacyApi, publicApi } from '@/services/endpoints';
import { formatDate } from '@/lib/format';
import { errorCode, errorStatus, friendlyError } from './components/patient-utils';

/** Mesmas regras do servidor (multer 10 MB + magic bytes PDF/JPEG/PNG) */
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXT = /\.(pdf|jpe?g|png)$/i;
const ACCEPT_ATTR = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 10 * 1024 * 1024;
const NOTES_MAX = 500;

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

function SuccessPanel({ onReset }) {
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const next = [
    { title: 'Análise pelas farmácias', text: 'Farmácias de manipulação credenciadas avaliam a fórmula e preparam a cotação.' },
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
        Sua receita já está disponível para as farmácias credenciadas. Você será avisado assim que chegar a primeira cotação.
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

function ConsentBlock({ terms, checked, onChange, error, revokedAt, checkboxRef }) {
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
            Autorizo o tratamento dos dados de saúde desta receita para cotação, manipulação e entrega (LGPD, art. 11, I).
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

/** Nova cotação: envio da receita (PDF/JPG/PNG até 10 MB) com consentimento versionado */
export default function NewQuote() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [revokedFlag, setRevokedFlag] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(false);
  const consentRef = useRef(null);
  const fileZoneRef = useRef(null);

  const termsQ = useQuery({ queryKey: ['consentTerms'], queryFn: publicApi.consentTerms, staleTime: 60 * 60 * 1000, retry: 0 });
  const consentQ = useQuery({ queryKey: ['consentStatus'], queryFn: privacyApi.consentStatus, retry: 0 });
  const isRevoked = revokedFlag || consentQ.data?.isRevoked === true;
  const revokedAt = isRevoked ? consentQ.data?.latestConsent?.revokedAt || null : undefined;

  const mutation = useMutation({
    mutationFn: async () => {
      // Após uma revogação o servidor bloqueia novos envios: o aceite explícito desta tela registra um novo consentimento
      if (isRevoked) await privacyApi.giveConsent('HEALTH_DATA_PROCESSING');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consent', 'true');
      if (notes.trim()) formData.append('notes', notes.trim());
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    let ok = true;
    const problem = file ? validatePrescriptionFile(file) : 'Anexe o arquivo da sua receita médica.';
    if (problem) {
      setFileError(problem);
      ok = false;
    }
    if (!consent) {
      setConsentError('Para enviar a receita, marque a autorização de uso dos dados de saúde.');
      ok = false;
    }
    if (!ok) {
      if (problem) fileZoneRef.current?.focus();
      else consentRef.current?.focus();
      return;
    }
    mutation.mutate();
  };

  const reset = () => {
    setFile(null);
    setNotes('');
    setConsent(false);
    setConsentError('');
    setFileError('');
    setSubmitError('');
    setDone(false);
    mutation.reset();
  };

  const uploading = mutation.isPending;

  return (
    <>
      <PageHeader
        eyebrow="Minha saúde"
        title="Nova cotação"
        description="Envie a receita da sua fórmula manipulada. Farmácias credenciadas respondem com preço e prazo, sem compromisso."
      />

      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <SuccessPanel key="success" onReset={reset} />
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
                <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-busy={uploading}>
                  {/* Arquivo */}
                  <div className="space-y-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">1. Receita médica</h2>
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
                      A receita precisa estar legível e completa: nome do medicamento, dosagem, assinatura e carimbo do médico.
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
                      <Label htmlFor="quote-notes" className="font-heading text-base font-semibold">2. Observações <span className="font-sans text-sm font-normal text-muted-foreground">(opcional)</span></Label>
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
                      placeholder="Ex.: prefiro cápsula vegetal, sem corante."
                      aria-describedby="notes-help notes-count"
                      className="min-h-24 resize-y"
                    />
                    <p id="notes-help" className="text-xs text-muted-foreground">
                      As farmácias leem este texto para preparar a cotação — o arquivo da receita só é liberado para a farmácia que você escolher. Fica guardado de forma cifrada.
                    </p>
                  </div>

                  {/* Consentimento */}
                  <div className="space-y-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">3. Autorização</h2>
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
                    ['Receba cotações', 'Farmácias credenciadas respondem com preço e prazo.'],
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
