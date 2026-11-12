import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Home, LifeBuoy } from 'lucide-react';
import { FadeUp, LiftCard, Stagger, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/lib/seo';

const ROUTES = [
  { to: '/', icon: Home, title: 'Página inicial', text: 'Entenda como funciona e envie sua receita para cotação.' },
  { to: '/pharmacies', icon: Building2, title: 'Farmácias credenciadas', text: 'Veja quem está aberto agora e onde cada farmácia entrega.' },
  { to: '/help', icon: LifeBuoy, title: 'Central de ajuda', text: 'Perguntas frequentes e o formulário para falar com a gente.' },
];

/** 404 — página não encontrada (renderizada dentro do PublicLayout) */
export default function NotFound() {
  usePageMeta({ title: 'Página não encontrada · MedConnect', noindex: true });

  return (
    <section aria-labelledby="nf-title" className="container-page py-16 md:py-24">
      <FadeUp className="mx-auto max-w-2xl text-center">
        <p className="eyebrow mb-4">
          Erro <span className="num">404</span>
        </p>
        <h1 id="nf-title" className="text-display text-foreground">
          Não encontramos esta página
        </h1>
        <p className="text-lead mx-auto mt-5 max-w-xl text-muted-foreground">
          O endereço pode ter mudado ou ter sido digitado com algum erro. Escolha um dos caminhos abaixo para continuar.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/">
            <Home aria-hidden="true" /> Voltar para o início
          </Link>
        </Button>
      </FadeUp>

      <Stagger step={0.06} as="ul" className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-3">
        {ROUTES.map((r) => (
          <StaggerItem as="li" key={r.to} className="min-w-0">
            <LiftCard className="h-full rounded-2xl border border-border bg-card">
              <Link
                to={r.to}
                className="flex h-full flex-col p-6 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-2xl"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-primary">
                  <r.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-4 font-heading text-lg font-semibold text-foreground">{r.title}</span>
                <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.text}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Acessar <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </LiftCard>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
