import { cn } from 'cn';
import StarRating from '@/components/StarRating';

/** Nota média + quantidade de avaliações; sem avaliações, diz isso com clareza */
export default function RatingSummary({ averageRating, reviewsCount = 0, compact = false, className }) {
  const count = Number(reviewsCount) || 0;
  if (count === 0) {
    return <span className={cn('text-sm text-muted-foreground', className)}>Sem avaliações ainda</span>;
  }
  const avg = Number(averageRating || 0).toFixed(1).replace('.', ',');
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm', className)}>
      <StarRating rating={averageRating} size={compact ? 13 : 15} label="Nota média" />
      <span className="num text-foreground">{avg}</span>
      <span className="text-muted-foreground">
        ({count} {count === 1 ? 'avaliação' : 'avaliações'})
      </span>
    </span>
  );
}
