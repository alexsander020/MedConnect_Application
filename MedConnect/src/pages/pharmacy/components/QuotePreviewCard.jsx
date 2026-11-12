import { motion, AnimatePresence } from 'motion/react';
import { Truck, MessageSquareText, Eye, FlaskConical } from 'lucide-react';
import { cn } from 'cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import StarRating from '@/components/StarRating';
import { EASE_OUT } from '@/components/motion';
import { initials } from '@/lib/format';
import { deliveryDaysLabel } from './utils';

/**
 * Pré-visualização ao vivo de como o paciente (ou o tutor, na receita veterinária) verá a proposta.
 * Puramente ilustrativa: o botão de aceite é decorativo e fica fora da ordem de tabulação.
 * `vetSpecs` (opcional): forma farmacêutica, aromatização e tempo de manipulação da proposta veterinária.
 */
export default function QuotePreviewCard({
  pharmacyName, hours, timezone, priceLabel, deliveryDays, notes, rating, reviewsCount, className, audience = 'paciente', vetSpecs,
}) {
  const name = pharmacyName || 'Sua farmácia';
  const specs = vetSpecs ? [vetSpecs.pharmaceuticalForm, vetSpecs.flavoring].filter(Boolean) : [];
  const prepDays = vetSpecs?.estimatedPreparationDays;
  return (
    <section aria-label="Pré-visualização da proposta" className={cn('space-y-3', className)}>
      <p className="eyebrow flex items-center gap-1.5">
        <Eye className="size-3.5" aria-hidden="true" /> Como o {audience} vai ver
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_hsl(190_30%_12%/0.06)]">
        <div className="flex items-start gap-3 border-b border-border bg-mint-wash px-5 py-4">
          <Avatar className="size-11">
            <AvatarFallback className="bg-background font-heading text-sm font-semibold text-primary">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate font-heading text-[0.9375rem] font-semibold text-foreground">{name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <OpenStatusPill hours={hours} timezone={timezone} size="sm" />
              {reviewsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <StarRating rating={rating} size={12} />
                  <span className="num">{Number(rating).toFixed(1).replace('.', ',')}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Valor total</p>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={priceLabel || 'empty'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className={cn('num text-[2rem] leading-tight tracking-tight', priceLabel ? 'text-foreground' : 'text-muted-foreground/60')}
              >
                {priceLabel || 'R$ —'}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="flex items-center gap-2 text-sm text-foreground">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-primary">
              <Truck className="size-4" aria-hidden="true" />
            </span>
            {deliveryDays ? <>Manipulação e entrega em até <span className="num">{deliveryDaysLabel(deliveryDays)}</span></> : 'Informe o prazo de entrega'}
          </p>
          {(specs.length > 0 || prepDays) && (
            <p className="flex items-start gap-2 text-sm text-foreground">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-info-wash text-info">
                <FlaskConical className="size-4" aria-hidden="true" />
              </span>
              <span className="pt-1.5">
                {specs.join(' · ')}
                {prepDays ? <>{specs.length ? ' · ' : ''}manipulação em <span className="num">{prepDays}</span> {Number(prepDays) === 1 ? 'dia' : 'dias'}</> : null}
              </span>
            </p>
          )}
          <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageSquareText className="size-3.5" aria-hidden="true" /> Observações da farmácia
            </p>
            <p className={cn('whitespace-pre-line break-words text-sm leading-relaxed', notes ? 'text-foreground' : 'text-muted-foreground/70')}>
              {notes || 'Suas observações aparecem aqui (insumos, embalagem, cuidados na entrega).'}
            </p>
          </div>
          <div aria-hidden="true" className="flex h-10 select-none items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground opacity-90">
            Aprovar cotação
          </div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        O {audience} compara as propostas recebidas e escolhe uma. As propostas não escolhidas são encerradas automaticamente.
      </p>
    </section>
  );
}
