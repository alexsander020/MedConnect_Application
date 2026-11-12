import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  ClipboardCheck,
  Clock,
  FileSearch,
  FileUp,
  FlaskConical,
  Layers,
  LifeBuoy,
  Lock,
  MapPinned,
  MessageSquareText,
  PackageCheck,
  PackageSearch,
  Scale,
  ShieldCheck,
  Star,
  Stethoscope,
  Store,
  Truck,
  UserRoundCheck,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { FadeUp, LiftCard, PopIn, Stagger, StaggerItem } from '@/components/motion';
import { useAuth, homeFor } from '@/context/AuthContext';
import HeroVisual from './public/components/HeroVisual';
import CredentialedPharmacies from './public/components/CredentialedPharmacies';
import { usePageMeta, DEFAULT_DESCRIPTION } from '@/lib/seo';

const TRUST = [
  { icon: BadgeCheck, title: 'Farmácias verificadas', text: 'Licença sanitária e farmacêutico responsável (CRF) conferidos.' },
  { icon: Lock, title: 'Receita protegida', text: 'Aberta só por links temporários, com registro de cada acesso.' },
  { icon: Scale, title: 'Você compara', text: 'Preço e prazo lado a lado, antes de decidir.' },
  { icon: Truck, title: 'Até a entrega', text: 'Acompanhe cada etapa do pedido.' },
];

const FEATURES = [
  { icon: Layers, title: 'Uma receita, várias cotações', text: 'Envie uma vez e receba propostas de diferentes farmácias credenciadas, sem ligar para nenhuma.' },
  { icon: Scale, title: 'Comparação lado a lado', text: 'Preço total, prazo, observações da farmácia e avaliações de outros pacientes no mesmo lugar.' },
  { icon: BadgeCheck, title: 'Só farmácias verificadas', text: 'Cada farmácia passa por conferência de documentos sanitários e do responsável técnico antes de cotar.' },
  { icon: Lock, title: 'Receita protegida', text: 'Arquivo em armazenamento privado, metadados da foto removidos e cada abertura registrada.' },
  { icon: Clock, title: 'Horários ao vivo', text: 'Veja quais farmácias estão abertas agora, calculado com o horário e o fuso de cada uma.' },
  { icon: Bell, title: 'Acompanhamento ao vivo', text: 'Em manipulação, saiu para entrega, entregue: você recebe uma notificação a cada etapa.' },
  { icon: Star, title: 'Avaliações reais', text: 'Depois da entrega, quem comprou avalia a farmácia. Isso ajuda o próximo paciente a escolher.' },
  { icon: ShieldCheck, title: 'Seus dados, suas regras', text: 'Exporte seus dados, revogue consentimentos ou peça a anonimização no Centro de Privacidade.' },
];

const GUARANTORS = [
  {
    icon: Stethoscope,
    kicker: 'Na farmácia',
    title: 'O farmacêutico responsável técnico',
    text: 'Toda farmácia credenciada informa seu responsável técnico, com registro no Conselho Regional de Farmácia (CRF). É ele quem avalia a receita, a fórmula, as dosagens e a qualidade dos insumos.',
  },
  {
    icon: ClipboardCheck,
    kicker: 'Na MedConnect',
    title: 'A revisão de credenciamento',
    text: 'Antes da primeira cotação, nossa equipe confere CNPJ, licença sanitária, autorização de funcionamento e os dados do responsável técnico. Sem aprovação, a farmácia não vê receitas.',
  },
  {
    icon: UserRoundCheck,
    kicker: 'Com você',
    title: 'O seu controle sobre os dados',
    text: 'Você decide quando enviar a receita e qual cotação aceitar. E pode exportar seus dados, revogar consentimentos ou pedir a anonimização da conta quando quiser.',
  },
];

const STEPS = [
  { title: 'Envie a receita', text: 'Foto ou PDF, depois de autorizar o uso para cotação. Leva poucos minutos.' },
  { title: 'Receba cotações', text: 'Farmácias credenciadas respondem com preço e prazo, cada uma no seu horário de funcionamento.' },
  { title: 'Escolha e confirme', text: 'Compare e aceite a proposta que fizer mais sentido. As demais são encerradas.' },
  { title: 'Acompanhe até a entrega', text: 'Cada mudança de etapa aparece ao vivo no seu pedido, com notificação.' },
];

const DELIVERY_POINTS = [
  { icon: MapPinned, text: 'Cada farmácia define a própria área de entrega — você vê no diretório.' },
  { icon: Clock, text: 'O prazo vem em cada cotação, antes de você decidir.' },
  { icon: Bell, text: 'O status do pedido é atualizado pela farmácia e chega a você ao vivo.' },
  { icon: FileSearch, text: 'Medicamentos controlados podem exigir a via original da receita na entrega, conforme orientação do farmacêutico.' },
];

const TRACKING = [
  { icon: FlaskConical, label: 'Em manipulação', note: 'A farmácia está preparando a fórmula', state: 'done' },
  { icon: Truck, label: 'Saiu para entrega', note: 'O pedido está a caminho', state: 'current' },
  { icon: PackageCheck, label: 'Entregue', note: 'Você recebe e pode avaliar', state: 'next' },
];

const ARTICLES = [
  {
    topic: 'pacientes',
    title: 'A MedConnect é uma farmácia?',
    text: 'Não. Somos a plataforma que conecta você a farmácias de manipulação credenciadas. A avaliação da receita, a manipulação e a entrega são da farmácia escolhida e do seu farmacêutico responsável.',
  },
  {
    topic: 'privacidade',
    title: 'Quem vê a minha receita?',
    text: 'Ela é usada só para cotação e manipulação, por farmácias credenciadas. O arquivo abre por links temporários, e cada acesso fica registrado. Seus contatos vão apenas para a farmácia que você escolher.',
  },
  {
    topic: 'pagamento-e-entrega',
    title: 'Como funciona o pagamento?',
    text: 'Nesta fase do piloto, a MedConnect não processa pagamentos. A forma e o momento do pagamento são definidos pela farmácia escolhida — confirme com ela antes de pagar.',
  },
];

const PHARMACY_BENEFITS = [
  { icon: PackageSearch, title: 'Receitas chegando até você', text: 'Pacientes enviam a receita; sua farmácia analisa e responde com a cotação.' },
  { icon: Scale, title: 'Concorrência transparente', text: 'Preço e prazo claros para o paciente. Quem decide é ele.' },
  { icon: ClipboardCheck, title: 'Pedido em um só lugar', text: 'Atualize as etapas e o paciente acompanha ao vivo.' },
  { icon: Star, title: 'Reputação que se constrói', text: 'Avaliações após cada entrega, visíveis no diretório público.' },
];

const REQUIREMENTS = [
  'CNPJ ativo de farmácia com manipulação',
  'Licença sanitária vigente',
  'Autorização de Funcionamento (AFE) da ANVISA',
  'Farmacêutico responsável técnico com registro no CRF',
];

function SectionHeading({ id, eyebrow, title, lead, className, align = 'left' }) {
  return (
    <FadeUp inView className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 id={id} className="text-section text-foreground">
        {title}
      </h2>
      {lead && <p className="text-lead mt-4 text-muted-foreground">{lead}</p>}
    </FadeUp>
  );
}

function IconCircle({ icon: Icon, className }) {
  return (
    <span className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary', className)}>
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

export default function Welcome() {
  const { isAuthenticated, userType } = useAuth();
  const isPatient = isAuthenticated && userType === 'PATIENT';
  const otherRole = isAuthenticated && !isPatient;
  const quoteTo = isPatient ? '/new-quote' : otherRole ? homeFor(userType) : '/register';
  const ordersTo = isPatient ? '/orders' : otherRole ? homeFor(userType) : '/login';

  usePageMeta({ title: 'MedConnect · Cotação de manipulados em farmácias credenciadas', description: DEFAULT_DESCRIPTION });

  const routes = [
    {
      to: quoteTo,
      icon: FileUp,
      title: 'Enviar receita',
      text: 'Foto ou PDF da receita. Farmácias credenciadas respondem com preço e prazo.',
      cta: otherRole ? 'Abrir meu painel' : 'Começar agora',
    },
    {
      to: ordersTo,
      icon: PackageSearch,
      title: 'Acompanhar meu pedido',
      text: 'Veja em que etapa está: em manipulação, saiu para entrega ou entregue.',
      cta: isAuthenticated ? 'Ver pedidos' : 'Entrar e acompanhar',
    },
    {
      to: '/help',
      icon: LifeBuoy,
      title: 'Tirar uma dúvida',
      text: 'Perguntas frequentes e atendimento com número de protocolo.',
      cta: 'Abrir a central de ajuda',
    },
  ];

  return (
    <div className="overflow-x-clip">
      {/* 1. Hero */}
      <section aria-labelledby="hero-titulo" className="container-page pb-14 pt-8 md:pb-20 md:pt-14 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-6">
            <FadeUp>
              <p className="eyebrow mb-5 leading-relaxed">
                Farmácias de manipulação verificadas <span aria-hidden="true">·</span> Receita protegida <span aria-hidden="true">·</span> LGPD
              </p>
            </FadeUp>
            <FadeUp delay={0.06}>
              <h1 id="hero-titulo" className="text-display text-foreground">
                Sua receita, várias farmácias. <span className="text-primary">Você escolhe.</span>
              </h1>
            </FadeUp>
            <FadeUp delay={0.12}>
              <p className="text-lead mt-6 max-w-xl text-muted-foreground">
                Envie a receita do seu manipulado uma vez e receba cotações de farmácias credenciadas. Compare preço e prazo, escolha a que fizer mais sentido e acompanhe o pedido até a entrega.
              </p>
            </FadeUp>
            <FadeUp delay={0.18} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to={quoteTo}>
                  <FileUp aria-hidden="true" /> {otherRole ? 'Abrir meu painel' : 'Enviar receita e cotar'}
                </Link>
              </Button>
              {userType !== 'PHARMACY' && (
                <Button asChild size="lg" variant="outline">
                  <Link to="/register?type=pharmacy">
                    <Store aria-hidden="true" /> Sou farmácia
                  </Link>
                </Button>
              )}
            </FadeUp>
            <FadeUp delay={0.26}>
              <ul aria-label="Por que confiar" className="mt-10 grid gap-x-6 gap-y-5 border-t border-border pt-7 sm:grid-cols-2">
                {TRUST.map((t) => (
                  <li key={t.title} className="flex gap-3">
                    <t.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </FadeUp>
          </div>
          <HeroVisual className="order-first min-w-0 lg:order-none lg:col-span-6 lg:pl-4" />
        </div>
      </section>

      {/* 2. Três caminhos */}
      <section aria-labelledby="caminhos-titulo" className="container-page pb-16 md:pb-20 lg:pb-24">
        <h2 id="caminhos-titulo" className="sr-only">
          Por onde você quer começar?
        </h2>
        <Stagger step={0.06} as="ul" className="grid gap-4 md:grid-cols-3 md:gap-5">
          {routes.map((r) => (
            <StaggerItem as="li" key={r.title} className="min-w-0">
              <LiftCard className="h-full rounded-2xl border border-border bg-card shadow-[0_1px_2px_hsl(190_22%_16%/0.04)] transition-shadow hover:shadow-[0_14px_32px_-18px_hsl(190_22%_16%/0.3)]">
                <Link to={r.to} className="flex h-full flex-col rounded-2xl p-6 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:p-7">
                  <IconCircle icon={r.icon} className="size-12" />
                  <span className="mt-5 font-heading text-xl font-semibold text-foreground">{r.title}</span>
                  <span className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{r.text}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-primary">
                    {r.cta}
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </LiftCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* 3. O que a MedConnect faz por você */}
      <section aria-labelledby="recursos-titulo" className="border-t border-border">
        <div className="container-page py-16 md:py-20 lg:py-24">
          <SectionHeading
            id="recursos-titulo"
            eyebrow="Para pacientes"
            title="O que a MedConnect faz por você"
            lead="Menos telefonemas e menos incerteza: a cotação do seu manipulado organizada do envio da receita até a entrega."
          />
          <Stagger step={0.06} as="ul" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <StaggerItem as="li" key={f.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5 sm:block sm:p-6">
                <IconCircle icon={f.icon} />
                <div className="min-w-0">
                  <h3 className="font-heading text-lg font-semibold leading-snug text-foreground sm:mt-5">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2">{f.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* 4. Farmácias credenciadas (dados reais) */}
      <CredentialedPharmacies />

      {/* 5. Quem garante a qualidade */}
      <section aria-labelledby="qualidade-titulo">
        <div className="container-page py-16 md:py-20 lg:py-24">
          <SectionHeading
            id="qualidade-titulo"
            eyebrow="Segurança do começo ao fim"
            title="Quem garante a qualidade"
            lead="Três camadas de cuidado, cada uma com um papel claro."
          />
          <Stagger step={0.1} as="ul" className="mt-12 grid gap-5 md:grid-cols-3">
            {GUARANTORS.map((g) => (
              <StaggerItem as="li" key={g.title} className="flex flex-col rounded-2xl border border-border bg-card p-6 lg:p-7">
                <div className="flex items-center gap-3">
                  <IconCircle icon={g.icon} className="size-12" />
                  <span className="eyebrow">{g.kicker}</span>
                </div>
                <h3 className="mt-5 font-heading text-xl font-semibold text-foreground">{g.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{g.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* 6. Como funciona */}
      <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="scroll-mt-20 border-t border-border">
        <div className="container-page py-16 md:py-20 lg:py-24">
          <SectionHeading
            id="como-funciona-titulo"
            eyebrow="Como funciona"
            title="Quatro passos, do envio à entrega"
            lead="O tempo de cada etapa depende das farmácias e da fórmula — mas você sempre sabe em que ponto está."
          />
          <ol className="relative mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <span aria-hidden="true" className="absolute left-6 right-[calc((100%-72px)/4-24px)] top-6 hidden h-px bg-border lg:block" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 lg:flex-col lg:gap-0">
                <PopIn delay={i * 0.12} className="relative z-10 shrink-0">
                  <span className="num inline-flex size-12 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-background text-lg text-primary shadow-[0_0_0_6px_var(--background)]">
                    {i + 1}
                  </span>
                </PopIn>
                <FadeUp inView delay={0.05 + i * 0.12} duration={0.5} className="min-w-0 lg:mt-6">
                  <h3 className="font-heading text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">{s.text}</p>
                </FadeUp>
              </li>
            ))}
          </ol>
          <FadeUp inView className="mt-12">
            <Button asChild size="lg">
              <Link to={quoteTo}>
                <FileUp aria-hidden="true" /> {otherRole ? 'Abrir meu painel' : 'Enviar receita e cotar'}
              </Link>
            </Button>
          </FadeUp>
        </div>
      </section>

      {/* 7. Entrega */}
      <section aria-labelledby="entrega-titulo" className="bg-mint-wash">
        <div className="container-page grid gap-12 py-16 md:py-20 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-24">
          <div className="lg:col-span-6">
            <SectionHeading
              id="entrega-titulo"
              eyebrow="Entrega"
              title="Do balcão da farmácia até você"
              lead="A entrega é feita pela farmácia que você escolher. A MedConnect mostra as condições antes do aceite e o andamento depois."
            />
            <ul className="mt-8 space-y-4">
              {DELIVERY_POINTS.map((d) => (
                <li key={d.text} className="flex gap-3">
                  <d.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-[0.9375rem] leading-relaxed text-foreground">{d.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <FadeUp inView delay={0.1} className="lg:col-span-5 lg:col-start-8">
            <figure>
              <div
                role="img"
                aria-label="Ilustração do acompanhamento: em manipulação concluído, saiu para entrega em andamento, entregue como próxima etapa."
                className="rounded-2xl border border-border bg-background p-5 shadow-[0_24px_48px_-30px_hsl(190_22%_16%/0.3)] sm:p-6"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                  <p className="font-heading text-base font-semibold text-foreground">Seu pedido</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-info-wash px-2.5 py-1 text-xs font-medium text-info">
                    <span className="size-1.5 rounded-full bg-info animate-pulse-soft" /> Ao vivo
                  </span>
                </div>
                <ol className="mt-5 space-y-0">
                  {TRACKING.map((t, i) => (
                    <li key={t.label} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < TRACKING.length - 1 && (
                        <span className={cn('absolute left-[19px] top-10 h-[calc(100%-40px)] w-0.5 rounded-full', t.state === 'done' ? 'bg-primary' : 'bg-border')} />
                      )}
                      <span
                        className={cn(
                          'relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border',
                          t.state === 'done' && 'border-primary bg-primary text-primary-foreground',
                          t.state === 'current' && 'border-primary bg-accent text-primary',
                          t.state === 'next' && 'border-border bg-background text-muted-foreground'
                        )}
                      >
                        <t.icon className="size-[18px]" />
                      </span>
                      <div className="pt-1.5">
                        <p className={cn('text-sm font-semibold', t.state === 'next' ? 'text-muted-foreground' : 'text-foreground')}>{t.label}</p>
                        <p className="text-sm text-muted-foreground">{t.note}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <figcaption className="mt-3 text-center text-xs text-muted-foreground">Ilustração do acompanhamento do pedido.</figcaption>
            </figure>
          </FadeUp>
        </div>
      </section>

      {/* 8. Dúvidas comuns */}
      <section aria-labelledby="duvidas-titulo">
        <div className="container-page py-16 md:py-20 lg:py-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading id="duvidas-titulo" eyebrow="Dúvidas comuns" title="Antes de enviar a sua receita" />
            <FadeUp inView delay={0.08} className="shrink-0">
              <Button asChild variant="outline">
                <Link to="/help">
                  Todas as perguntas <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </FadeUp>
          </div>
          <Stagger step={0.06} className="mt-12 grid gap-5 md:grid-cols-3">
            {ARTICLES.map((a) => (
              <StaggerItem key={a.title} className="min-w-0">
                <LiftCard as="article" className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 lg:p-7">
                  <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{a.text}</p>
                  <Link
                    to={`/help#${a.topic}`}
                    className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-primary after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                  >
                    Saiba mais<span className="sr-only">: {a.title}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </LiftCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* 9. Para farmácias */}
      <section id="para-farmacias" aria-labelledby="para-farmacias-titulo" className="scroll-mt-20 pb-16 md:pb-20 lg:pb-24">
        <div className="container-page">
          <div className="grid gap-10 overflow-hidden rounded-3xl border border-border bg-mint-wash p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14">
            <div className="min-w-0 lg:col-span-7">
              <SectionHeading
                id="para-farmacias-titulo"
                eyebrow="Para farmácias de manipulação"
                title="Receitas de pacientes, direto no seu painel"
                lead="Credencie sua farmácia, responda às receitas com a sua cotação e acompanhe cada pedido num painel feito para a rotina da manipulação."
              />
              <Stagger step={0.06} as="ul" className="mt-10 grid gap-6 sm:grid-cols-2">
                {PHARMACY_BENEFITS.map((b) => (
                  <StaggerItem as="li" key={b.title} className="flex gap-3">
                    <IconCircle icon={b.icon} className="bg-background" />
                    <div className="min-w-0">
                      <h3 className="font-heading text-base font-semibold text-foreground">{b.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
            <FadeUp inView delay={0.1} className="min-w-0 lg:col-span-5">
              <div className="rounded-2xl border border-border bg-background p-6 lg:p-7">
                <div className="flex items-center gap-3">
                  <IconCircle icon={Building2} />
                  <p className="font-heading text-lg font-semibold text-foreground">Para se credenciar</p>
                </div>
                <ul className="mt-5 space-y-3">
                  {REQUIREMENTS.map((r) => (
                    <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {r}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                  Nossa equipe confere os documentos e aprova o credenciamento ou informa o motivo da recusa.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  {userType === 'PHARMACY' ? (
                    <Button asChild size="lg">
                      <Link to={homeFor('PHARMACY')}>
                        Abrir painel da farmácia <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg">
                      <Link to="/register?type=pharmacy">
                        <Store aria-hidden="true" /> Credenciar minha farmácia
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="link" className="h-auto justify-start px-0">
                    <Link to="/pharmacy-terms">Ler o Termo de Adesão de farmácias</Link>
                  </Button>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
    </div>
  );
}
