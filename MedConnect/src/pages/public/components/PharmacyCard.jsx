import { BadgeCheck, MapPin, Truck } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import PharmacyHours from './PharmacyHours';
import RatingSummary from './RatingSummary';
import { formatLocation } from './pharmacy-utils';

const MAX_SERVICES = 5;

/** Card do diretório público de farmácias credenciadas (sem telefone, e-mail ou endereço) */
export default function PharmacyCard({ pharmacy, className, headingLevel = 'h2' }) {
  const Heading = headingLevel;
  const services = Array.isArray(pharmacy.services) ? pharmacy.services : [];
  const extra = services.length - MAX_SERVICES;

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_hsl(190_22%_16%/0.04)] transition-colors hover:border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] sm:p-6',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading className="font-heading text-lg font-semibold leading-snug text-foreground">{pharmacy.name}</Heading>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {formatLocation(pharmacy)}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
          <BadgeCheck className="size-3.5" aria-hidden="true" /> Credenciada
        </span>
      </div>

      <OpenStatusPill hours={pharmacy.businessHours} timezone={pharmacy.timezone} size="sm" className="mt-4 self-start" />

      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {pharmacy.description || 'Farmácia de manipulação credenciada na MedConnect.'}
      </p>

      {services.length > 0 && (
        <ul aria-label="Serviços" className="mt-4 flex flex-wrap gap-1.5">
          {services.slice(0, MAX_SERVICES).map((s) => (
            <li key={s}>
              <Badge variant="secondary" className="h-6 rounded-full px-2.5 font-normal">
                {s}
              </Badge>
            </li>
          ))}
          {extra > 0 && (
            <li>
              <Badge variant="outline" className="h-6 rounded-full px-2.5 font-normal text-muted-foreground" title={services.slice(MAX_SERVICES).join(', ')}>
                +{extra}
              </Badge>
            </li>
          )}
        </ul>
      )}

      <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm">
        <div className="flex items-start gap-2">
          <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="sr-only">Área de entrega</dt>
            <dd className="text-foreground">{pharmacy.deliveryArea || 'Área de entrega informada na cotação'}</dd>
          </div>
        </div>
        <div>
          <dt className="sr-only">Avaliações</dt>
          <dd>
            <RatingSummary averageRating={pharmacy.averageRating} reviewsCount={pharmacy.reviewsCount} />
          </dd>
        </div>
      </dl>

      {pharmacy.businessHours?.length > 0 && (
        <div className="mt-auto pt-3">
          <PharmacyHours name={pharmacy.name} hours={pharmacy.businessHours} timezone={pharmacy.timezone} />
        </div>
      )}
    </article>
  );
}
