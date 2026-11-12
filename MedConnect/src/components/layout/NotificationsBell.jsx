import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCheck, BellOff } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { notificationsApi } from '@/services/endpoints';
import { formatRelative } from '@/lib/format';

export function useNotifications() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
  });
  const items = Array.isArray(query.data) ? query.data : [];
  const unread = items.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old = []) => old.map((n) => (n.id === id ? { ...n, read: true } : n)));
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && queryClient.setQueryData(['notifications'], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old = []) => old.map((n) => ({ ...n, read: true })));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && queryClient.setQueryData(['notifications'], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return { ...query, items, unread, markRead, markAll };
}

export function NotificationItem({ n, onRead, compact = false }) {
  return (
    <button
      type="button"
      onClick={() => !n.read && onRead?.(n.id)}
      className={cn(
        'flex w-full gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        !n.read && 'bg-mint-wash'
      )}
    >
      <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{n.title}</span>
        <span className={cn('block text-sm text-muted-foreground', compact && 'line-clamp-2')}>{n.message}</span>
        <span className="mt-1 block text-xs text-muted-foreground/80">{formatRelative(n.createdAt)}</span>
      </span>
      {!n.read && <span className="sr-only">(não lida — clique para marcar como lida)</span>}
    </button>
  );
}

export default function NotificationsBell({ allHref = '/notifications' }) {
  const { items, unread, markRead, markAll, isLoading } = useNotifications();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notificações: ${unread} não lidas` : 'Notificações'}>
          <Bell className="size-5" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="num absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[0.625rem] text-white"
              >
                {unread > 9 ? '9+' : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-heading text-[0.9375rem] font-semibold">Notificações</p>
          {unread > 0 && (
            <Button variant="ghost" size="xs" onClick={() => markAll.mutate()}>
              <CheckCheck aria-hidden="true" /> Marcar todas como lidas
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
            <BellOff className="size-6" aria-hidden="true" />
            {isLoading ? 'Carregando…' : 'Nenhuma notificação por enquanto.'}
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="space-y-0.5 p-1.5">
              {items.slice(0, 8).map((n) => (
                <NotificationItem key={n.id} n={n} compact onRead={(id) => markRead.mutate(id)} />
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" className="w-full">
            <Link to={allHref}>Ver todas</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
