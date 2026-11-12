import { Landmark } from 'lucide-react';
import { cn } from 'cn';
import StatusBadge from '@/components/shared/StatusBadge';
import { WEEKDAYS, WEEK_ORDER, groupByDay } from '@/lib/business-hours';
import { formatClock, formatDate } from '@/lib/format';
import { parseCnpjData } from './labels';

/**
 * Resumo da consulta de situação cadastral do CNPJ (Receita Federal, via BrasilAPI ou simulação).
 * `data`: objeto já parseado ou o texto JSON salvo no cadastro.
 */
export function CnpjSummary({ data, className }) {
  const cnpj = parseCnpjData(data);
  if (!cnpj) {
    return (
      <p className={cn('rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground', className)}>
        Consulta de CNPJ indisponível no cadastro. Confira a situação diretamente na Receita Federal antes de aprovar.
      </p>
    );
  }
  const situacao = String(cnpj.situacaoCadastral || '').toUpperCase();
  const simulated = Boolean(cnpj.rawData?.mock);
  const place = [cnpj.municipio, cnpj.uf].filter(Boolean).join('/');
  return (
    <div className={cn('rounded-xl border border-border bg-mint-wash/60 px-4 py-3.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Landmark className="size-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Receita Federal</p>
        {situacao && (
          <StatusBadge tone={situacao === 'ATIVA' ? 'success' : 'error'}>Situação: {situacao.toLowerCase()}</StatusBadge>
        )}
        {simulated && <StatusBadge tone="neutral" dot={false}>Consulta simulada</StatusBadge>}
      </div>
      <dl className="mt-2.5 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <dt className="sr-only">Razão social</dt>
          <dd className="break-words font-medium text-foreground">{cnpj.razaoSocial || '—'}</dd>
        </div>
        {cnpj.nomeFantasia && (
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Nome fantasia</dt>
            <dd className="break-words">{cnpj.nomeFantasia}</dd>
          </div>
        )}
        {cnpj.dataSituacaoCadastral && (
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Situação desde</dt>
            <dd className="num text-[0.8125rem]">{formatDate(cnpj.dataSituacaoCadastral)}</dd>
          </div>
        )}
        {place && (
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Município</dt>
            <dd className="break-words">{place}</dd>
          </div>
        )}
        {cnpj.cnaePrincipal && (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Atividade principal (CNAE)</dt>
            <dd className="break-words">{cnpj.cnaePrincipal}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Grade semanal de horários (segunda → domingo). Dia sem intervalos = fechado. */
export function BusinessHoursTable({ hours = [], timezone, className }) {
  const byDay = groupByDay(hours);
  const today = new Date().getDay();
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border', className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">Horário de atendimento por dia da semana</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Horário</th>
          </tr>
        </thead>
        <tbody>
          {WEEK_ORDER.map((day) => {
            const list = byDay[day] || [];
            return (
              <tr key={day} className={cn('border-b border-border last:border-0', day === today && 'bg-mint-wash/70')}>
                <th scope="row" className="w-32 px-4 py-2.5 text-left font-medium text-foreground">
                  {WEEKDAYS[day]}
                  {day === today && <span className="ml-1.5 text-xs font-normal text-primary">hoje</span>}
                </th>
                <td className="px-4 py-2.5 text-right">
                  {list.length === 0 ? (
                    <span className="text-muted-foreground">Fechada</span>
                  ) : (
                    <span className="num text-[0.8125rem]">
                      {list.map((h) => `${formatClock(h.opensAt)} – ${formatClock(h.closesAt)}`).join(' · ')}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {timezone && (
        <p className="border-t border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">Fuso horário: {timezone.replace(/_/g, ' ')}</p>
      )}
    </div>
  );
}
