import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';

/** Paginação simples para listagens { page, totalPages, total } */
export default function DataPagination({ page = 1, totalPages = 1, total, onPageChange, className }) {
  if (!totalPages || totalPages <= 1) {
    return total !== undefined ? (
      <p className="px-1 pt-3 text-xs text-muted-foreground">{formatNumber(total)} {total === 1 ? 'registro' : 'registros'}</p>
    ) : null;
  }
  return (
    <nav aria-label="Paginação" className={['flex items-center justify-between gap-3 px-1 pt-4', className].filter(Boolean).join(' ')}>
      <p className="text-xs text-muted-foreground">
        Página <span className="num">{page}</span> de <span className="num">{totalPages}</span>
        {total !== undefined && <> · {formatNumber(total)} registros</>}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden="true" /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Próxima <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
