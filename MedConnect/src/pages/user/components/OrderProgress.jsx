import { motion } from 'motion/react';
import { cn } from 'cn';
import { EASE_OUT } from '@/components/motion';
import { ORDER_FLOW, orderStatuses } from '@/constants/status';

const SHORT = { PRODUCTION: 'Manipulação', DELIVERY: 'Entrega', DELIVERED: 'Entregue' };

/** Progresso compacto do pedido (3 etapas) para listas e cards */
export default function OrderProgress({ status, className, showLabels = true }) {
  const cancelled = status === 'CANCELLED';
  const index = ORDER_FLOW.indexOf(status);
  const step = index >= 0 ? index + 1 : 0;
  const summary = cancelled
    ? 'Pedido cancelado'
    : `Etapa ${step} de ${ORDER_FLOW.length}: ${orderStatuses[status]?.label || 'em andamento'}`;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex gap-1" aria-hidden="true">
        {ORDER_FLOW.map((s, i) => (
          <span key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.span
              className={cn('block h-full w-full origin-left rounded-full', cancelled ? 'bg-coral/60' : 'bg-primary')}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: cancelled || i < step ? 1 : 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.12, ease: EASE_OUT }}
            />
          </span>
        ))}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex justify-between text-[0.6875rem] text-muted-foreground" aria-hidden="true">
          {ORDER_FLOW.map((s, i) => (
            <span key={s} className={cn(!cancelled && i < step && 'font-medium text-foreground')}>
              {SHORT[s]}
            </span>
          ))}
        </div>
      )}
      <span className="sr-only">{summary}</span>
    </div>
  );
}
