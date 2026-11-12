import { Star } from 'lucide-react';
import { cn } from 'cn';

/** Estrelas de avaliação. `interactive` vira um radiogroup acessível. */
export default function StarRating({ rating = 0, size = 16, interactive = false, onChange, className, label = 'Avaliação' }) {
  const value = Math.round(Number(rating) || 0);
  if (!interactive) {
    return (
      <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${label}: ${Number(rating || 0).toFixed(1).replace('.', ',')} de 5`}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={size} aria-hidden="true" className={s <= value ? 'fill-amber text-amber' : 'text-border'} />
        ))}
      </span>
    );
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={s === value}
          aria-label={`${s} ${s === 1 ? 'estrela' : 'estrelas'}`}
          onClick={() => onChange?.(s)}
          className="rounded-md p-1 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Star size={size} aria-hidden="true" className={s <= value ? 'fill-amber text-amber' : 'text-border'} />
        </button>
      ))}
    </div>
  );
}
