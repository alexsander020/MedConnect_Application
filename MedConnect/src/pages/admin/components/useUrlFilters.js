import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Filtros das listagens administrativas persistidos na query string
 * (?status=SUSPENDED&page=2), para que recarregar a página e o botão Voltar
 * devolvam o admin exatamente à mesma visão.
 *
 * `defaults` deve ser uma constante de módulo (identidade estável), ex.:
 *   const DEFAULTS = { search: '', status: 'ALL', page: 1, id: '' };
 * Valores iguais ao padrão não aparecem na URL. Números são lidos como inteiros > 0.
 *
 * - setFilter(key, value): altera um filtro e volta para a página 1
 * - setPage(n)
 * - setParam(key, value): altera sem mexer na página (ex.: `id` do painel de detalhe, `tab`)
 * - clear(keys): volta os filtros informados ao padrão
 */
export function useUrlFilters(defaults) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(() => {
    const out = {};
    for (const [key, def] of Object.entries(defaults)) {
      const raw = params.get(key);
      if (raw === null || raw === '') {
        out[key] = def;
      } else if (typeof def === 'number') {
        const n = Math.floor(Number(raw));
        out[key] = Number.isFinite(n) && n > 0 ? n : def;
      } else {
        out[key] = raw;
      }
    }
    return out;
  }, [params, defaults]);

  const patch = useCallback(
    (changes, { resetPage = false } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            const def = defaults[key];
            if (value === undefined || value === null || value === '' || value === def || String(value) === String(def)) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          if (resetPage && !('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setParams, defaults]
  );

  const setFilter = useCallback((key, value) => patch({ [key]: value }, { resetPage: true }), [patch]);
  const setPage = useCallback((page) => patch({ page }), [patch]);
  const setParam = useCallback((key, value) => patch({ [key]: value }), [patch]);
  const clear = useCallback(
    (keys) => patch(Object.fromEntries(keys.map((k) => [k, defaults[k]])), { resetPage: true }),
    [patch, defaults]
  );

  return { values, setFilter, setPage, setParam, clear, patch };
}

/** Quantos dos filtros informados estão diferentes do padrão */
export function countActive(values, defaults, keys) {
  return keys.filter((k) => values[k] !== defaults[k]).length;
}

/**
 * Mantém o último valor não vazio — usado para o painel de detalhe continuar mostrando
 * o registro enquanto anima o fechamento (o `id` já saiu da URL).
 */
export function useSticky(value) {
  const [kept, setKept] = useState(value);
  if (value && value !== kept) setKept(value);
  return value || kept;
}
