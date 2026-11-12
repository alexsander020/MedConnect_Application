import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight, Info } from 'lucide-react';
import { cn } from 'cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import OpenStatusPill from '@/components/shared/OpenStatusPill';
import { WEEKDAYS, WEEKDAYS_SHORT, WEEK_ORDER, groupByDay, zonedNow } from '@/lib/business-hours';
import { intervalsLabel } from './hours';

/** Resumo do horário de hoje + semana, com atalho para editar (Configurações → Horários) */
export default function HoursSummaryCard({ pharmacy, loading, className }) {
  const tz = pharmacy?.timezone || 'America/Sao_Paulo';
  const hours = pharmacy?.businessHours || [];
  const today = zonedNow(tz).dayOfWeek;
  const byDay = groupByDay(hours);

  return (
    <Card className={cn('rounded-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[1.0625rem]">
          <CalendarClock className="size-5 text-primary" aria-hidden="true" /> Horário de funcionamento
        </CardTitle>
        <CardDescription>Hoje é {WEEKDAYS[today].toLowerCase()}. É este horário que os pacientes veem na vitrine.</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <OpenStatusPill hours={hours} timezone={tz} />
            </div>
            {hours.length === 0 ? (
              <p className="flex gap-2 rounded-xl border border-[color-mix(in_oklab,var(--amber)_30%,var(--border))] bg-amber-wash p-3 text-sm leading-relaxed text-foreground/85">
                <Info className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
                Cadastre seus horários para aparecer como aberta na vitrine pública.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border" aria-label="Horários da semana">
                {WEEK_ORDER.map((d) => (
                  <li
                    key={d}
                    className={cn('flex items-baseline justify-between gap-3 px-3 py-2 text-sm', d === today && 'bg-mint-wash')}
                    aria-current={d === today ? 'date' : undefined}
                  >
                    <span className={cn('w-10 shrink-0', d === today ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                      <span aria-hidden="true">{WEEKDAYS_SHORT[d]}</span>
                      <span className="sr-only">{WEEKDAYS[d]}</span>
                    </span>
                    <span className={cn('num min-w-0 text-right text-[0.8125rem]', byDay[d]?.length ? 'text-foreground' : 'text-muted-foreground')}>
                      {intervalsLabel(byDay[d])}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link to="/pharmacy/settings?tab=hours">
            Editar horários <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
