import { OrderStatus, Role } from '@prisma/client';

export class OrderTransitionError extends Error {
  public readonly statusCode = 409;
  public readonly code = 'INVALID_ORDER_TRANSITION';

  constructor(public readonly fromStatus: OrderStatus, public readonly toStatus: OrderStatus) {
    super(`Transição de status inválida: não é permitido alterar de '${fromStatus}' para '${toStatus}'.`);
    this.name = 'OrderTransitionError';
  }
}

export class OrderAuthorizationError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'FORBIDDEN_ORDER_MODIFICATION';

  constructor(message = 'Apenas a farmácia responsável por este pedido pode alterar seu status.') {
    super(message);
    this.name = 'OrderAuthorizationError';
  }
}

/**
 * Matriz de transições de status válidas para um pedido no MedConnect:
 * - PRODUCTION -> DELIVERY
 * - DELIVERY -> DELIVERED
 * - PRODUCTION -> CANCELLED
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PRODUCTION: ['DELIVERY', 'CANCELLED'],
  DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

/**
 * Verifica se uma transição de status é permitida.
 */
export function isValidOrderTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  if (fromStatus === toStatus) return false;
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Valida a transição de status ou lança erro 409 explicativo.
 */
export function assertValidOrderTransition(fromStatus: OrderStatus, toStatus: OrderStatus): void {
  if (!isValidOrderTransition(fromStatus, toStatus)) {
    throw new OrderTransitionError(fromStatus, toStatus);
  }
}

/**
 * Garante que apenas a farmácia responsável pelo pedido possa alterar seu status.
 * O paciente dono apenas consulta (conforme regra de negócio R8 alinhada).
 */
export function assertPharmacyCanUpdateOrder(
  actor: { id: string; role: Role | string },
  pharmacyOwnerId: string
): void {
  if (actor.role !== Role.PHARMACY && actor.role !== 'PHARMACY') {
    throw new OrderAuthorizationError('Apenas a farmácia responsável por este pedido pode alterar seu status.');
  }

  if (actor.id !== pharmacyOwnerId) {
    throw new OrderAuthorizationError('Acesso negado: este pedido pertence a outra farmácia.');
  }
}
