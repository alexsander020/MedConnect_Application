import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';

/**
 * Estados padrão de uma listagem: carregando (skeleton de tabela), erro (com nova tentativa),
 * vazio, ou o conteúdo. Em recarregamentos (troca de página/filtro) o conteúdo anterior continua
 * visível — o `busy` da tabela cuida da opacidade.
 */
export default function ListState({
  isLoading,
  isError,
  onRetry,
  errorTitle = 'Erro ao carregar a listagem',
  errorMessage,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  loadingVariant = 'table',
  loadingRows = 6,
  children,
}) {
  if (isLoading) return <LoadingState variant={loadingVariant} rows={loadingRows} />;
  if (isError) {
    return (
      <ErrorState
        title={errorTitle}
        message={errorMessage || 'Não foi possível buscar os dados no servidor. Verifique sua conexão e tente novamente.'}
        onRetry={onRetry}
      />
    );
  }
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  return children;
}
