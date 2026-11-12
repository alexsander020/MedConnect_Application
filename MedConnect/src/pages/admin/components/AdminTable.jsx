import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from 'cn';
import { TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Stagger, StaggerItem } from '@/components/motion';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Tabela administrativa: cabeçalho fixo, rolagem horizontal no próprio contêiner,
 * linhas escalonadas (0.04s) e cartões empilhados no celular (<768px).
 *
 * columns: [{
 *   key, header, cell: (row) => node,
 *   className, headClassName,
 *   primary   — vira o título do cartão no celular (padrão: 1ª coluna)
 *   mobile    — false esconde a coluna no cartão
 *   mobileLabel, mobileFull (ocupa as 2 colunas do cartão)
 * }]
 * onRowClick(row)       — abre o detalhe (linha inteira clicável + botão acessível no fim)
 * renderExpanded(row)   — em vez de abrir detalhe, expande a linha
 * rowLabel(row)         — nome usado no rótulo acessível do botão da linha
 * busy                  — recarregando: mantém o quadro anterior com opacidade reduzida
 */
export default function AdminTable({
  columns,
  rows,
  getRowId = (row) => row.id,
  onRowClick,
  renderExpanded,
  rowLabel = () => 'registro',
  caption,
  busy = false,
  className,
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(() => new Set());
  const interactive = Boolean(onRowClick || renderExpanded);
  const rowsKey = rows.map(getRowId).join('|');

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const activate = (row) => (renderExpanded ? toggle(getRowId(row)) : onRowClick?.(row));
  const actionLabel = (row, open) =>
    renderExpanded ? `${open ? 'Ocultar' : 'Mostrar'} detalhes de ${rowLabel(row)}` : `Abrir detalhes de ${rowLabel(row)}`;

  if (isMobile) {
    const primary = columns.find((c) => c.primary) || columns[0];
    const rest = columns.filter((c) => c !== primary && c.mobile !== false);
    return (
      <Stagger
        as="ul"
        key={rowsKey}
        step={0.04}
        inView={false}
        aria-label={caption}
        aria-busy={busy || undefined}
        className={cn('space-y-3 transition-opacity duration-200', busy && 'opacity-60', className)}
      >
        {rows.map((row) => {
          const id = getRowId(row);
          const open = expanded.has(id);
          return (
            <StaggerItem as="li" key={id} y={8}>
              <div className={cn('relative isolate rounded-2xl border border-border bg-card transition-colors', open && 'border-primary/40')}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-[0.9375rem] font-medium">
                      {interactive ? (
                        <button
                          type="button"
                          onClick={() => activate(row)}
                          aria-expanded={renderExpanded ? open : undefined}
                          aria-controls={renderExpanded ? `${id}-details` : undefined}
                          aria-label={actionLabel(row, open)}
                          className="block w-full min-w-0 text-left after:absolute after:inset-0 after:-z-10 after:rounded-2xl after:transition-colors hover:after:bg-mint-wash/40 focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                        >
                          {primary.cell(row)}
                        </button>
                      ) : (
                        primary.cell(row)
                      )}
                    </div>
                    {interactive &&
                      (renderExpanded ? (
                        <ChevronDown className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
                      ) : (
                        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      ))}
                  </div>
                  {rest.length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                      {rest.map((c) => (
                        <div key={c.key} className={cn('min-w-0', c.mobileFull && 'col-span-2')}>
                          <dt className="text-xs text-muted-foreground">{c.mobileLabel ?? c.header}</dt>
                          <dd className="mt-0.5 min-w-0 break-words">{c.cell(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                {renderExpanded && open && (
                  <div id={`${id}-details`} className="relative border-t border-border px-4 py-4">
                    {renderExpanded(row)}
                  </div>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>
    );
  }

  return (
    <div
      aria-busy={busy || undefined}
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_hsl(190_30%_12%/0.04)] transition-opacity duration-200',
        busy && 'opacity-60',
        className
      )}
    >
      <div data-slot="table-container" className="relative max-h-[min(72vh,760px)] w-full overflow-auto">
        <table data-slot="table" className="w-full caption-bottom text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  scope="col"
                  className={cn(
                    'h-11 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]',
                    c.headClassName
                  )}
                >
                  {c.header}
                </TableHead>
              ))}
              {interactive && (
                <TableHead scope="col" className="h-11 w-12 px-2 shadow-[inset_0_-1px_0_var(--border)]">
                  <span className="sr-only">Detalhes</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <Stagger as="tbody" key={rowsKey} step={0.04} inView={false} className="[&>tr:last-child]:border-0">
            {rows.map((row) => {
              const id = getRowId(row);
              const open = expanded.has(id);
              return (
                <Fragment key={id}>
                  <StaggerItem
                    as="tr"
                    y={6}
                    data-slot="table-row"
                    data-state={open ? 'selected' : undefined}
                    onClick={interactive ? () => activate(row) : undefined}
                    className={cn(
                      'border-b border-border transition-colors',
                      interactive && 'cursor-pointer hover:bg-mint-wash/70',
                      open && 'border-b-0 bg-mint-wash/60'
                    )}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.key} className={cn('px-4 py-3', c.className)}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                    {interactive && (
                      <TableCell className="w-12 px-2 py-3 text-right">
                        {/* Sem onClick próprio: o clique (ou Enter/Espaço) sobe até a linha */}
                        <button
                          type="button"
                          aria-label={actionLabel(row, open)}
                          aria-expanded={renderExpanded ? open : undefined}
                          aria-controls={renderExpanded ? `${id}-details` : undefined}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {renderExpanded ? (
                            <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
                          ) : (
                            <ChevronRight className="size-4" aria-hidden="true" />
                          )}
                        </button>
                      </TableCell>
                    )}
                  </StaggerItem>
                  {renderExpanded && open && (
                    <tr id={`${id}-details`} className="border-b border-border bg-mint-wash/40">
                      <td colSpan={columns.length + 1} className="px-4 pb-5 pt-1">
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </Stagger>
        </table>
      </div>
    </div>
  );
}
