import { Link } from 'react-router-dom';
import { FileSignature, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ChangePasswordCard from '@/components/account/ChangePasswordCard';
import { KeyValue, KeyValueList } from '@/components/shared/KeyValue';
import { formatDateTime } from '@/lib/format';

/** Aba "Segurança": troca de senha + registro do aceite do Termo de Adesão */
export default function SecurityTab({ pharmacy, loading }) {
  const accepted = Boolean(pharmacy?.termsAcceptedAt);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
      <div className="min-w-0">
        <ChangePasswordCard />
      </div>
      <Card className="min-w-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading">
            <FileSignature className="size-5 text-primary" aria-hidden="true" /> Termo de Adesão
          </CardTitle>
          <CardDescription>Regras de uso da plataforma pelas farmácias, incluindo o tratamento de dados de pacientes (LGPD).</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          {loading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : accepted ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" aria-hidden="true" /> Aceite registrado
              </p>
              <KeyValueList>
                <KeyValue label="Aceito em"><span className="num">{formatDateTime(pharmacy.termsAcceptedAt)}</span></KeyValue>
                <KeyValue label="Versão"><span className="num">{pharmacy.termsVersion || '—'}</span></KeyValue>
              </KeyValueList>
            </>
          ) : (
            <p className="flex gap-2 rounded-xl border border-[color-mix(in_oklab,var(--amber)_30%,var(--border))] bg-amber-wash p-3 text-sm leading-relaxed text-foreground/85">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
              Não encontramos o registro do seu aceite. Leia o termo e, se tiver dúvidas, fale com o atendimento.
            </p>
          )}
          <Button asChild variant="outline" className="self-start">
            <Link to="/pharmacy-terms" target="_blank" rel="noopener noreferrer">
              Ler o Termo de Adesão <ExternalLink aria-hidden="true" />
              <span className="sr-only">(abre em nova aba)</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
