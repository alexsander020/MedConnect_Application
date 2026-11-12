import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Check, Eye, EyeOff, Info, LockKeyhole, TriangleAlert } from 'lucide-react';
import { cn } from 'cn';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { FadeUp, EASE_OUT } from '@/components/motion';

/** Título + descrição de cada tela de autenticação */
export function AuthHeading({ eyebrow, title, description, className }) {
  return (
    <FadeUp className={cn('mb-7', className)} y={12} duration={0.6}>
      {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
      <h1 className="font-heading text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-3xl">
        {title}
      </h1>
      {description && <p className="mt-2.5 leading-relaxed text-pretty text-muted-foreground">{description}</p>}
    </FadeUp>
  );
}

/**
 * Campo com rótulo, dica e erro ligados ao controle por aria-describedby.
 * `children` pode ser uma função que recebe { id, aria-invalid, aria-describedby }.
 */
export function FormField({ id, label, hint, error, optional = false, action, className, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  const controlProps = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };

  return (
    <div className={cn('grid min-w-0 content-start gap-2', className)} data-invalid={error ? true : undefined}>
      <div className="flex min-h-5 items-center justify-between gap-3">
        <Label htmlFor={id} className={cn('leading-snug', error && 'text-destructive')}>
          {label}
          {optional && (
            <>
              {' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </>
          )}
        </Label>
        {action}
      </div>
      {typeof children === 'function' ? children(controlProps) : children}
      {hint && (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <motion.p
          id={errorId}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="flex items-start gap-1.5 text-sm leading-snug text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </motion.p>
      )}
    </div>
  );
}

const CONTROL_CLASS = 'h-11 rounded-lg bg-background';

/** Input padrão das telas de autenticação (44px de altura, alvo de toque confortável) */
export function TextInput({ className, ...props }) {
  return <Input className={cn(CONTROL_CLASS, 'px-3', className)} {...props} />;
}

/** Input com ícone à esquerda */
export function IconInput({ icon: Icon, className, ...props }) {
  return (
    <InputGroup className={cn(CONTROL_CLASS, className)}>
      <InputGroupAddon className="pl-3">
        <Icon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput className="h-full" {...props} />
    </InputGroup>
  );
}

/** Senha com botão de mostrar/ocultar (o botão é type="button") */
export function PasswordInput({ id, className, withIcon = true, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <InputGroup className={cn(CONTROL_CLASS, className)}>
      {withIcon && (
        <InputGroupAddon className="pl-3">
          <LockKeyhole aria-hidden="true" />
        </InputGroupAddon>
      )}
      <InputGroupInput
        id={id}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn('h-full', !withIcon && 'pl-3')}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          aria-label="Mostrar senha"
          aria-pressed={visible}
          aria-controls={id}
          title={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

const ALERT_TONES = {
  error: { icon: AlertCircle, className: 'border-destructive/25 bg-destructive/5', variant: 'destructive' },
  warning: { icon: TriangleAlert, className: 'border-amber/30 bg-amber-wash text-foreground', variant: 'default' },
  info: { icon: Info, className: 'border-primary/20 bg-mint-wash text-foreground', variant: 'default' },
};

/** Aviso no topo do formulário (role="alert" para leitores de tela) */
export function FormAlert({ tone = 'error', title, children, className }) {
  const { icon: Icon, className: toneClass, variant } = ALERT_TONES[tone] || ALERT_TONES.error;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className={className}
    >
      <Alert variant={variant} className={cn('rounded-xl', toneClass)}>
        <Icon aria-hidden="true" />
        {title && <AlertTitle className="font-semibold">{title}</AlertTitle>}
        <AlertDescription className={cn(variant !== 'destructive' && 'text-foreground/80', '[&_a]:font-medium')}>
          {children}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}

/** Caixa de seleção obrigatória com rótulo rico (links) e erro acessível */
export function CheckboxField({ id, checked, onCheckedChange, error, describedBy, children, className }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        checked ? 'border-primary/40 bg-mint-wash' : 'border-border bg-background',
        error && 'border-destructive/40 bg-destructive/5',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, describedBy].filter(Boolean).join(' ') || undefined}
          className="mt-0.5 size-5 rounded-[5px] bg-background"
        />
        <Label
          htmlFor={id}
          className="block text-sm leading-relaxed font-normal select-text [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-3"
        >
          {children}
        </Label>
      </div>
      {error && (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 pl-8 text-sm leading-snug text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Indicador de etapas com barra de progresso animada (scaleX, sem overshoot) */
export function StepIndicator({ steps, current, label = 'Etapas do cadastro' }) {
  const total = steps.length;
  return (
    <nav aria-label={label} className="mb-7">
      <p className="sr-only">
        Passo {current} de {total}: {steps[current - 1]}
      </p>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <motion.div
          className="absolute inset-0 origin-left rounded-full bg-primary"
          initial={false}
          animate={{ scaleX: current / total }}
          transition={{ duration: 0.55, ease: EASE_OUT }}
        />
      </div>
      <ol className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {steps.map((name, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={name} aria-current={active ? 'step' : undefined} className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-accent text-primary ring-1 ring-primary/40',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : n}
              </span>
              <span
                className={cn(
                  'truncate text-xs',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {name}
                {done && <span className="sr-only"> (concluído)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const STATUS_TONES = {
  primary: 'bg-accent text-primary',
  success: 'bg-success-wash text-success',
  warning: 'bg-amber-wash text-amber',
  danger: 'bg-destructive/10 text-destructive',
};

/**
 * Tela de estado (link enviado, e-mail confirmado, link expirado...).
 * O título recebe foco programático (tabIndex -1) quando a tela muda.
 */
export function AuthStatus({ icon: Icon, tone = 'primary', eyebrow, title, titleId, children, actions }) {
  return (
    <FadeUp y={12} duration={0.6}>
      <span className={cn('inline-flex size-14 items-center justify-center rounded-full', STATUS_TONES[tone])}>
        <Icon className="size-7" aria-hidden="true" />
      </span>
      {eyebrow && <p className="eyebrow mt-6">{eyebrow}</p>}
      <h1
        id={titleId}
        tabIndex={-1}
        className={cn(
          'font-heading text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-balance outline-none sm:text-3xl',
          eyebrow ? 'mt-2.5' : 'mt-6'
        )}
      >
        {title}
      </h1>
      <div className="mt-3 grid gap-3 leading-relaxed text-pretty text-muted-foreground">{children}</div>
      {actions && <div className="mt-8 grid gap-3">{actions}</div>}
    </FadeUp>
  );
}
