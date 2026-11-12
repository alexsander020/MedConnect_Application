import { Check, FlaskConical, Truck, PackageCheck, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from 'cn';
import { orderStatuses } from '@/constants/status';
import { formatDateTime } from '@/lib/format';
import { EASE_OUT } from '@/components/motion';

const STEPS = [
  { status: 'PRODUCTION', icon: FlaskConical, title: 'Em manipulação', text: 'A farmácia está preparando a fórmula.' },
  { status: 'DELIVERY', icon: Truck, title: 'Saiu para entrega', text: 'O pedido está a caminho.' },
  { status: 'DELIVERED', icon: PackageCheck, title: 'Entregue', text: 'Pedido recebido pelo paciente.' },
];

/**
 * Linha do tempo do pedido. `history`: [{ toStatus, createdAt }] (OrderStatusHistory).
 * `createdAt` do pedido marca a entrada em PRODUCTION.
 */
export default function OrderTimeline({ status, createdAt, history = [], className }) {
  const cancelled = status === 'CANCELLED';
  const reachedAt = (s) => {
    if (s === 'PRODUCTION') return createdAt;
    return history.find((h) => h.toStatus === s)?.createdAt;
  };
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className={cn('relative space-y-0', className)}>
      {STEPS.map((step, i) => {
        const done = !cancelled && currentIndex >= i;
        const active = !cancelled && currentIndex === i && status !== 'DELIVERED';
        const Icon = done && !active ? Check : step.icon;
        const at = reachedAt(step.status);
        return (
          <li key={step.status} className="relative flex gap-4 pb-7 last:pb-0">
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className="absolute left-[19px] top-10 h-[calc(100%-40px)] w-0.5 overflow-hidden rounded-full bg-border">
                <motion.span
                  className="block h-full w-full origin-top bg-primary"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: !cancelled && currentIndex > i ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.15 * i, ease: EASE_OUT }}
                />
              </span>
            )}
            <motion.span
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.12 * i, ease: EASE_OUT }}
              className={cn(
                'relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border-2',
                done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground',
                active && 'ring-4 ring-primary/15'
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
            </motion.span>
            <div className="pt-1.5">
              <p className={cn('font-heading text-[0.9375rem] font-medium', done ? 'text-foreground' : 'text-muted-foreground')}>
                {step.title}
                {active && <span className="ml-2 text-xs font-normal text-primary">• etapa atual</span>}
              </p>
              <p className="text-sm text-muted-foreground">{done && at ? formatDateTime(at) : step.text}</p>
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="relative flex gap-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-coral-wash text-coral">
            <XCircle className="size-[18px]" aria-hidden="true" />
          </span>
          <div className="pt-1.5">
            <p className="font-heading text-[0.9375rem] font-medium">{orderStatuses.CANCELLED.label}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(history.find((h) => h.toStatus === 'CANCELLED')?.createdAt)}</p>
          </div>
        </li>
      )}
    </ol>
  );
}
