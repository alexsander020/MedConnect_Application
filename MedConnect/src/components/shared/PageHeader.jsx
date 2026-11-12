import { cn } from 'cn';
import { FadeUp } from '@/components/motion';

/** Cabeçalho padrão das telas logadas: eyebrow, título, descrição e ações à direita */
export default function PageHeader({ eyebrow, title, description, actions, className, children }) {
  return (
    <FadeUp duration={0.45} y={10} className={cn('mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-[2rem] md:leading-tight">{title}</h1>
        {description && <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </FadeUp>
  );
}
