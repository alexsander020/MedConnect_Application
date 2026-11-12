import { AlertTriangle, PawPrint, User } from 'lucide-react';
import { cn } from 'cn';
import StatusBadge from '@/components/shared/StatusBadge';
import { CAPABILITY_STATUS_LABELS, VET_DOCUMENT_LABELS, formatAnimalAge, formatWeight, speciesLabel } from '@/lib/vet';
import { animalOf, prescriberLabel, prescriberOf } from './vetUtils';

/** Componentes da vertical veterinária na área da farmácia (VET_ENABLED). Helpers em ./vetUtils. */

/** Selo do tipo de receita: Humano / Veterinário */
export function KindBadge({ kind, className }) {
  const vet = kind === 'VETERINARY';
  return (
    <StatusBadge tone={vet ? 'info' : 'primary'} dot={false} className={cn('gap-1', className)}>
      {vet ? <PawPrint className="size-3" aria-hidden="true" /> : <User className="size-3" aria-hidden="true" />}
      {vet ? 'Veterinário' : 'Humano'}
    </StatusBadge>
  );
}

const CAPABILITY_TONES = { VERIFIED: 'success', PENDING_VERIFICATION: 'warning', REJECTED: 'error', SUSPENDED: 'error' };

export function CapabilityStatusBadge({ status, className }) {
  if (!status) return null;
  return (
    <StatusBadge tone={CAPABILITY_TONES[status] || 'neutral'} className={className}>
      {CAPABILITY_STATUS_LABELS[status] || status}
    </StatusBadge>
  );
}

/** Alerta para Notificação de Receita Veterinária (controle especial): a farmácia confere o documento */
export function ControlledDocumentAlert({ number, className }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--amber)_35%,var(--border))] bg-amber-wash px-3 py-2.5 text-xs font-medium leading-relaxed text-foreground',
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber" aria-hidden="true" />
      <span>
        Conferir documento: Notificação de Receita Veterinária
        {number ? <> · Nº <span className="num">{number}</span></> : null}
      </span>
    </p>
  );
}

/** Resumo do animal e do prescritor (mural, detalhe da receita e pedidos) */
export function VetAnimalSummary({ prescription, showPrescriber = true, showDocument = false, className }) {
  const animal = animalOf(prescription);
  const prescriber = showPrescriber ? prescriberOf(prescription) : null;
  const species = speciesLabel(animal?.species || prescription?.species);
  const weight = formatWeight(animal?.weightGrams ?? prescription?.weightGrams);
  const age = formatAnimalAge({
    birthDate: animal?.birthDate,
    approximateAgeMonths: animal?.approximateAgeMonths ?? prescription?.approximateAgeMonths,
  });
  const documentType = prescription?.vetDocumentType;

  return (
    <dl className={cn('grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-border bg-info-wash/40 px-3 py-3 text-sm', className)}>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Espécie / raça</dt>
        <dd className="truncate text-foreground">
          <span className="font-medium">{species || 'Não informada'}</span>
          {' · '}
          {animal?.breed || 'SRD'}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">Peso / idade</dt>
        <dd className="text-foreground">
          <span className="num font-medium">{weight || 'Não informado'}</span>
          {age ? ` · ${age}` : ''}
        </dd>
      </div>
      {prescriber && (
        <div className="col-span-2 min-w-0">
          <dt className="text-xs text-muted-foreground">Médico-veterinário prescritor</dt>
          <dd className="text-foreground">{prescriberLabel(prescriber)}</dd>
        </div>
      )}
      {showDocument && documentType && (
        <div className="col-span-2 min-w-0">
          <dt className="text-xs text-muted-foreground">Tipo de documento</dt>
          <dd className="text-foreground">{VET_DOCUMENT_LABELS[documentType] || documentType}</dd>
        </div>
      )}
      {animal?.isFoodProducing && (
        <div className="col-span-2">
          <dd className="text-xs font-medium text-[hsl(32_80%_32%)]">Animal de produção: respeite o período de carência.</dd>
        </div>
      )}
    </dl>
  );
}
