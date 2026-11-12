import { cn } from 'cn';
import { FadeUp } from '@/components/motion';

/** Faixa de abertura das páginas públicas internas (Farmácias, Ajuda) */
export default function PublicHero({ eyebrow, title, lead, children, aside, className }) {
  return (
    <header className={cn('border-b border-border bg-mint-wash', className)}>
      <div className="container-page grid gap-8 py-12 md:py-16 lg:grid-cols-12 lg:items-end lg:py-20">
        <FadeUp className={cn('min-w-0', aside ? 'lg:col-span-7' : 'lg:col-span-9')}>
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          <h1 className="text-section text-foreground">{title}</h1>
          {lead && <p className="text-lead mt-4 max-w-2xl text-muted-foreground">{lead}</p>}
          {children}
        </FadeUp>
        {aside && (
          <FadeUp delay={0.1} className="min-w-0 lg:col-span-5">
            {aside}
          </FadeUp>
        )}
      </div>
    </header>
  );
}
