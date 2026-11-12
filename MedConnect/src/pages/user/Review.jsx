import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, PackageOpen, Send, Star, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import StarRating from '@/components/StarRating';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { EASE_OUT } from '@/components/motion';
import { useToast } from '@/context/ToastContext';
import { patientApi } from '@/services/endpoints';
import { formatDate } from '@/lib/format';
import { errorCode, errorStatus, friendlyError, shortId } from './components/patient-utils';

const COMMENT_MAX = 500;
const RATING_TEXT = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Regular',
  4: 'Muito bom',
  5: 'Excelente',
};

/** Avaliação de um pedido entregue (1 a 5 estrelas + comentário opcional) */
export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState('');

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => patientApi.order(id),
    enabled: !!id,
  });

  const backToOrder = () => navigate(`/order/${id}`, { replace: true });

  const mutation = useMutation({
    mutationFn: () => patientApi.review({ orderId: id, rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      toast.success('Obrigado! Sua avaliação ajuda outros pacientes e a farmácia.', 'Avaliação enviada');
      backToOrder();
    },
    onError: (err) => {
      const code = errorCode(err);
      if (code === 'REVIEW_ALREADY_EXISTS' || (errorStatus(err) === 409 && code !== 'ORDER_NOT_DELIVERED')) {
        toast.info('Este pedido já foi avaliado anteriormente.', 'Avaliação já registrada');
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        backToOrder();
        return;
      }
      if (code === 'ORDER_NOT_DELIVERED') {
        toast.warning('Só é possível avaliar depois que o pedido for entregue.');
        return;
      }
      toast.error(friendlyError(err, 'Não foi possível enviar sua avaliação. Tente novamente.'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setRatingError('Escolha uma nota de 1 a 5 estrelas.');
      return;
    }
    mutation.mutate();
  };

  const header = (
    <PageHeader
      eyebrow={id ? `Pedido ${shortId(id)}` : 'Pedido'}
      title="Avaliar pedido"
      description="Sua avaliação aparece para outros pacientes com seu primeiro nome e a inicial do sobrenome."
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to={`/order/${id}`}><ArrowLeft aria-hidden="true" /> Voltar ao pedido</Link>
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <>
        {header}
        <LoadingState variant="detail" message="Carregando o pedido…" />
      </>
    );
  }

  if (isError || !order) {
    const notFound = [403, 404].includes(errorStatus(error)) || (!isError && !order);
    return (
      <>
        {header}
        <ErrorState
          title={notFound ? 'Pedido não encontrado' : 'Erro ao carregar o pedido'}
          message={notFound ? 'Não encontramos este pedido na sua conta.' : 'Não foi possível carregar o pedido agora. Tente novamente.'}
          onRetry={notFound ? undefined : refetch}
        />
      </>
    );
  }

  const pharmacyName = order.quote?.pharmacy?.name || 'Farmácia credenciada';

  if (order.review) {
    return (
      <>
        {header}
        <EmptyState
          icon={Star}
          title="Você já avaliou este pedido"
          description={`Sua nota para ${pharmacyName} foi registrada. Obrigado por contar como foi.`}
          action={<Button asChild variant="outline"><Link to={`/order/${id}`}>Voltar ao pedido</Link></Button>}
        />
      </>
    );
  }

  if (order.status !== 'DELIVERED') {
    return (
      <>
        {header}
        <EmptyState
          icon={PackageOpen}
          title="Este pedido ainda não foi entregue"
          description="A avaliação fica disponível assim que a farmácia confirmar a entrega."
          action={<Button asChild variant="outline"><Link to={`/order/${id}`}>Acompanhar pedido</Link></Button>}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <Card className="mx-auto w-full max-w-2xl gap-0 py-0">
        <CardContent className="p-5 sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <Store className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold text-foreground">{pharmacyName}</p>
              <p className="text-sm text-muted-foreground">Pedido aprovado em {formatDate(order.createdAt)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <fieldset className="space-y-3 text-center">
              <legend className="mx-auto mb-3 font-heading text-lg font-semibold text-foreground">Como foi sua experiência?</legend>
              <StarRating
                rating={rating}
                size={36}
                interactive
                label="Sua nota de 1 a 5 estrelas"
                onChange={(v) => {
                  setRating(v);
                  setRatingError('');
                }}
                className="justify-center"
              />
              <div className="h-6" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  {rating > 0 && (
                    <motion.p
                      key={rating}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                      className="text-sm font-medium text-foreground"
                    >
                      {RATING_TEXT[rating]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              {ratingError && <p role="alert" className="text-sm font-medium text-[hsl(4_62%_42%)]">{ratingError}</p>}
            </fieldset>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="review-comment">Comentário (opcional)</Label>
                <span id="review-count" className="num text-xs text-muted-foreground">
                  {comment.length}/{COMMENT_MAX}
                </span>
              </div>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
                maxLength={COMMENT_MAX}
                rows={4}
                placeholder="Conte como foi o atendimento, o prazo e a entrega."
                aria-describedby="review-help review-count"
                className="min-h-28 resize-y"
              />
              <p id="review-help" className="text-xs text-muted-foreground">
                Não inclua dados de saúde, nomes de medicamentos ou dados de contato.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button asChild variant="outline">
                <Link to={`/order/${id}`}>Cancelar</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Spinner /> : <Send aria-hidden="true" />} Enviar avaliação
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
