import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from 'cn';
import { Input } from '@/components/ui/input';

/** Campo de busca com debounce (300ms) */
export default function SearchField({ value = '', onChange, placeholder = 'Buscar…', className, label = 'Buscar', delay = 300 }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return undefined;
    const t = setTimeout(() => onChange?.(local), delay);
    return () => clearTimeout(t);
  }, [local, value, onChange, delay]);

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        aria-label={label}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-10 pl-9 pr-9"
      />
      {local && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => {
            setLocal('');
            onChange?.('');
          }}
          className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
