import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LifeBuoy, Plus, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import SupportTicketForm from '@/components/account/SupportTicketForm';
import { supportApi } from '@/services/endpoints';
import { supportTicketCategories } from '@/constants/status';
import { formatDateTime, formatRelative } from '@/lib/format';

/** "Atendimento": chamados do titular logado + abrir novo (paciente e farmácia) */
export default function SupportPage() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['mySupportTickets'], queryFn: supportApi.myTickets });
  const tickets = data?.data || [];

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Atendimento"
        description="Fale com a equipe MedConnect sobre pedidos, receitas, credenciamento ou privacidade. Cada mensagem recebe um protocolo."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" /> Novo chamado
          </Button>
        }
      />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="Nenhum chamado aberto"
          description="Quando precisar de ajuda, abra um chamado. Você acompanha a resposta por aqui e por e-mail."
          action={<Button onClick={() => setOpen(true)}><Plus aria-hidden="true" /> Abrir chamado</Button>}
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Accordion type="single" collapsible>
              {tickets.map((t) => (
                <AccordionItem key={t.id} value={t.id} className="px-5">
                  <AccordionTrigger className="gap-4 py-4 hover:no-underline">
                    <span className="flex min-w-0 flex-1 flex-col gap-1 text-left sm:flex-row sm:items-center sm:gap-3">
                      <span className="num text-xs text-muted-foreground">{t.protocol}</span>
                      <span className="truncate font-medium">{t.subject}</span>
                    </span>
                    <StatusBadge kind="ticket" status={t.status} />
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-5 text-sm">
                    <p className="text-muted-foreground">
                      {supportTicketCategories[t.category]} · aberto {formatRelative(t.createdAt)} · atualizado em {formatDateTime(t.updatedAt)}
                    </p>
                    {t.resolution ? (
                      <div className="rounded-xl border border-border bg-mint-wash p-4">
                        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                          <MessageSquareText className="size-4" aria-hidden="true" /> Resposta da equipe
                        </p>
                        <p className="whitespace-pre-line leading-relaxed">{t.resolution}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Ainda sem resposta. Normalmente respondemos em até 2 dias úteis.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Novo chamado</DialogTitle>
            <DialogDescription>Responderemos no e-mail da sua conta. Não inclua dados de saúde além do necessário.</DialogDescription>
          </DialogHeader>
          <SupportTicketForm compact onCreated={() => setTimeout(() => setOpen(false), 1400)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
