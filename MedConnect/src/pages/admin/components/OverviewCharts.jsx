import { useId, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Table2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { EASE_OUT } from '@/components/motion';
import { formatNumber } from '@/lib/format';

/**
 * Gráficos da visão geral, em HTML/CSS (sem biblioteca de gráficos).
 *
 * Paleta das séries validada com o validador do skill de dataviz (OKLab/CVD) contra a superfície
 * branca e a escura (#182225): menta #109a7c × laranja #e06a1a — ΔE normal 25,6, CVD 11,2 (protan),
 * contraste ≥ 3:1 nos dois modos. Os tokens --chart-* do tema não passam (menta abaixo do piso de
 * croma e menta × azul abaixo de ΔE 15), por isso as séries são definidas aqui.
 */
const SERIES = [
  { key: 'prescriptions', label: 'Receitas enviadas', color: '#109a7c' },
  { key: 'orders', label: 'Pedidos criados', color: '#e06a1a' },
];

const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const longFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
// `date` chega como "AAAA-MM-DD" (dia no fuso da operação): formata em UTC para não deslocar o dia
const asDate = (key) => new Date(`${key}T00:00:00Z`);

/** Escala com passos "redondos" (1, 2, 5 × 10ⁿ) e no máximo 5 marcas */
function niceScale(max) {
  if (max <= 4) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

function Legend({ totals }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm" aria-label="Legenda">
      {SERIES.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-2 text-muted-foreground">
          <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
          <span className="text-foreground">{s.label}</span>
          <span className="num text-[0.8125rem]">{formatNumber(totals[s.key])} no período</span>
        </li>
      ))}
    </ul>
  );
}

/** Receitas × pedidos por dia (colunas agrupadas). Uma parada de teclado; setas ←/→ percorrem os dias. */
export function DailyActivityChart({ series = [], busy = false }) {
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const tipId = useId();
  const totals = Object.fromEntries(SERIES.map((s) => [s.key, series.reduce((sum, d) => sum + (d[s.key] || 0), 0)]));
  const max = Math.max(0, ...series.flatMap((d) => SERIES.map((s) => d[s.key] || 0)));
  const { top, ticks } = niceScale(max);
  const last = series.length - 1;
  const hovered = active !== null ? series[active] : null;

  const onKeyDown = (e) => {
    if (!series.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      setActive((i) => (i === null ? (delta > 0 ? 0 : last) : Math.min(last, Math.max(0, i + delta))));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : last);
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  const summary = `Receitas e pedidos por dia nos últimos ${series.length} dias: ${formatNumber(totals.prescriptions)} receitas e ${formatNumber(totals.orders)} pedidos. Use as setas para percorrer os dias.`;

  return (
    <div className={cn('transition-opacity duration-200', busy && 'opacity-60')}>
      <Legend totals={totals} />

      <div className="relative mt-5 flex h-[232px] gap-2">
        {/* Eixo Y */}
        <div aria-hidden="true" className="w-7 shrink-0">
          <div className="relative h-[200px]">
            {ticks.map((t) => (
              <span key={t} className="num absolute right-0 translate-y-1/2 text-[0.6875rem] font-medium leading-none text-muted-foreground" style={{ bottom: `${(t / top) * 100}%` }}>
                {formatNumber(t)}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Área do gráfico: 200px de plot + 32px de rótulos */}
          <div
            role="group"
            tabIndex={0}
            aria-label={summary}
            aria-describedby={hovered ? tipId : undefined}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="relative h-[200px] rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {/* Grade (hairline sólida, recessiva) */}
            {ticks.map((t) => (
              <span key={t} aria-hidden="true" className={cn('absolute inset-x-0 h-px', t === 0 ? 'bg-foreground/25' : 'bg-border')} style={{ bottom: `${(t / top) * 100}%` }} />
            ))}

            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${series.length || 1}, minmax(0, 1fr))` }}>
              {series.map((d, i) => (
                <div
                  key={d.date}
                  aria-hidden="true"
                  onPointerEnter={() => setActive(i)}
                  onPointerMove={() => active !== i && setActive(i)}
                  className={cn('relative flex h-full items-end justify-center gap-[2px] rounded-md transition-colors duration-150', active === i && 'bg-mint-wash/80')}
                >
                  {SERIES.map((s, si) => {
                    const v = d[s.key] || 0;
                    return (
                      <motion.span
                        key={s.key}
                        className="block w-[min(14px,34%)] rounded-t-[4px]"
                        style={{
                          height: v > 0 ? `max(2px, ${(v / top) * 100}%)` : 0,
                          background: s.color,
                          originY: 1,
                        }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 + i * 0.025 + si * 0.04 }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {series.length > 0 && max === 0 && (
              <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-muted-foreground">
                Nenhuma receita ou pedido nos últimos {series.length} dias.
              </p>
            )}

            {hovered && (
              <div
                id={tipId}
                role="status"
                className="pointer-events-none absolute top-2 z-10 w-max min-w-[168px] rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-md"
                style={{
                  // Ao lado da coluna em foco (à direita na 1ª metade, à esquerda na 2ª), sem cobrir as barras dela
                  left: `${((active + 0.5) / series.length) * 100}%`,
                  transform: active < series.length / 2 ? 'translateX(18px)' : 'translateX(calc(-100% - 18px))',
                }}
              >
                <p className="mb-1.5 font-medium text-muted-foreground first-letter:uppercase">{longFmt.format(asDate(hovered.date))}</p>
                <ul className="space-y-1">
                  {SERIES.map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                      <span className="num text-sm text-foreground">{formatNumber(hovered[s.key] || 0)}</span>
                      <span className="text-muted-foreground">{s.label.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Eixo X */}
          <div aria-hidden="true" className="grid h-8 items-start pt-2" style={{ gridTemplateColumns: `repeat(${series.length || 1}, minmax(0, 1fr))` }}>
            {series.map((d, i) => (
              <span
                key={d.date}
                className={cn(
                  // Pode transbordar a própria coluna: no celular a vizinha fica sem rótulo
                  'num justify-self-center whitespace-nowrap text-center text-[0.6875rem] font-medium',
                  i === last ? 'text-foreground' : 'text-muted-foreground',
                  // No celular só metade dos rótulos cabe: mantém o último (hoje) e um a cada dois
                  (last - i) % 2 === 1 && 'invisible sm:visible'
                )}
              >
                {i === last ? 'hoje' : dayFmt.format(asDate(d.date))}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} aria-controls={tableId} className="-ml-2 text-muted-foreground">
          <Table2 aria-hidden="true" /> {showTable ? 'Ocultar tabela' : 'Ver como tabela'}
          <ChevronDown className={cn('transition-transform duration-200', showTable && 'rotate-180')} aria-hidden="true" />
        </Button>
        {showTable && (
          <div id={tableId} className="mt-2 max-h-72 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Receitas e pedidos por dia</caption>
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Dia</th>
                  {SERIES.map((s) => (
                    <th key={s.key} scope="col" className="px-3 py-2 text-right font-medium">{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((d) => (
                  <tr key={d.date} className="border-t border-border">
                    <th scope="row" className="px-3 py-1.5 text-left font-normal first-letter:uppercase">{longFmt.format(asDate(d.date))}</th>
                    {SERIES.map((s) => (
                      <td key={s.key} className="num px-3 py-1.5 text-right text-[0.8125rem]">{formatNumber(d[s.key] || 0)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Funil receitas → cotadas → pedidos → entregues. Uma série (uma cor); cada etapa traz o valor
 * na ponta da barra e a conversão em relação à etapa anterior.
 */
export function ConversionFunnel({ stages = [] }) {
  const first = stages[0]?.value || 0;
  return (
    <ol className="space-y-4">
      {stages.map((stage, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const width = first > 0 ? (stage.value / first) * 100 : 0;
        const conversion = prev ? Math.round((stage.value / prev) * 100) : null;
        return (
          <li key={stage.key} className="grid gap-1.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{stage.label}</p>
              <p className="text-xs text-muted-foreground">
                {i === 0 ? 'Base do funil' : conversion === null ? 'Sem base na etapa anterior' : `${conversion}% da etapa anterior`}
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative h-5 min-w-0 flex-1">
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 block rounded-r-[4px]"
                  style={{ width: stage.value > 0 ? `max(3px, ${width}%)` : 0, background: SERIES[0].color, originX: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 + i * 0.08 }}
                />
              </div>
              <span className="num w-14 shrink-0 text-right text-sm text-foreground">{formatNumber(stage.value)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
