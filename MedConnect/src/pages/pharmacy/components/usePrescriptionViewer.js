import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { pharmacyApi } from '@/services/endpoints';
import { errorStatus, resolveApiUrl, serverMessage } from './utils';

/**
 * Abre a receita numa nova aba via URL assinada (5 min, acesso registrado em PrescriptionAccessLog).
 * O servidor só libera o arquivo para a farmácia cuja cotação foi aceita; nos demais casos
 * explicamos o motivo (LGPD) em vez de mostrar um erro genérico.
 */
export function usePrescriptionViewer() {
  const toast = useToast();
  const [pendingId, setPendingId] = useState(null);

  const open = async (prescriptionId) => {
    if (!prescriptionId || pendingId) return;
    setPendingId(prescriptionId);
    try {
      const data = await pharmacyApi.prescriptionViewUrl(prescriptionId);
      const url = resolveApiUrl(data?.signedUrl || data?.url);
      if (!url) throw new Error('missing-url');
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.info('O link é temporário (5 minutos) e o acesso fica registrado na trilha de auditoria.', 'Receita aberta em nova aba');
    } catch (err) {
      if (errorStatus(err) === 403) {
        toast.info(
          'Por privacidade (LGPD), o arquivo da receita só é liberado para a farmácia escolhida pelo paciente, depois que ele aprova a cotação.',
          'Receita protegida'
        );
      } else {
        toast.error(serverMessage(err, 'Não foi possível abrir a receita agora. Tente novamente.'));
      }
    } finally {
      setPendingId(null);
    }
  };

  return { open, pendingId };
}
