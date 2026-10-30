import { prisma } from '../lib/prisma';
import { io } from '../server';

export interface CreateNotificationOptions {
  userId?: string;
  pharmacyId?: string;
  type:
    | 'NEW_QUOTE'
    | 'QUOTE_ACCEPTED'
    | 'ORDER_STATUS_UPDATE'
    | 'PHARMACY_VERIFIED'
    | 'NEW_ORDER'
    | 'CAPABILITY_APPROVED'
    | 'CAPABILITY_REJECTED'
    | 'CAPABILITY_SUSPENDED';
  title: string;
  message: string;
}

export async function createAndSendNotification(options: CreateNotificationOptions) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: options.userId,
        pharmacyId: options.pharmacyId,
        type: options.type,
        title: options.title,
        message: options.message,
        read: false
      }
    });

    const targetRoom = options.userId || options.pharmacyId;
    if (targetRoom && io) {
      io.to(targetRoom).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Erro ao registrar notificação:', error);
    return null;
  }
}
