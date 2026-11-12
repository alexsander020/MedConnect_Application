import { useQuery } from '@tanstack/react-query';
import { FileLock2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DataPagination from '@/components/shared/DataPagination';
import { adminApi } from '@/services/endpoints';
import { prescriptionStatuses } from '@/constants/status';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/format';
import AdminTable from './components/AdminTable';
import { FilterBar, FilterSelect } from './components/FilterBar';
import ListState from './components/ListState';
import { Num, TwoLine } from './components/cells';
import { countActive, useUrlFilters } from './components/useUrlFilters';
import { shortId, toOptions } from './components/labels';

const DEFAULTS = { status: 'ALL', page: 1 };
const FILTER_KEYS = ['status'];
const STATUS_OPTIONS = toOptions(prescriptionStatuses);

/**
 * /admin/prescriptions — somente metadados. O administrador NÃO abre arquivos de receita:
 * a API nem devolve `fileUrl` nesta rota (minimização, LGPD art. 6º, III, e art. 11).
 */
export default function Prescriptions() {
  const { values, setFilter, setPage, clear } = useUrlFilters(DEFAULTS);
  const params = { status: values.status, page: values.page };
  const list = useQuery({
    queryKey: ['adminPrescriptions', params],
    queryFn: () => adminApi.prescriptions(params),
    placeholderData: (prev) => prev,
  });
  const rows = list.data?.data || [];
  const active = countActive(values, DEFAULTS, FILTER_KEYS);

  const columns = [
    {
      key: 'id',
      header: 'Receita',
      primary: true,
      cell: (p) => (
        <span className="flex flex-col">
          <Num>{shortId(p.id)}</Num>
          <span className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge kind="prescription" status={p.status} /> },
    { key: 'patient', header: 'Paciente', className: 'max-w-[240px]', cell: (p) => <TwoLine title={p.patient?.name} /> },
    {
      key: 'quotes',
      header: 'Cotações recebidas',
      headClassName: 'text-right',
      className: 'text-right',
      cell: (p) => <span className="num text-[0.8125rem]">{formatNumber(p.quotesCount ?? 0)}</span>,
    },
    { key: 'age', header: 'Enviada', cell: (p) => <span className="whitespace-nowrap text-muted-foreground">{formatRelative(p.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Receitas"
        description="Acompanhe o fluxo das receitas enviadas pelos pacientes: status, quantidade de cotações e tempo desde o envio."
      />

      <div className="mb-6 flex gap-3.5 rounded-2xl border border-border bg-mint-wash px-5 py-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <FileLock2 className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-medium text-foreground">Administradores não abrem arquivos de receita</p>
          <p className="mt-0.5 text-muted-foreground">
            Receitas são dados de saúde (dado pessoal sensível). Pelo princípio da minimização da LGPD, esta tela mostra apenas
            metadados — a API nem envia o endereço do arquivo nesta rota. O arquivo fica restrito ao paciente e às farmácias
            credenciadas que vão cotá-lo, por links temporários.
          </p>
        </div>
      </div>

      <FilterBar activeCount={active} onClear={() => clear(FILTER_KEYS)}>
        <FilterSelect label="Filtrar por status da receita" value={values.status} onChange={(v) => setFilter('status', v)} options={STATUS_OPTIONS} allLabel="Todos os status" />
      </FilterBar>

      <ListState
        isLoading={list.isLoading}
        isError={list.isError && !list.data}
        onRetry={list.refetch}
        errorTitle="Erro ao carregar receitas"
        isEmpty={rows.length === 0}
        emptyIcon={FileText}
        emptyTitle={active ? 'Nenhuma receita com esse status' : 'Nenhuma receita enviada ainda'}
        emptyDescription={active ? 'Escolha outro status ou limpe o filtro.' : 'As receitas aparecem aqui quando os pacientes começarem a enviá-las.'}
        emptyAction={active ? <Button variant="outline" onClick={() => clear(FILTER_KEYS)}>Limpar filtro</Button> : null}
      >
        <AdminTable caption="Receitas (somente metadados)" columns={columns} rows={rows} busy={list.isFetching && list.isPlaceholderData} />
        <DataPagination page={list.data?.page} totalPages={list.data?.totalPages} total={list.data?.total} onPageChange={setPage} />
      </ListState>
    </>
  );
}
