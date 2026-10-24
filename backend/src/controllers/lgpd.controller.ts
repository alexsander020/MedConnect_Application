import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SubjectRightsService } from '../services/subjectRightsService';

export class LgpdController {
  /**
   * Exporta todos os dados do titular autenticado em formato JSON (LGPD Art. 18, II e V).
   */
  async exportMyData(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      // Proteção anti-IDOR: o titular só pode exportar os seus próprios dados
      const targetUserId = (req.query.userId as string) || req.user.id;
      if (targetUserId !== req.user.id && req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: você só tem permissão para exportar seus próprios dados pessoais.'
          }
        });
        return;
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const data = await SubjectRightsService.exportData(targetUserId, clientIp, req.headers['user-agent']);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dados-pessoais-titular-${targetUserId}.json"`);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Erro ao exportar dados do titular' } });
    }
  }

  /**
   * Solicita a anonimização e exclusão da conta e dados do titular (LGPD Art. 18, VI).
   */
  async anonymizeMyAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      // Proteção anti-IDOR: apenas o próprio titular ou ADMIN pode acionar a exclusão
      const targetUserId = (req.body?.userId as string) || req.user.id;
      if (targetUserId !== req.user.id && req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: você só tem permissão para solicitar a exclusão da sua própria conta.'
          }
        });
        return;
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const result = await SubjectRightsService.anonymizeUser(targetUserId, clientIp, req.headers['user-agent']);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Erro ao processar anonimização' } });
    }
  }
}
