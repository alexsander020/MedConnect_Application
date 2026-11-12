import { Clock } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WEEKDAYS, WEEK_ORDER, groupByDay, zonedNow } from '@/lib/business-hours';
import { formatClock } from '@/lib/format';

const TZ_LABELS = {
  'America/Sao_Paulo': 'Horário de Brasília',
  'America/Manaus': 'Horário de Manaus',
  'America/Cuiaba': 'Horário de Cuiabá',
  'America/Belem': 'Horário de Belém',
  'America/Fortaleza': 'Horário de Fortaleza',
  'America/Recife': 'Horário de Recife',
  'America/Bahia': 'Horário de Salvador',
  'America/Rio_Branco': 'Horário do Acre',
  'America/Noronha': 'Horário de Fernando de Noronha',
};

function timezoneLabel(tz = 'America/Sao_Paulo') {
  return TZ_LABELS[tz] || `Fuso ${tz.replace('_', ' ')}`;
}

/** Tabela semanal (segunda → domingo). Dias sem intervalos aparecem como "Fechada". */
export function WeeklyHoursTable({ hours = [], timezone, className }) {
  const byDay = groupByDay(hours);
  const today = zonedNow(timezone).dayOfWeek;
  return (
    <table className={cn('w-full text-sm', className)}>
      <caption className="sr-only">Horário de funcionamento por dia da semana</caption>
      <tbody>
        {WEEK_ORDER.map((d) => {
          const intervals = byDay[d] || [];
          const isToday = d === today;
          return (
            <tr key={d} className={cn('border-b border-border/70 last:border-0', isToday && 'bg-mint-wash')}>
              <th scope="row" className={cn('py-1.5 pl-2 pr-3 text-left font-medium', isToday ? 'text-foreground' : 'text-muted-foreground')}>
                {WEEKDAYS[d]}
                {isToday && <span className="sr-only"> (hoje)</span>}
              </th>
              <td className="py-1.5 pr-2 text-right">
                {intervals.length === 0 ? (
                  <span className="text-muted-foreground">Fechada</span>
                ) : (
                  <span className="num text-foreground">
                    {intervals.map((h) => `${formatClock(h.opensAt)} – ${formatClock(h.closesAt)}`).join(' · ')}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Botão "Ver horários" que abre a tabela semanal num Popover (funciona com toque e teclado) */
export default function PharmacyHours({ name, hours = [], timezone, className, size = 'sm' }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size={size} className={cn('-ml-2 text-primary hover:text-mint-deep', className)}>
          <Clock aria-hidden="true" /> Ver horários
          {name && <span className="sr-only"> de {name}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] gap-3 rounded-xl p-3">
        <div className="px-2 pt-1">
          <p className="font-heading text-sm font-semibold text-foreground">Horário de funcionamento</p>
          <p className="text-xs text-muted-foreground">{timezoneLabel(timezone)}</p>
        </div>
        {hours.length === 0 ? (
          <p className="px-2 pb-1 text-sm text-muted-foreground">
            Esta farmácia ainda não informou seus horários. Você pode enviar a receita a qualquer momento.
          </p>
        ) : (
          <WeeklyHoursTable hours={hours} timezone={timezone} />
        )}
      </PopoverContent>
    </Popover>
  );
}
