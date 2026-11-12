import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { supportApi } from '@/services/endpoints';
import { supportTicketCategories } from '@/constants/status';
import { apiErrorMessage } from '@/lib/format';
import { EASE_OUT } from '@/components/motion';

/**
 * Formulário de atendimento — POST /support/tickets.
 * Visitante informa nome/e-mail; logado usa os dados da conta (o servidor vincula pelo token).
 */
export default function SupportTicketForm({ defaultCategory = 'GENERAL', onCreated, compact = false }) {
  const { currentUser, isAuthenticated } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    category: supportTicketCategories[defaultCategory] ? defaultCategory : 'GENERAL',
    subject: '',
    message: '',
  });
  const [created, setCreated] = useState(null);

  const mutation = useMutation({
    mutationFn: () => supportApi.create(form),
    onSuccess: (ticket) => {
      setCreated(ticket);
      toast.success(`Protocolo ${ticket.protocol}. Responderemos pelo e-mail informado.`, 'Mensagem enviada');
      queryClient.invalidateQueries({ queryKey: ['mySupportTickets'] });
      onCreated?.(ticket);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Não foi possível enviar sua mensagem.')),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const valid = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && form.subject.trim().length >= 3 && form.message.trim().length >= 10;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {created ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="flex flex-col items-center rounded-2xl border border-border bg-mint-wash px-6 py-10 text-center"
          role="status"
        >
          <CheckCircle2 className="mb-3 size-10 text-primary" aria-hidden="true" />
          <p className="font-heading text-lg font-semibold">Recebemos sua mensagem</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Protocolo <span className="num text-foreground">{created.protocol}</span>. Guarde este número para acompanhar o atendimento.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => { setCreated(null); setForm((f) => ({ ...f, subject: '', message: '' })); }}>
            Enviar outra mensagem
          </Button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="grid gap-4"
          noValidate
        >
          {!isAuthenticated && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="st-name">Seu nome</Label>
                <Input id="st-name" autoComplete="name" required value={form.name} onChange={set('name')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="st-email">E-mail para resposta</Label>
                <Input id="st-email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
              </div>
            </div>
          )}
          <div className={compact ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-[minmax(0,240px)_1fr]'}>
            <div className="grid gap-2">
              <Label htmlFor="st-category">Assunto</Label>
              <Select value={form.category} onValueChange={set('category')}>
                <SelectTrigger id="st-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(supportTicketCategories).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st-subject">Título</Label>
              <Input id="st-subject" required maxLength={160} placeholder="Resuma em poucas palavras" value={form.subject} onChange={set('subject')} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="st-message">Mensagem</Label>
            <Textarea id="st-message" required rows={compact ? 4 : 6} className={compact ? 'min-h-28' : 'min-h-40'} maxLength={5000} value={form.message} onChange={set('message')} placeholder="Conte o que aconteceu. Se for sobre um pedido, informe o número dele." />
            <p className="text-xs text-muted-foreground">
              Evite enviar dados de saúde além do necessário. Esta mensagem é lida apenas pela equipe de atendimento e cada leitura é registrada.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? <Spinner /> : <Send aria-hidden="true" />} Enviar mensagem
            </Button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
