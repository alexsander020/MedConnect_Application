import { cn } from 'cn';

/** Marca MedConnect: cápsula diagonal em círculo menta + logotipo */
export function LogoMark({ className, title = 'MedConnect' }) {
  return (
    <svg viewBox="0 0 40 40" role="img" aria-label={title} className={cn('size-9 shrink-0', className)}>
      <rect width="40" height="40" rx="12" fill="var(--primary)" />
      <g transform="rotate(-45 20 20)">
        <rect x="9" y="14.5" width="22" height="11" rx="5.5" fill="white" />
        <path d="M20 14.5h5.5a5.5 5.5 0 0 1 0 11H20z" fill="hsl(168 40% 78%)" />
        <line x1="20" y1="14.5" x2="20" y2="25.5" stroke="var(--primary)" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

export default function Logo({ className, markClassName, showTagline = false, inverted = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-heading text-[1.15rem] font-bold tracking-[0.08em] uppercase',
            inverted ? 'text-white' : 'text-foreground'
          )}
        >
          Med<span className={inverted ? 'text-[hsl(166_46%_62%)]' : 'text-primary'}>Connect</span>
        </span>
        {showTagline && (
          <span className={cn('mt-1 whitespace-nowrap text-[0.625rem] font-semibold uppercase tracking-[0.16em]', inverted ? 'text-white/60' : 'text-muted-foreground')}>
            Farmácias de manipulação
          </span>
        )}
      </span>
    </span>
  );
}
