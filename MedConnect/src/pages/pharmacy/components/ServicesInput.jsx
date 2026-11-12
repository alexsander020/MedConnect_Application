import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EASE_OUT } from '@/components/motion';

const SUGGESTIONS = ['Dermatológicos', 'Fitoterápicos', 'Florais', 'Suplementos', 'Veterinária', 'Homeopatia', 'Entrega refrigerada'];

/**
 * Lista de serviços como "etiquetas" (PATCH /pharmacy/me → services: string[] ≤ 12, cada ≤ 40).
 * Enter ou vírgula adicionam; Backspace com o campo vazio remove a última.
 */
export default function ServicesInput({ id, value = [], onChange, max = 12, maxLength = 40, describedBy }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const full = value.length >= max;

  const add = (raw) => {
    const v = String(raw ?? text).trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (v.length > maxLength) return setError(`Cada serviço pode ter até ${maxLength} caracteres.`);
    if (full) return setError(`Limite de ${max} serviços atingido. Remova um para adicionar outro.`);
    if (value.some((s) => s.toLowerCase() === v.toLowerCase())) return setError('Este serviço já está na lista.');
    onChange([...value, v]);
    setText('');
    setError(null);
  };

  const remove = (s) => {
    onChange(value.filter((x) => x !== s));
    setError(null);
  };

  const suggestions = SUGGESTIONS.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 5);

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Serviços cadastrados">
          <AnimatePresence initial={false}>
            {value.map((s) => (
              <motion.li
                key={s}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--primary)_25%,transparent)] bg-accent pl-3 pr-1 text-sm text-accent-foreground"
              >
                <span className="max-w-[16rem] truncate">{s}</span>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  aria-label={`Remover serviço ${s}`}
                  className="inline-flex size-6 items-center justify-center rounded-full text-accent-foreground/70 transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={text}
          maxLength={maxLength}
          disabled={full}
          onChange={(e) => {
            setText(e.target.value.replace(',', ''));
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && !text && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={full ? 'Limite atingido' : 'Ex.: Dermatológicos'}
          aria-invalid={!!error}
          aria-describedby={[describedBy, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined}
          className="h-10"
        />
        <Button type="button" variant="outline" className="h-10" onClick={() => add()} disabled={full || !text.trim()}>
          <Plus aria-hidden="true" /> Adicionar
        </Button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">{error}</p>}
      {!full && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Sugestões:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
