import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, FileClock, ListTree, MessageCircleQuestion, FileText } from 'lucide-react';
import { cn } from 'cn';
import { FadeUp } from '@/components/motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDate } from '@/lib/format';
import { LEGAL_DOCUMENTS } from '@/content/legal/meta';
import RichText from './RichText';
import { usePageMeta } from '@/lib/seo';

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Rola até a seção sem disparar navegação do router e move o foco para o título (leitores de tela) */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
  try {
    window.history.replaceState(window.history.state, '', `#${id}`);
  } catch {
    /* histórico indisponível — a rolagem já aconteceu */
  }
}

/** Seção visível no topo da janela (abaixo do navbar fixo) para destacar o item do índice */
function useActiveSection(ids, containerRef) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const root = containerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const sections = Array.from(root.querySelectorAll('[data-legal-section]'));
    const visible = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.dataset.legalSection, e.isIntersecting));
        const current = ids.find((id) => visible.get(id));
        if (current) setActive(current);
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids, containerRef]);
  return [active, setActive];
}

function TocList({ sections, active, onSelect, className }) {
  return (
    <ol className={cn('space-y-0.5', className)}>
      {sections.map((s) => {
        const isActive = s.id === active;
        return (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={isActive ? 'location' : undefined}
              onClick={(e) => {
                e.preventDefault();
                onSelect(s.id);
              }}
              className={cn(
                'relative block rounded-md py-1.5 pl-3 pr-2 text-[0.8125rem] leading-snug transition-colors',
                'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-1 left-0 w-0.5 rounded-full transition-colors',
                  isActive ? 'bg-primary' : 'bg-transparent'
                )}
              />
              {s.title}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'h3':
      return (
        <h3 id={block.id} tabIndex={-1} className="leading-snug focus:outline-none">
          {block.text}
        </h3>
      );
    case 'ul':
    case 'ol': {
      const List = block.type;
      return (
        <List>
          {block.items.map((item, i) => (
            <li key={i}>
              <RichText text={item} />
            </li>
          ))}
        </List>
      );
    }
    case 'callout':
      return (
        <aside className="my-6 rounded-xl border border-border bg-mint-wash px-5 py-4">
          {block.title && <p className="mb-1 font-sans text-[0.9375rem] font-semibold tracking-normal text-foreground">{block.title}</p>}
          <p className="mb-0">
            <RichText text={block.text} />
          </p>
        </aside>
      );
    default:
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
  }
}

/**
 * Página de documento legal: cabeçalho com versão, aviso de versão preliminar, índice fixo
 * no desktop (recolhível no celular), rolagem suave entre âncoras e texto em `.prose-legal`.
 */

/** Resumo do documento para a meta description (até ~160 caracteres, sem cortar palavra) */
function metaDescription(summary) {
  const text = String(summary || '').replace(/\*\*|\[|\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= 160) return text || undefined;
  return `${text.slice(0, 157).replace(/\s+\S*$/, '')}…`;
}
export default function LegalDocument({ doc }) {
  const { pathname } = useLocation();
  const containerRef = useRef(null);
  const ids = useMemo(() => doc.sections.map((s) => s.id), [doc]);
  const [active, setActive] = useActiveSection(ids, containerRef);
  const [tocOpen, setTocOpen] = useState(false);
  const updated = formatDate(`${doc.updatedAt}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' });

  usePageMeta({ title: `${doc.title} · MedConnect`, description: metaDescription(doc.summary) });

  const select = (id) => {
    setActive(id);
    setTocOpen(false);
    scrollToSection(id);
  };

  const otherDocs = LEGAL_DOCUMENTS.filter((d) => d.to !== pathname);

  return (
    <div>
      <header className="border-b border-border bg-mint-wash">
        <div className="container-page py-12 md:py-16 lg:py-20">
          <FadeUp duration={0.6} className="max-w-3xl">
            <p className="eyebrow mb-4">{doc.eyebrow}</p>
            <h1 className="text-section text-foreground">{doc.title}</h1>
            <p className="text-lead mt-4 text-muted-foreground">{doc.summary}</p>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-4 text-primary" aria-hidden="true" />
                Versão <span className="num text-foreground">{doc.version}</span>
              </span>
              <span aria-hidden="true" className="hidden text-border sm:inline">•</span>
              <span>
                Última atualização: <time dateTime={doc.updatedAt} className="text-foreground">{updated}</time>
              </span>
            </p>
            <div
              role="note"
              className="mt-6 flex gap-3 rounded-xl border border-[color-mix(in_oklab,var(--amber)_28%,var(--border))] bg-amber-wash px-4 py-3 text-sm leading-relaxed text-foreground"
            >
              <FileClock className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
              <p>
                <strong className="font-semibold">Versão preliminar, em revisão jurídica.</strong>{' '}
                Este texto ainda pode ser ajustado antes da versão definitiva. Se algo não ficar claro,{' '}
                <Link to="/help?category=PRIVACY#contato" className="font-medium text-primary underline underline-offset-3">
                  fale com a gente
                </Link>
                .
              </p>
            </div>
          </FadeUp>
        </div>
      </header>

      <div ref={containerRef} className="container-page grid gap-8 py-10 md:py-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14 lg:py-16">
        {/* Índice — celular/tablet: recolhível */}
        <Collapsible open={tocOpen} onOpenChange={setTocOpen} className="rounded-xl border border-border bg-background lg:hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="inline-flex items-center gap-2">
                <ListTree className="size-4 text-primary" aria-hidden="true" />
                Índice do documento
              </span>
              <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', tocOpen && 'rotate-180')} aria-hidden="true" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <nav aria-label="Índice do documento" className="border-t border-border px-2 py-2">
              <TocList sections={doc.sections} active={active} onSelect={select} />
            </nav>
          </CollapsibleContent>
        </Collapsible>

        {/* Índice — desktop: fixo ao rolar */}
        <aside className="hidden lg:block">
          <nav aria-label="Nesta página" className="sticky top-[98px] max-h-[calc(100dvh-120px)] overflow-y-auto pb-6">
            <p className="eyebrow mb-3 pl-3 text-muted-foreground">Nesta página</p>
            <TocList sections={doc.sections} active={active} onSelect={select} />
          </nav>
        </aside>

        <article className="prose-legal min-w-0 max-w-[72ch]">
          {doc.sections.map((section, i) => (
            <section key={section.id} data-legal-section={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} tabIndex={-1} className={cn('leading-snug focus:outline-none', i === 0 && 'mt-0')}>
                {section.title}
              </h2>
              {section.blocks.map((block, j) => (
                <Block key={j} block={block} />
              ))}
            </section>
          ))}

          <footer className="mt-12 rounded-2xl border border-border bg-mint-wash p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <MessageCircleQuestion className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="mb-1 font-heading text-base font-semibold text-foreground">Ficou alguma dúvida?</p>
                  <p className="mb-0 text-sm text-muted-foreground">
                    Escreva para o nosso atendimento. Cada mensagem recebe um número de protocolo.
                  </p>
                </div>
              </div>
              <Link
                to="/help?category=PRIVACY#contato"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground no-underline transition-colors hover:bg-muted"
              >
                Falar com o atendimento
              </Link>
            </div>
            {otherDocs.length > 0 && (
              <p className="mb-0 mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                Veja também:{' '}
                {otherDocs.map((d, i) => (
                  <span key={d.to}>
                    {i > 0 && ' · '}
                    <Link to={d.to}>{d.label}</Link>
                  </span>
                ))}
              </p>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
}
