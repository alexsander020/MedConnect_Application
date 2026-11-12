import { useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Download,
  Eye,
  FileText,
  LifeBuoy,
  PencilLine,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  Undo2,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import SupportTicketForm from '@/components/account/SupportTicketForm';
import { Stagger, StaggerItem, FadeUp } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { supportTicketCategories } from '@/constants/status';
import RichText from '@/pages/legal/components/RichText';
import PublicHero from './components/PublicHero';
import { HELP_TOPICS } from './components/helpContent';
import { usePageMeta } from '@/lib/seo';

const TOPIC_ICONS = {
  pacientes: UserRound,
  farmacias: Building2,
  privacidade: ShieldCheck,
  'pagamento-e-entrega': Truck,
};

const RIGHTS = [
  { icon: Eye, title: 'Confirmação e acesso', text: 'Saber se tratamos seus dados e quais dados mantemos sobre você.' },
  { icon: Download, title: 'Portabilidade', text: 'Receber uma cópia dos seus dados em formato estruturado (JSON).' },
  { icon: PencilLine, title: 'Correção', text: 'Corrigir dados incompletos, inexatos ou desatualizados.' },
  { icon: Undo2, title: 'Revogação do consentimento', text: 'Retirar a autorização para o tratamento dos seus dados de saúde.' },
  { icon: Trash2, title: 'Eliminação ou anonimização', text: 'Pedir a exclusão ou a anonimização dos seus dados cadastrais.' },
];

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

function TopicNav() {
  return (
    <nav aria-label="Temas da ajuda" className="mt-8">
      <ul className="flex flex-wrap gap-2">
        {HELP_TOPICS.map((t) => {
          const Icon = TOPIC_ICONS[t.id];
          return (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(t.id);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {t.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ContactShortcut() {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-primary">
        <LifeBuoy className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-4 font-heading text-lg font-semibold text-foreground">Não achou sua resposta?</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Escreva para o atendimento. Cada mensagem recebe um número de protocolo e a resposta chega pelo e-mail informado.
      </p>
      <Button asChild variant="outline" className="mt-4">
        <a
          href="#contato"
          onClick={(e) => {
            e.preventDefault();
            scrollToId('contato');
          }}
        >
          Ir para o formulário <ArrowRight aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}

/** /help — Central de ajuda: FAQ por tema, direitos LGPD e formulário de contato (?category= pré-seleciona o assunto) */
export default function Help() {
  const { isAuthenticated, userType } = useAuth();
  const [params] = useSearchParams();
  const { hash, search } = useLocation();
  const rawCategory = (params.get('category') || '').toUpperCase();
  const category = supportTicketCategories[rawCategory] ? rawCategory : 'GENERAL';
  const isPatient = isAuthenticated && userType === 'PATIENT';
  const supportPath = userType === 'PHARMACY' ? '/pharmacy/support' : userType === 'PATIENT' ? '/support' : null;

  usePageMeta({
    title: 'Central de ajuda · MedConnect',
    description:
      'Perguntas frequentes sobre receitas, cotações, credenciamento de farmácias, privacidade (LGPD), pagamento e entrega. Atendimento com número de protocolo.',
  });

  // Links como /help?category=PRIVACY#contato também precisam rolar quando só a categoria muda
  useEffect(() => {
    if (!hash) return undefined;
    const t = setTimeout(() => scrollToId(hash.slice(1)), 80);
    return () => clearTimeout(t);
  }, [hash, search]);

  return (
    <div>
      <PublicHero
        eyebrow="Central de ajuda"
        title="Como podemos ajudar?"
        lead="Respostas diretas sobre receitas, cotações, credenciamento, privacidade, pagamento e entrega. Quando algo depende da farmácia, a gente avisa."
        aside={<ContactShortcut />}
      >
        <TopicNav />
      </PublicHero>

      {/* Perguntas frequentes por tema */}
      <div className="container-page py-14 md:py-20 lg:py-24">
        <h2 className="sr-only">Perguntas frequentes</h2>
        <div className="space-y-14 lg:space-y-20">
          {HELP_TOPICS.map((topic) => {
            const Icon = TOPIC_ICONS[topic.id];
            return (
              <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-titulo`} className="grid scroll-mt-24 gap-6 lg:grid-cols-12 lg:gap-10">
                <FadeUp inView duration={0.5} className="lg:col-span-4">
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 id={`${topic.id}-titulo`} className="mt-4 font-heading text-2xl font-semibold text-foreground">
                    {topic.label}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{topic.description}</p>
                </FadeUp>
                <div className="lg:col-span-8">
                  <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5 sm:px-6">
                    {topic.items.map((item, i) => (
                      <AccordionItem key={item.q} value={`${topic.id}-${i}`}>
                        <AccordionTrigger className="gap-4 py-5 font-sans text-base font-medium tracking-normal text-foreground hover:no-underline hover:text-primary">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 text-[0.9375rem] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_strong]:font-semibold [&_strong]:text-foreground">
                          {item.a.map((paragraph, j) => (
                            <p key={j}>
                              <RichText text={paragraph} />
                            </p>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Direitos do titular (LGPD) */}
      <section id="direitos-lgpd" aria-labelledby="direitos-titulo" className="scroll-mt-24 border-y border-border bg-mint-wash">
        <div className="container-page py-14 md:py-20 lg:py-24">
          <FadeUp inView className="max-w-3xl">
            <p className="eyebrow mb-4">Privacidade e LGPD</p>
            <h2 id="direitos-titulo" className="text-section text-foreground">
              Seus direitos sobre os seus dados
            </h2>
            <p className="text-lead mt-4 text-muted-foreground">
              A Lei Geral de Proteção de Dados (LGPD, art. 18) garante a você, titular, estes direitos. Pacientes com conta exercem a maior parte deles
              direto no Centro de Privacidade; para o restante, use o formulário abaixo.
            </p>
          </FadeUp>
          <FadeUp inView delay={0.08} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {isPatient ? (
              <Button asChild size="lg">
                <Link to="/privacy-center">
                  <ShieldCheck aria-hidden="true" /> Abrir Centro de Privacidade
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to="/login">
                  <ShieldCheck aria-hidden="true" /> Entrar para acessar
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <Link to="/privacy">
                <FileText aria-hidden="true" /> Política de Privacidade
              </Link>
            </Button>
          </FadeUp>

          <Stagger step={0.06} as="ul" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {RIGHTS.map((r) => (
              <StaggerItem as="li" key={r.title} className="rounded-2xl border border-border bg-background p-5">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                  <r.icon className="size-[18px]" aria-hidden="true" />
                </span>
                <p className="mt-4 font-heading text-base font-semibold leading-snug text-foreground">{r.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Alguns dados — como receitas já dispensadas e documentos fiscais — podem precisar ser guardados pelo prazo exigido pela legislação sanitária,
            mesmo depois de um pedido de exclusão.
          </p>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" aria-labelledby="contato-titulo" className="scroll-mt-24">
        <div className="container-page grid gap-10 py-14 md:py-20 lg:grid-cols-12 lg:gap-14 lg:py-24">
          <FadeUp inView className="lg:col-span-4">
            <p className="eyebrow mb-4">Atendimento</p>
            <h2 id="contato-titulo" className="text-section text-foreground">
              Fale com a gente
            </h2>
            <p className="text-lead mt-4 text-muted-foreground">
              Cada mensagem recebe um número de protocolo. A resposta chega pelo e-mail informado.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                Se for sobre um pedido, informe o número dele.
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                Evite copiar dados da receita na mensagem — ela já fica protegida no seu pedido.
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                Para pedidos sobre dados pessoais, escolha o assunto “Privacidade e dados (LGPD)”.
              </li>
            </ul>
            {supportPath && (
              <p className="mt-6 text-sm text-muted-foreground">
                Você está conectado: usaremos o nome e o e-mail da sua conta.{' '}
                <Link to={supportPath} className="font-medium text-primary underline underline-offset-3">
                  Acompanhe seus atendimentos
                </Link>
                .
              </p>
            )}
          </FadeUp>
          <FadeUp inView delay={0.08} className="lg:col-span-8">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_hsl(190_22%_16%/0.04)] sm:p-8">
              <SupportTicketForm key={category} defaultCategory={category} />
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
