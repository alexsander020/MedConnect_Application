import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Estado de carregamento com skeletons (evita "pulo" de layout).
 * variant: 'cards' | 'list' | 'table' | 'detail'
 */
export default function LoadingState({ message = 'Carregando informações...', variant = 'list', rows = 4, className }) {
  return (
    <div data-testid="loading-state" aria-busy="true" aria-live="polite" className={cn('w-full', className)}>
      <span className="sr-only">{message}</span>
      {variant === 'cards' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
      )}
      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-2xl" />
          ))}
        </div>
      )}
      {variant === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Skeleton className="h-11 rounded-none" />
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 border-t border-border px-4 py-3.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      )}
      {variant === 'detail' && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      )}
    </div>
  );
}
