import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Info, PawPrint, Pencil, Plus, Trash2 } from 'lucide-react';
import { ESPECIES_ANIMAIS, validarPesoGramas } from '@medconnect/validation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/context/ToastContext';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { petsApi } from '@/services/endpoints';
import { formatAnimalAge, formatWeight, SPECIES_OPTION_LABELS, speciesLabel } from '@/lib/vet';
import { formatDate } from '@/lib/format';
import { friendlyError } from './components/patient-utils';
import { NativeSelect } from './components/vet-ui';

const NOTES_MAX = 500;
const EMPTY_FORM = { name: '', species: 'DOG', breed: '', weightKg: '', birthDate: '', isFoodProducing: false, notes: '' };

/** "8,5" ou "8.5" → 8500 g (null quando inválido) */
function parseWeightGrams(value) {
  const kg = Number.parseFloat(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(kg) || kg <= 0) return null;
  return Math.round(kg * 1000);
}

function toForm(pet) {
  if (!pet) return EMPTY_FORM;
  const kg = pet.weightGrams ? String(Number((pet.weightGrams / 1000).toFixed(3))).replace('.', ',') : '';
  return {
    name: pet.name || '',
    species: pet.species || 'DOG',
    breed: pet.breed || '',
    weightKg: kg,
    birthDate: pet.birthDate ? String(pet.birthDate).slice(0, 10) : '',
    isFoodProducing: !!pet.isFoodProducing,
    notes: pet.notes || '',
  };
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-sm font-medium text-[hsl(4_62%_42%)]">
      {children}
    </p>
  );
}

function PetForm({ pet, allowFoodProducing, saving, serverError, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toForm(pet));
  const [errors, setErrors] = useState({});
  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };
  const blockedFoodProducing = form.isFoodProducing && !allowFoodProducing;
  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Informe o nome do animal.';
    const weightGrams = parseWeightGrams(form.weightKg);
    if (weightGrams === null) next.weightKg = 'Informe o peso em kg (ex.: 4,5 ou 12,35).';
    else if (!validarPesoGramas(weightGrams)) next.weightKg = 'O peso precisa estar entre 0,01 kg e 1.500 kg.';
    setErrors(next);
    if (Object.keys(next).length > 0 || blockedFoodProducing) {
      const first = next.name ? 'pet-name' : next.weightKg ? 'pet-weight' : null;
      if (first) document.getElementById(first)?.focus();
      return;
    }
    onSubmit({
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || undefined,
      weightGrams,
      birthDate: form.birthDate ? new Date(`${form.birthDate}T12:00:00`).toISOString() : undefined,
      isFoodProducing: form.isFoodProducing,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--coral)_35%,var(--border))] bg-coral-wash/60 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="pet-name">Nome do animal *</Label>
        <Input
          id="pet-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex.: Thor, Mel, Nina"
          maxLength={80}
          autoComplete="off"
          className="h-11 rounded-lg bg-background"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'pet-name-error' : undefined}
        />
        <FieldError id="pet-name-error">{errors.name}</FieldError>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pet-species">Espécie *</Label>
          <NativeSelect id="pet-species" value={form.species} onChange={(e) => set('species', e.target.value)}>
            {ESPECIES_ANIMAIS.map((sp) => (
              <option key={sp} value={sp}>{SPECIES_OPTION_LABELS[sp] || sp}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pet-breed">Raça <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Input
            id="pet-breed"
            value={form.breed}
            onChange={(e) => set('breed', e.target.value)}
            placeholder="Ex.: Labrador, SRD, Siamês"
            maxLength={80}
            className="h-11 rounded-lg bg-background"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pet-weight">Peso em kg *</Label>
          <Input
            id="pet-weight"
            value={form.weightKg}
            onChange={(e) => set('weightKg', e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="Ex.: 8,5"
            inputMode="decimal"
            className="h-11 rounded-lg bg-background"
            aria-invalid={!!errors.weightKg}
            aria-describedby={['pet-weight-help', errors.weightKg && 'pet-weight-error'].filter(Boolean).join(' ')}
          />
          <p id="pet-weight-help" className="text-xs text-muted-foreground">Usado pelo farmacêutico para calcular a dose.</p>
          <FieldError id="pet-weight-error">{errors.weightKg}</FieldError>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pet-birth">Data de nascimento <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Input
            id="pet-birth"
            type="date"
            max={today}
            value={form.birthDate}
            onChange={(e) => set('birthDate', e.target.value)}
            className="h-11 rounded-lg bg-background"
          />
        </div>
      </div>

      <div className={`rounded-xl border p-3.5 ${form.isFoodProducing ? 'border-[color-mix(in_oklab,var(--amber)_45%,var(--border))] bg-amber-wash' : 'border-border bg-mint-wash/50'}`}>
        <div className="flex items-start gap-3">
          <Checkbox
            id="pet-food-producing"
            checked={form.isFoodProducing}
            onCheckedChange={(v) => set('isFoodProducing', v === true)}
            aria-describedby={blockedFoodProducing ? 'pet-food-warning' : undefined}
            className="mt-0.5 size-5 bg-background"
          />
          <Label htmlFor="pet-food-producing" className="cursor-pointer text-sm leading-snug font-medium">
            Este animal é destinado à produção ou alimentação humana?
          </Label>
        </div>
        {blockedFoodProducing && (
          <p id="pet-food-warning" role="alert" className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[hsl(32_80%_28%)]">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Aviso regulatório:</span> pelas normas do MAPA, a manipulação para animais destinados ao consumo exige habilitação específica, e a MedConnect ainda não atende essa categoria. Desmarque para cadastrar um animal de companhia.
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pet-notes">Observações de saúde ou alergias <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea
          id="pet-notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value.slice(0, NOTES_MAX))}
          maxLength={NOTES_MAX}
          rows={2}
          placeholder="Ex.: Alérgico a corante, prefere sabor carne"
          className="min-h-20 resize-y"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="submit" disabled={saving || blockedFoodProducing}>
          {saving && <Spinner />}
          {saving ? 'Salvando…' : pet ? 'Salvar alterações' : 'Salvar pet'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PetCard({ pet, onEdit, onRemove }) {
  const age = formatAnimalAge(pet);
  return (
    <article aria-label={pet.name} className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_hsl(190_30%_12%/0.04)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <PawPrint className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-heading text-base font-semibold text-foreground">{pet.name}</h3>
            {pet.isFoodProducing && <StatusBadge tone="warning">Produção de alimentos</StatusBadge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {[speciesLabel(pet.species), pet.breed].filter(Boolean).join(' · ')}
            {' · '}
            <span className="num font-medium text-foreground">{formatWeight(pet.weightGrams)}</span>
          </p>
        </div>
      </div>
      {(pet.birthDate || pet.notes) && (
        <div className="mt-3 space-y-1.5 text-sm">
          {pet.birthDate && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Nascimento: <span className="num">{formatDate(pet.birthDate)}</span>
              {age && <span>({age})</span>}
            </p>
          )}
          {pet.notes && <p className="whitespace-pre-line leading-relaxed text-foreground">{pet.notes}</p>}
        </div>
      )}
      <div className="mt-auto flex justify-end gap-2 pt-4">
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(pet)} aria-label={`Editar ${pet.name}`}>
          <Pencil aria-hidden="true" /> Editar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(pet)} aria-label={`Remover ${pet.name}`} className="text-[hsl(4_62%_42%)]">
          <Trash2 aria-hidden="true" /> Remover
        </Button>
      </div>
    </article>
  );
}

/** Meus pets: cadastro dos animais do tutor (vertical veterinária, VET_ENABLED) */
export default function MyPets() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { vetEnabled, vetAllowFoodProducing, isLoading: configLoading } = usePublicConfig();
  const [editor, setEditor] = useState(null); // { pet: null | Pet }
  const [serverError, setServerError] = useState('');
  const [toRemove, setToRemove] = useState(null);

  const petsQ = useQuery({ queryKey: ['myPets'], queryFn: petsApi.list, enabled: vetEnabled });
  const pets = Array.isArray(petsQ.data) ? petsQ.data : [];

  const save = useMutation({
    mutationFn: (payload) => (editor?.pet ? petsApi.update(editor.pet.id, payload) : petsApi.create(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPets'] });
      toast.success(editor?.pet ? 'Dados do animal atualizados.' : 'Animal cadastrado.');
      setEditor(null);
    },
    onError: (err) => setServerError(friendlyError(err, 'Não foi possível salvar o animal. Confira os dados e tente novamente.')),
  });

  const remove = useMutation({
    mutationFn: (id) => petsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPets'] });
      toast.success('Animal removido.');
      setToRemove(null);
    },
    onError: (err) => toast.error(friendlyError(err, 'Não foi possível remover o animal agora.')),
  });

  if (configLoading) return <LoadingState variant="cards" rows={3} message="Carregando…" />;
  if (!vetEnabled) return <Navigate to="/dashboard" replace />;

  const openEditor = (pet = null) => {
    setServerError('');
    save.reset();
    setEditor({ pet });
  };

  return (
    <>
      <PageHeader
        eyebrow="Saúde do meu pet"
        title="Meus pets"
        description="Cadastre seus animais para enviar receitas veterinárias. Peso e espécie ajudam a farmácia a calcular a fórmula."
        actions={
          <Button size="lg" onClick={() => openEditor(null)}>
            <Plus aria-hidden="true" /> Cadastrar pet
          </Button>
        }
      />

      <section aria-labelledby="animais-cadastrados">
        <h2 id="animais-cadastrados" className="mb-4 font-heading text-lg font-semibold text-foreground">Animais cadastrados</h2>
        {petsQ.isLoading ? (
          <LoadingState variant="cards" rows={3} message="Carregando seus animais…" />
        ) : petsQ.isError ? (
          <ErrorState
            title="Erro ao carregar seus animais"
            message="Não foi possível carregar a lista de pets. Verifique sua conexão e tente novamente."
            onRetry={() => petsQ.refetch()}
          />
        ) : pets.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title="Nenhum pet cadastrado"
            description="Cadastre seu primeiro animal para solicitar fórmulas veterinárias manipuladas."
          />
        ) : (
          <Stagger step={0.06} inView={false} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pets.map((pet) => (
              <StaggerItem key={pet.id} y={12} className="h-full">
                <PetCard pet={pet} onEdit={openEditor} onRemove={setToRemove} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      <Dialog open={!!editor} onOpenChange={(open) => !open && !save.isPending && setEditor(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editor?.pet ? 'Editar animal' : 'Novo animal'}</DialogTitle>
            <DialogDescription>Esses dados aparecem para a farmácia que cotar a receita do seu pet.</DialogDescription>
          </DialogHeader>
          {editor && (
            <PetForm
              key={editor.pet?.id || 'new'}
              pet={editor.pet}
              allowFoodProducing={vetAllowFoodProducing}
              saving={save.isPending}
              serverError={serverError}
              onSubmit={(payload) => {
                setServerError('');
                save.mutate(payload);
              }}
              onCancel={() => setEditor(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(open) => !open && !remove.isPending && setToRemove(null)}
        title={toRemove ? `Remover ${toRemove.name}?` : 'Remover animal?'}
        description="O animal sai da sua lista. Receitas e pedidos já enviados continuam no seu histórico."
        confirmLabel="Remover"
        destructive
        loading={remove.isPending}
        onConfirm={() => toRemove && remove.mutate(toRemove.id)}
      />
    </>
  );
}
