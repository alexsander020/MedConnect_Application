import { useState } from 'react';
import { BellOff, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Stagger, StaggerItem } from '@/components/motion';
import { NotificationItem, useNotifications } from '@/components/layout/NotificationsBell';

/** Central de notificações (paciente e farmácia) */
export default function NotificationsPage() {
  const { items, unread, isLoading, isError, refetch, markRead, markAll } = useNotifications();
  const [filter, setFilter] = useState('all');
  const list = filter === 'unread' ? items.filter((n) => !n.read) : items;

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Notificações"
        description="Cotações recebidas, mudanças de status dos pedidos e avisos da plataforma."
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <CheckCheck aria-hidden="true" /> Marcar todas como lidas
            </Button>
          )
        }
      />
      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({items.length})</TabsTrigger>
          <TabsTrigger value="unread">Não lidas ({unread})</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={BellOff} title={filter === 'unread' ? 'Tudo lido por aqui' : 'Nenhuma notificação ainda'} description="Avisaremos aqui quando houver novidades sobre suas receitas e pedidos." />
      ) : (
        <Stagger step={0.04} inView={false} className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {list.map((n) => (
            <StaggerItem key={n.id} y={8}>
              <NotificationItem n={n} onRead={(id) => markRead.mutate(id)} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
