import { motion } from 'motion/react';
import { cn } from 'cn';

/**
 * Primitivas de movimento do MedConnect (Motion).
 * Regras: ease-out forte, transform/opacity apenas, nada quica (é um produto de saúde),
 * movimento reduzido respeitado globalmente pelo <MotionConfig reducedMotion="user"> em App.jsx.
 */

export const EASE_OUT = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];

/** Texto/bloco que sobe suavemente (hero: 0.7s) */
export function FadeUp({ as = 'div', delay = 0, duration = 0.7, y = 16, inView = false, className, children, ...props }) {
  const Comp = motion[as] || motion.div;
  const target = { opacity: 1, y: 0 };
  return (
    <Comp
      initial={{ opacity: 0, y }}
      {...(inView ? { whileInView: target, viewport: { once: true, margin: '-60px' } } : { animate: target })}
      transition={{ duration, delay, ease: EASE_OUT }}
      className={className}
      {...props}
    >
      {children}
    </Comp>
  );
}

const staggerParent = (step, delay) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

const staggerChild = (y, scale) => ({
  hidden: { opacity: 0, y, ...(scale ? { scale } : {}) },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_OUT } },
});

/**
 * Lista com entrada escalonada. Use <StaggerItem> nos filhos.
 * step: 0.06 (cards de serviço), 0.04 (linhas de tabela), 0.1 (cards de pessoas), 0.12 (passos)
 */
export function Stagger({ as = 'div', step = 0.06, delay = 0, inView = true, className, children, ...props }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      variants={staggerParent(step, delay)}
      initial="hidden"
      {...(inView ? { whileInView: 'show', viewport: { once: true, margin: '-40px' } } : { animate: 'show' })}
      className={className}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({ as = 'div', y = 20, scale, className, children, ...props }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp variants={staggerChild(y, scale)} className={className} {...props}>
      {children}
    </Comp>
  );
}

/** Imagem/bloco revelado com wipe de clip-path vindo da direita (1s) */
export function ClipReveal({ delay = 0.15, duration = 1, className, children, ...props }) {
  return (
    <motion.div
      initial={{ clipPath: 'inset(0 0 0 100%)' }}
      animate={{ clipPath: 'inset(0 0 0 0%)' }}
      transition={{ duration, delay, ease: EASE_IN_OUT }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Círculos numerados / ícones: scale 0.85 → 1, sem overshoot */
export function PopIn({ delay = 0, className, children, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: EASE_OUT }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Transição de página leve para o conteúdo das áreas logadas */
export function PageTransition({ className, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className={cn('flex min-w-0 flex-1 flex-col', className)}
    >
      {children}
    </motion.div>
  );
}

/** Card com elevação de -4px no hover + régua inferior que cresce (scaleX 0 → 1, 0.35s) */
export function LiftCard({ as = 'div', className, ruleClassName, children, ...props }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      initial="rest"
      whileHover="hover"
      whileFocus="hover"
      animate="rest"
      variants={{ rest: { y: 0 }, hover: { y: -4 } }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className={cn('group relative overflow-hidden', className)}
      {...props}
    >
      {children}
      <motion.span
        aria-hidden="true"
        variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        style={{ originX: 0 }}
        className={cn('absolute inset-x-0 bottom-0 h-[3px] bg-primary', ruleClassName)}
      />
    </Comp>
  );
}
