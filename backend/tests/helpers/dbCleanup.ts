import { PrismaClient } from '@prisma/client';

/**
 * Limpa todas as tabelas do banco de teste em ordem segura de integridade referencial.
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Chamados usam onDelete: SetNull e sobreviveriam à remoção das contas; horários já caem em cascata,
  // mas são removidos explicitamente para deixar a ordem clara.
  await prisma.supportTicket.deleteMany();
  await prisma.pharmacyBusinessHour.deleteMany();
  await prisma.review.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.prescriptionAccessLog.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.prescription.deleteMany();
  if ((prisma as any).animal) {
    await (prisma as any).animal.deleteMany();
  }
  if ((prisma as any).pharmacyCapability) {
    await (prisma as any).pharmacyCapability.deleteMany();
  }
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.user.deleteMany();
}
