import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CalendarClock, Copy, Globe2, Plus, Save, Trash2, Undo2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import { EASE_OUT } from '@/components/motion';
import { useToast } from '@/context/ToastContext';
import { pharmacyApi } from '@/services/endpoints';
import { WEEKDAYS, WEEKDAYS_SHORT, WEEK_ORDER, groupByDay } from '@/lib/business-hours';
import {
  BRAZIL_TIMEZONES, MAX_INTERVALS_PER_DAY, copyDayTo, draftFromHours, draftSignature, draftToHours, draftToPayload,
  intervalsLabel, normalizeTime, sanitizeTimeInput, suggestNextInterval, uid, utcOffsetLabel, validateDraft,
} from './hours';
import { serverMessage } from './utils';

function TimeField({ id, label, value, onChange, onBlur, invalid, describedBy }) {
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="sr-only">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(sanitizeTimeInput(e.target.value))}
        onBlur={(e) => onBlur(normalizeTime(e.target.value))}
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH:MM"
        maxLength={5}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="num h-9 w-[5.25rem] px-2 text-center text-[0.9375rem]"
      />
    </div>
  );
}

function nowInZone(timeZone) {
  try {
    return new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date());
  } catch {
    return '';
  }
}

function DayRow({ dayOfWeek, day, errors, showErrors, touched, onChange, onToggle, onTouch, onCopy }) {
  const name = WEEKDAYS[dayOfWeek];
  const switchId = `hours-day-${dayOfWeek}`;
  const canAdd = day.intervals.length < MAX_INTERVALS_PER_DAY;

  const updateInterval = (ivId, patch) =>
    onChange({ ...day, intervals: day.intervals.map((iv) => (iv.id === ivId ? { ...iv, ...patch } : iv)) });
  const removeInterval = (ivId) => onChange({ ...day, intervals: day.intervals.filter((iv) => iv.id !== ivId) });
  const addInterval = () => onChange({ ...day, intervals: [...day.intervals, { id: uid(), ...suggestNextInterval(day.intervals) }] });

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Switch id={switchId} checked={day.open} onCheckedChange={onToggle} />
        <Label htmlFor={switchId} className="w-[4.75rem] font-heading text-[0.9375rem] font-medium">
          {name}
        </Label>
        <span className={cn('text-xs', day.open ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true">
          {day.open ? 'Aberta' : 'Fechada'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="ml-auto text-muted-foreground"
          onClick={onCopy}
          aria-label={`Copiar o horário de ${name.toLowerCase()} para os dias úteis`}
        >
          <Copy aria-hidden="true" /> <span className="hidden sm:inline">Copiar para dias úteis</span>
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {day.open && (
          <motion.div
            key="intervals"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-3 sm:pl-[calc(32px+0.75rem)]">
              {day.intervals.map((iv, i) => {
                const err = errors?.[i];
                const visible = err && (showErrors || touched[iv.id]);
                const errId = `${iv.id}-error`;
                const msg = visible ? err.interval || err.opensAt || err.closesAt : null;
                return (
                  <div key={iv.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <TimeField
                        id={`${iv.id}-open`}
                        label={`${name}, intervalo ${i + 1}: abre às`}
                        value={iv.opensAt}
                        invalid={!!(visible && (err.opensAt || err.interval))}
                        describedBy={msg ? errId : undefined}
                        onChange={(v) => updateInterval(iv.id, { opensAt: v })}
                        onBlur={(v) => {
                          updateInterval(iv.id, { opensAt: v });
                          onTouch(iv.id);
                        }}
                      />
                      <span className="text-sm text-muted-foreground" aria-hidden="true">às</span>
                      <TimeField
                        id={`${iv.id}-close`}
                        label={`${name}, intervalo ${i + 1}: fecha às`}
                        value={iv.closesAt}
                        invalid={!!(visible && (err.closesAt || err.interval))}
                        describedBy={msg ? errId : undefined}
                        onChange={(v) => updateInterval(iv.id, { closesAt: v })}
                        onBlur={(v) => {
                          updateInterval(iv.id, { closesAt: v });
                          onTouch(iv.id);
                        }}
                      />
                      {day.intervals.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeInterval(iv.id)}
                          aria-label={`Remover intervalo ${i + 1} de ${name.toLowerCase()}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    {msg && (
                      <p id={errId} className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" /> {msg}
                      </p>
                    )}
                  </div>
                );
              })}
              <Button type="button" variant="outline" size="xs" onClick={addInterval} disabled={!canAdd} className="mt-1">
                <Plus aria-hidden="true" /> Adicionar intervalo
              </Button>
              {!canAdd && <p className="text-xs text-muted-foreground">Máximo de {MAX_INTERVALS_PER_DAY} intervalos por dia.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/**
 * Aba "Horários": edição semanal + fuso, com pré-visualização ao vivo do rascunho.
 * PUT /pharmacy/me/hours { timezone, hours: [{ dayOfWeek, opensAt, closesAt }] } substitui a grade inteira.
 */
export default function HoursEditor({ pharmacy }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const summaryRef = useRef(null);
  const [draft, setDraft] = useState(() => draftFromHours(pharmacy?.businessHours, pharmacy?.timezone));
  const [savedSig, setSavedSig] = useState(() => draftSignature(draftFromHours(pharmacy?.businessHours, pharmacy?.timezone)));
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const dirty = draftSignature(draft) !== savedSig;
  const previewHours = useMemo(() => draftToHours(draft, { onlyValid: true }), [draft]);
  const previewByDay = useMemo(() => groupByDay(previewHours), [previewHours]);
  const [clock, setClock] = useState(() => nowInZone(draft.timezone));
  useEffect(() => {
    setClock(nowInZone(draft.timezone));
    const t = setInterval(() => setClock(nowInZone(draft.timezone)), 30_000);
    return () => clearInterval(t);
  }, [draft.timezone]);

  const zones = useMemo(() => {
    const list = BRAZIL_TIMEZONES.map((z) => ({ ...z, offset: utcOffsetLabel(z.value) }));
    if (draft.timezone && !list.some((z) => z.value === draft.timezone)) {
      list.unshift({ value: draft.timezone, label: draft.timezone, offset: utcOffsetLabel(draft.timezone) });
    }
    return list;
  }, [draft.timezone]);

  const mutation = useMutation({
    mutationFn: (payload) => pharmacyApi.updateHours(payload),
    onSuccess: (data, payload) => {
      queryClient.setQueryData(['pharmacyMe'], (old) =>
        old ? { ...old, timezone: data?.timezone ?? payload.timezone, businessHours: data?.businessHours ?? payload.hours, openStatus: data?.openStatus ?? old.openStatus } : old
      );
      queryClient.invalidateQueries({ queryKey: ['pharmacyMe'] });
      setSavedSig(JSON.stringify(payload));
      setServerError(null);
      setSubmitted(false);
      toast.success('Os pacientes já veem o novo horário na vitrine.', 'Horários salvos');
    },
    onError: (err) => {
      const msg = serverMessage(err, 'Não foi possível salvar os horários. Tente novamente.');
      setServerError(msg);
      toast.error(msg, 'Horários não salvos');
    },
  });

  const setDay = (d, day) => {
    setDraft((prev) => ({ ...prev, days: { ...prev.days, [d]: day } }));
    setServerError(null);
  };

  const save = () => {
    if (validation.count > 0) {
      setSubmitted(true);
      toast.warning('Corrija os horários destacados antes de salvar.', 'Há horários inválidos');
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    mutation.mutate(draftToPayload(draft));
  };

  const discard = () => {
    const saved = JSON.parse(savedSig);
    setDraft(draftFromHours(saved.hours, saved.timezone));
    setTouched({});
    setSubmitted(false);
    setServerError(null);
  };

  const openDays = WEEK_ORDER.filter((d) => draft.days[d].open).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="min-w-0 space-y-4">
        <Card className="gap-0 rounded-2xl py-0">
          <CardHeader className="border-b px-5 py-5">
            <CardTitle className="flex items-center gap-2 text-[1.0625rem]">
              <CalendarClock className="size-5 text-primary" aria-hidden="true" /> Horário semanal
            </CardTitle>
            <CardDescription>
              Formato 24 horas (HH:MM). Use <span className="num">24:00</span> para fechar à meia-noite e adicione intervalos para pausas, como o almoço.
            </CardDescription>
          </CardHeader>
          <ul className="divide-y divide-border" aria-label="Dias da semana">
            {WEEK_ORDER.map((d) => (
              <DayRow
                key={d}
                dayOfWeek={d}
                day={draft.days[d]}
                errors={validation.byDay[d]}
                showErrors={submitted}
                touched={touched}
                onChange={(day) => setDay(d, day)}
                onToggle={(open) => setDay(d, { ...draft.days[d], open })}
                onTouch={(id) => setTouched((t) => ({ ...t, [id]: true }))}
                onCopy={() => {
                  setDraft((prev) => copyDayTo(prev, d));
                  toast.info(`O horário de ${WEEKDAYS[d].toLowerCase()} foi copiado para segunda a sexta. Salve para aplicar.`, 'Horário copiado');
                }}
              />
            ))}
          </ul>
        </Card>

        {submitted && validation.count > 0 && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <p className="font-medium">Corrija {validation.count === 1 ? 'o horário abaixo' : `os ${validation.count} horários abaixo`} para salvar:</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-foreground/85">
              {validation.messages.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}
        {serverError && (
          <p role="alert" className="flex gap-2 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash px-4 py-3 text-sm text-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" /> {serverError}
          </p>
        )}

        <div
          className={cn(
            'z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-background/95 px-4 py-3 backdrop-blur',
            dirty && 'sticky bottom-3 shadow-[0_8px_30px_hsl(190_30%_12%/0.08)]'
          )}
        >
          <p className="w-full text-xs text-muted-foreground sm:mr-auto sm:w-auto" aria-live="polite">
            {dirty ? 'Alterações não salvas' : `Aberta ${openDays} ${openDays === 1 ? 'dia' : 'dias'} por semana`}
          </p>
          <Button type="button" variant="ghost" onClick={discard} disabled={!dirty || mutation.isPending}>
            <Undo2 aria-hidden="true" /> Descartar
          </Button>
          <Button type="button" onClick={save} disabled={!dirty || mutation.isPending}>
            {mutation.isPending ? <Spinner /> : <Save aria-hidden="true" />} Salvar horários
          </Button>
        </div>
      </div>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-24">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[1.0625rem]">
              <Globe2 className="size-5 text-primary" aria-hidden="true" /> Fuso horário
            </CardTitle>
            <CardDescription>Use o fuso da cidade onde a farmácia funciona.</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <Label htmlFor="hours-timezone" className="sr-only">Fuso horário</Label>
            <Select value={draft.timezone} onValueChange={(timezone) => setDraft((prev) => ({ ...prev, timezone }))}>
              <SelectTrigger id="hours-timezone" className="w-full data-[size=default]:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                {zones.map((z) => (
                  <SelectItem key={z.value} value={z.value}>
                    {z.label}{z.offset ? ` · ${z.offset}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clock && <p className="text-xs text-muted-foreground">Agora nesse fuso: <span className="num text-foreground">{clock}</span></p>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-mint-wash">
          <CardHeader>
            <CardTitle className="text-[1.0625rem]">Prévia na vitrine</CardTitle>
            <CardDescription>Como os pacientes veriam agora, considerando o rascunho.</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <div aria-live="polite">
              <OpenStatusPill hours={previewHours} timezone={draft.timezone} />
            </div>
            <ul className="space-y-1 text-sm" aria-label="Resumo do rascunho">
              {WEEK_ORDER.map((d) => (
                <li key={d} className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">{WEEKDAYS_SHORT[d]}</span>
                  <span className={cn('num text-right text-[0.8125rem]', previewByDay[d]?.length ? 'text-foreground' : 'text-muted-foreground')}>
                    {intervalsLabel(previewByDay[d])}
                  </span>
                </li>
              ))}
            </ul>
            {validation.count > 0 && <p className="text-xs text-muted-foreground">Intervalos inválidos não entram na prévia.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
