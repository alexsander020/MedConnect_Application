import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, ShieldCheck, Store } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { pharmacyApi } from '@/services/endpoints';
import ProfileTab from './components/ProfileTab';
import HoursEditor from './components/HoursEditor';
import SecurityTab from './components/SecurityTab';

const TABS = [
  { value: 'profile', label: 'Perfil', icon: Store },
  { value: 'hours', label: 'Horários', icon: Clock },
  { value: 'security', label: 'Segurança', icon: ShieldCheck },
];

/** Configurações da farmácia (/pharmacy/settings?tab=profile|hours|security) */
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'profile';
  const setTab = (value) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('tab', value);
      return next;
    }, { replace: true });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pharmacyMe'],
    queryFn: pharmacyApi.me,
    staleTime: 5 * 60_000,
  });

  const needsData = (node) => {
    if (isLoading) return <LoadingState variant="detail" message="Carregando dados da farmácia…" />;
    if (isError || !data) {
      return <ErrorState title="Erro ao carregar os dados da farmácia" message="Não foi possível buscar o seu perfil agora. Tente novamente." onRetry={refetch} />;
    }
    return node;
  };

  return (
    <>
      <PageHeader
        eyebrow="Farmácia"
        title="Configurações"
        description="O perfil que os pacientes veem, o horário de funcionamento e a segurança da conta."
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="w-full sm:w-fit">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-3">
              <t.icon aria-hidden="true" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile" forceMount className="data-[state=inactive]:hidden">
          {needsData(data && <ProfileTab key={data.id} pharmacy={data} />)}
        </TabsContent>
        <TabsContent value="hours" forceMount className="data-[state=inactive]:hidden">
          {needsData(data && <HoursEditor key={data.id} pharmacy={data} />)}
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab pharmacy={data} loading={isLoading} />
        </TabsContent>
      </Tabs>
    </>
  );
}
