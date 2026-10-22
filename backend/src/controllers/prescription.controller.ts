import { PrescriptionStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class PrescriptionController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
         res.status(401).json({ error: 'Não autorizado' });
         return;
      }
      
      // O req.file vem do middleware Multer
      const fileUrl = req.file?.path;
      
      if (!fileUrl) {
         res.status(400).json({ error: 'Arquivo da receita é obrigatório' });
         return;
      }

      const prescription = await prisma.prescription.create({
        data: {
          patientId: req.user.id,
          fileUrl,
          status: PrescriptionStatus.PENDING
        }
      });
      
      res.status(201).json(prescription);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao fazer upload da receita' });
    }
  }

  async getMyPrescriptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
         res.status(401).json({ error: 'Não autorizado' });
         return;
      }
      
      const prescriptions = await prisma.prescription.findMany({
        where: { patientId: req.user.id },
        include: { quotes: true }
      });
      res.json(prescriptions);
    } catch (error) {
      console.error('Erro ao buscar receitas do paciente:', error);
      res.status(500).json({ error: 'Erro ao buscar receitas' });
    }
  }

  async getAvailableForPharmacy(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const prescriptions = await prisma.prescription.findMany({
        where: {
          status: { in: [PrescriptionStatus.PENDING, PrescriptionStatus.QUOTED] }
        },
        include: {
          quotes: {
            where: { pharmacyId: req.user.id }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // LGPD Art. 11: Não expor dados diretos (nome, telefone, endereço) nem arquivo da receita na listagem aberta
      const sanitized = prescriptions.map((p) => ({
        id: p.id,
        createdAt: p.createdAt,
        status: p.status,
        patient: {
          anonymousId: `Paciente #${p.patientId.slice(0, 5).toUpperCase()}`
        },
        quotes: p.quotes
      }));

      res.json(sanitized);
    } catch (error) {
      console.error('Erro ao buscar receitas para farmácia:', error);
      res.status(500).json({ error: 'Erro ao buscar receitas' });
    }
  }
}
