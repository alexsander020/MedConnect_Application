import { Response } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ConsentService } from '../services/consentService';
import { CURRENT_HEALTH_CONSENT, CONSENT_DEFINITIONS } from '../constants/consentTexts';

export class ConsentController {
  /**
   * Retorna os textos de consentimento atualmente vigentes e suas versões.
   */
  async getTerms(req: AuthRequest, res: Response): Promise<void> {
    res.json({
      activeVersions: CONSENT_DEFINITIONS,
      currentHealthConsent: CURRENT_HEALTH_CONSENT,
      disclaimer: '[RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA: Minuta técnica de termos de consentimento]'
    });
  }

  /**
   * Consulta o status de consentimento do titular autenticado.
   */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const status = await ConsentService.hasActiveConsent(req.user.id);
      const history = await ConsentService.getConsentsByUser(req.user.id);

      res.json({
        userId: req.user.id,
        hasActiveHealthConsent: status.active,
        isRevoked: status.isRevoked,
        latestConsent: status.latestConsent,
        currentVersion: CURRENT_HEALTH_CONSENT.version,
        history
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao consultar status de consentimento' } });
    }
  }

  /**
   * Registra expressamente o consentimento do titular (Opt-in).
   */
  async giveConsent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { consentType } = req.body || {};
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      const consent = await ConsentService.recordConsent({
        userId: req.user.id,
        userType: req.user.role as Role,
        consentType: consentType || CURRENT_HEALTH_CONSENT.type,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        consent,
        message: 'Consentimento registrado com sucesso.'
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao registrar consentimento' } });
    }
  }

  /**
   * Revoga o consentimento do titular.
   * Consequência LGPD: Bloqueia novos usos e inicia o fluxo de exclusão.
   */
  async revokeConsent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { reason } = req.body || {};
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      const result = await ConsentService.revokeConsent({
        userId: req.user.id,
        userType: req.user.role as Role,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'],
        reason
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao revogar consentimento' } });
    }
  }
}
