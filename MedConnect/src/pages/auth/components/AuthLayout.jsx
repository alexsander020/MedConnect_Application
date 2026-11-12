import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardCheck,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Truck,
  UserCheck,
} from 'lucide-react';
import { cn } from 'cn';
import Logo from '@/components/brand/Logo';
import { FadeUp, Stagger, StaggerItem } from '@/components/motion';

const PATIENT_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Farmácias verificadas',
    text: 'Só farmácias com documentação conferida pela nossa equipe enviam cotações.',
  },
  {
    icon: LockKeyhole,
    title: 'Receita protegida',
    text: 'Sua receita fica guardada de forma cifrada e só é aberta por quem vai cotá-la.',
  },
  {
    icon: UserCheck,
    title: 'Você no controle',
    text: 'Consentimento registrado e revogável a qualquer momento, como prevê a LGPD.',
  },
];

const COPY = {
  patient: {
    eyebrow: 'Para pacientes',
    title: 'Seu manipulado, cotado por farmácias verificadas.',
    text: 'Envie a receita uma vez, receba cotações de farmácias de manipulação credenciadas e acompanhe o pedido até a entrega.',
    points: PATIENT_POINTS,
  },
  pharmacy: {
    eyebrow: 'Para farmácias de manipulação',
    title: 'Receitas da sua região, prontas para cotar.',
    text: 'Credencie a farmácia, passe pela verificação documental e responda pacientes que já estão com a receita em mãos.',
    points: [
      {
        icon: BadgeCheck,
        title: 'Credenciamento conferido',
        text: 'Licença sanitária, AFE e responsável técnico são verificados antes da primeira cotação.',
      },
      {
        icon: FileText,
        title: 'Receita antes do preço',
        text: 'Você analisa a receita e as observações antes de definir valor e prazo.',
      },
      {
        icon: Truck,
        title: 'Pedido acompanhado',
        text: 'Atualize produção e entrega; o paciente acompanha cada etapa.',
      },
    ],
  },
  account: {
    eyebrow: 'Acesso seguro',
    title: 'Farmácias verificadas. Receitas protegidas.',
    text: 'A MedConnect conecta pacientes a farmácias de manipulação credenciadas, com cuidado em cada dado de saúde.',
    points: PATIENT_POINTS,
  },
};

const BAR_WIDTHS = ['w-3/4', 'w-1/2'];

/** Ilustração esquemática do produto (decorativa, sem dados reais) */
function ProductPreview({ audience }) {
  const isPharmacy = audience === 'pharmacy';
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-[0_18px_40px_-24px_hsl(190_22%_16%/0.35)]"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-primary">
          {isPharmacy ? <ClipboardCheck className="size-4" /> : <FileText className="size-4" />}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium">{isPharmacy ? 'Nova receita' : 'Sua receita'}</p>
          <div className="h-1.5 w-24 rounded-full bg-muted" />
        </div>
        <span className="rounded-full bg-success-wash px-2 py-0.5 text-[11px] font-medium text-success">
          {isPharmacy ? 'Na sua região' : 'Enviada'}
        </span>
      </div>
      <div className="my-3 h-px bg-border" />
      <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {isPharmacy ? 'Etapas do pedido' : 'Cotações de farmácias'}
      </p>
      <Stagger step={0.1} delay={0.5} inView={false} className="space-y-2">
        {(isPharmacy ? ['Analisar receita', 'Enviar cotação', 'Produzir e entregar'] : BAR_WIDTHS).map((item, i) => (
          <StaggerItem
            key={item}
            y={8}
            className="flex items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2"
          >
            {isPharmacy ? (
              <>
                <span
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold',
                    i === 0 ? 'bg-primary text-primary-foreground' : 'bg-accent text-primary'
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm">{item}</span>
                <span className={cn('h-1.5 w-10 rounded-full', i === 0 ? 'bg-primary/60' : 'bg-muted')} />
              </>
            ) : (
              <>
                <span className="size-7 shrink-0 rounded-full bg-mint-wash ring-1 ring-border" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className={cn('h-1.5 rounded-full bg-muted', item)} />
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                    <BadgeCheck className="size-3" /> Verificada
                  </span>
                </div>
                <span className="h-5 w-14 shrink-0 rounded-md bg-accent" />
              </>
            )}
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

/**
 * Layout das telas de autenticação (fora do PublicLayout).
 * Desktop: painel da marca à esquerda (faixa menta) + formulário à direita.
 * Celular: uma coluna, logo no topo e link de volta ao site.
 */
export default function AuthLayout({ audience = 'patient', children, contentClassName }) {
  const copy = COPY[audience] || COPY.patient;
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside
        aria-label="Sobre a MedConnect"
        className="relative hidden overflow-hidden border-r border-border bg-mint-wash lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-8 lg:px-12 lg:py-10 xl:px-16"
      >
        <Link
          to="/"
          className="w-fit rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="MedConnect — página inicial"
        >
          <Logo showTagline />
        </Link>

        <div className="flex flex-1 flex-col justify-center gap-8">
          <div className="max-w-md">
            <FadeUp key={audience} y={12} duration={0.6}>
              <p className="eyebrow">{copy.eyebrow}</p>
              <p className="mt-3 font-heading text-[2rem] leading-[1.12] font-semibold tracking-[-0.02em] text-balance xl:text-[2.375rem]">
                {copy.title}
              </p>
              <p className="mt-4 leading-relaxed text-pretty text-muted-foreground">{copy.text}</p>
            </FadeUp>

            <Stagger key={`points-${audience}`} as="ul" step={0.08} delay={0.15} inView={false} className="mt-7 space-y-4">
              {copy.points.map(({ icon: Icon, title, text }) => (
                <StaggerItem as="li" key={title} y={10} className="flex gap-3.5">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-primary ring-1 ring-border">
                    <Icon className="size-[1.125rem]" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <div className="[@media(max-height:840px)]:hidden">
            <ProductPreview audience={audience} />
          </div>
        </div>

        <p className="max-w-md text-xs leading-relaxed text-muted-foreground [@media(max-height:960px)]:hidden">
          A manipulação e a dispensação são feitas pela farmácia escolhida, sob responsabilidade do seu farmacêutico
          responsável técnico.
        </p>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 px-4 pt-5 sm:px-8 lg:px-12 lg:pt-8">
          <Link
            to="/"
            className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
            aria-label="MedConnect — página inicial"
          >
            <Logo markClassName="size-8" />
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar ao site
          </Link>
        </header>

        <main className="flex flex-1 justify-center px-4 pt-8 pb-10 sm:px-8 sm:pt-12 lg:items-center lg:px-12 lg:py-12">
          <div className={cn('w-full max-w-[440px]', contentClassName)}>{children}</div>
        </main>

        <div className="mx-4 mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl bg-mint-wash px-4 py-3 text-xs text-muted-foreground sm:mx-8 lg:hidden">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" /> Farmácias verificadas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole className="size-3.5 text-primary" aria-hidden="true" /> Receitas protegidas
          </span>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 pb-6 text-xs text-muted-foreground sm:px-8 lg:justify-end lg:px-12">
          <Link to="/help" className="hover:text-foreground hover:underline">
            Central de ajuda
          </Link>
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            Privacidade
          </Link>
          <Link to="/terms" className="hover:text-foreground hover:underline">
            Termos de Uso
          </Link>
        </footer>
      </div>
    </div>
  );
}
