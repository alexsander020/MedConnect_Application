import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/context/ToastContext';
import { patientApi } from '@/services/endpoints';
import { friendlyError, resolveApiUrl } from './patient-utils';

/**
 * "Ver receita": pede ao servidor uma URL assinada (válida por 5 minutos, cada acesso é auditado)
 * e abre em nova aba. A aba é aberta já no clique para não ser barrada pelo bloqueador de pop-ups.
 */
export default function ViewPrescriptionButton({
  prescriptionId,
  label = 'Ver receita',
  variant = 'outline',
  size = 'default',
  className,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!prescriptionId || loading) return;
    let win = null;
    try {
      win = window.open('', '_blank');
      if (win?.document?.body) {
        win.document.title = 'Abrindo receita…';
        win.document.body.textContent = 'Abrindo sua receita com segurança…';
      }
    } catch {
      win = null;
    }
    setLoading(true);
    try {
      const data = await patientApi.prescriptionViewUrl(prescriptionId);
      const url = resolveApiUrl(data?.signedUrl);
      if (!url) throw new Error('sem-url');
      if (win && !win.closed) {
        win.opener = null;
        win.location.href = url;
      } else {
        toast.show({
          type: 'info',
          title: 'Link da receita pronto',
          message: 'Seu navegador bloqueou a nova aba. O link vale por 5 minutos.',
          action: { label: 'Abrir receita', onClick: () => window.open(url, '_blank', 'noopener,noreferrer') },
        });
      }
    } catch (err) {
      if (win && !win.closed) win.close();
      toast.error(friendlyError(err, 'Não foi possível abrir a receita agora. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={handleClick} disabled={!prescriptionId || loading}>
      {loading ? <Spinner /> : <FileText aria-hidden="true" />}
      {label}
      <span className="sr-only"> (abre em nova aba)</span>
    </Button>
  );
}
