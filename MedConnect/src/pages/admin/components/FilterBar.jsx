import { useId } from 'react';
import { FilterX } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Linha única de filtros acima da listagem. `activeCount` > 0 mostra "Limpar filtros".
 */
export function FilterBar({ children, activeCount = 0, onClear, className, aside }) {
  return (
    <div
      role="search"
      aria-label="Filtros da listagem"
      className={cn('mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center', className)}
    >
      {children}
      {activeCount > 0 && onClear && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear} className="self-start md:self-auto">
          <FilterX aria-hidden="true" /> Limpar filtros
          <span className="num rounded-full bg-accent px-1.5 text-[0.6875rem] text-primary">{activeCount}</span>
        </Button>
      )}
      {aside && <div className="md:ml-auto">{aside}</div>}
    </div>
  );
}

/**
 * Select de filtro com opção "todos" (valor 'ALL', que `clean()` remove da query da API).
 * options: [{ value, label }]
 */
export function FilterSelect({ label, value, onChange, options, allLabel = 'Todos', className }) {
  const id = useId();
  return (
    <div className={cn('w-full md:w-[210px]', className)}>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Select value={value || 'ALL'} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value="ALL">{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
