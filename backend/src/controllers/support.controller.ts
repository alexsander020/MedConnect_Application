import { Response } from 'express';
import { Role, SupportTicketCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SupportTicketService } from '../services/supportTicketService';

// Teto defensivo da listagem do próprio solicitante
const MY_TICKETS_MAX = 100;

export class SupportController {
  /**
   * Abertura de chamado (rota pública com rate limit próprio).
   * Com Bearer válido, o chamado é vinculado ao titular e usa o nome/e-mail da conta;
   * sem autenticação, nome e e-mail informados no corpo são obrigatórios.
   */
  async createTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, email, category, subject, message } = req.body as {
        name?: string;
        email?: string;
        category?: SupportTicketCategory;
        subject: string;
        message: string;
      };

      let owner: { requesterType: Role; userId?: string; pharmacyId?: string; name: string; email: string } | null = null;

      if (req.user) {
        if (req.user.role === Role.PHARMACY) {
          const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true }
          });
          if (pharmacy) {
            owner = { requesterType: Role.PHARMACY, pharmacyId: pharmacy.id, name: pharmacy.name, email: pharmacy.email };
          }
        } else {
          const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true }
          });
          if (user) {
            owner = { requesterType: user.role, userId: user.id, name: user.name, email: user.email };
          }
        }
      }

      if (!owner && (!name || !email)) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Nome e e-mail são obrigatórios para abrir um chamado sem estar logado.' }
        });
        return;
      }

      const ticket = await SupportTicketService.create({
        requesterType: owner?.requesterType ?? null,
        userId: owner?.userId,
        pharmacyId: owner?.pharmacyId,
        name: owner?.name ?? name!,
        email: owner?.email ?? email!,
        category,
        subject,
        message
      });

      res.status(201).json({
        id: ticket.id,
        protocol: ticket.protocol,
        status: ticket.status,
        createdAt: ticket.createdAt
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao abrir chamado de suporte' } });
    }
  }

  /**
   * Chamados do próprio titular autenticado (paciente, admin ou farmácia).
   */
  async getMyTickets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where = req.user!.role === Role.PHARMACY ? { pharmacyId: req.user!.id } : { userId: req.user!.id };
      const tickets = await prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: MY_TICKETS_MAX
      });
      res.json({ data: tickets.map((t) => SupportTicketService.toRequesterView(t)) });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar chamados' } });
    }
  }
}
