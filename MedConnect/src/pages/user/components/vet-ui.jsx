import { forwardRef } from 'react';
import { ChevronDown, PawPrint } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';

/** Selo da vertical veterinária (receitas, cotações e pedidos de pets) */
export function VetBadge({ children = 'Veterinária', className }) {
  return (
    <Badge variant="secondary" className={cn('gap-1 bg-accent text-accent-foreground', className)}>
      <PawPrint aria-hidden="true" />
      {children}
    </Badge>
  );
}

/**
 * Select nativo com o visual dos campos do design system.
 * Nativo de propósito: abre o seletor do sistema no celular e funciona com leitores de tela e testes.
 */
export const NativeSelect = forwardRef(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-background py-1 pr-9 pl-3 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  );
});
