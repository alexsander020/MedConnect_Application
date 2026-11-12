import { Inbox } from 'lucide-react';
import { cn } from 'cn';
import { FadeUp } from '@/components/motion';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nenhum registro encontrado',
  description = 'Não há itens para exibir no momento.',
  action,
  className,
}) {
  return (
    <FadeUp
      duration={0.4}
      y={8}
      data-testid="empty-state"
      className={cn('flex flex-col items-center rounded-2xl border border-dashed border-border bg-mint-wash/50 px-6 py-12 text-center', className)}
    >
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="font-heading text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </FadeUp>
  );
}
