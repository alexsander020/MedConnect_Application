/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import OrderManagement from './OrderManagement';
import { api } from '../../services/api';
import { apiError, renderRoute } from './test-utils';

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn() },
  getSocket: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'ph1', name: 'Farmácia Exemplo', role: 'PHARMACY' }, userType: 'PHARMACY' }),
}));

const now = new Date().toISOString();
const order = (id, status, name, extra = {}) => ({
  id,
  status,
  createdAt: now,
  updatedAt: now,
  quote: {
    id: `q-${id}`,
    priceCents: 8990,
    price: '89.90',
    deliveryDays: 3,
    prescriptionId: `p-${id}`,
    prescription: { id: `p-${id}`, patient: { id: `u-${id}`, name, phone: 'cifrado', address: 'cifrado' } },
  },
  history: [],
  ...extra,
});

const ORDERS = [
  order('o1aaaaaa-0000', 'PRODUCTION', 'Maria Souza'),
  order('o2bbbbbb-0000', 'DELIVERY', 'João Lima'),
  order('o3cccccc-0000', 'DELIVERED', 'Ana Prado'),
];

let store;
beforeEach(() => {
  jest.clearAllMocks();
  store = ORDERS.map((o) => ({ ...o }));
  api.get.mockImplementation((url) =>
    url === '/orders/my' ? Promise.resolve({ data: store.map((o) => ({ ...o })) }) : Promise.reject(new Error(`unexpected GET ${url}`))
  );
  // "Servidor" em memória: persiste a transição para o refetch posterior
  api.patch.mockImplementation((url, body) => {
    const id = url.split('/')[2];
    store = store.map((o) => (o.id === id ? { ...o, status: body.status } : o));
    return Promise.resolve({ data: store.find((o) => o.id === id) });
  });
});

describe('OrderManagement (farmácia)', () => {
  it('lista os pedidos em produção com o primeiro nome do paciente, sem exibir contato cifrado', async () => {
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders' });
    expect(await screen.findByText('Maria')).toBeInTheDocument();
    expect(screen.queryByText('Maria Souza')).toBeNull();
    expect(screen.queryByText('cifrado')).toBeNull();
    expect(screen.getByText('R$ 89,90')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Em produção/ })).toHaveTextContent('(1)');
    expect(screen.getByRole('tab', { name: /Concluídos/ })).toHaveTextContent('(1)');
  });

  it('despacha para entrega: PATCH /orders/:id/status com DELIVERY e atualização otimista', async () => {
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders' });
    fireEvent.click(await screen.findByRole('button', { name: /Despachar para entrega/ }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/orders/o1aaaaaa-0000/status', { status: 'DELIVERY' }));
    // O pedido sai da aba "Em produção" na hora e passa a contar em "Em entrega"
    await waitFor(() => expect(screen.getByRole('tab', { name: /Em entrega/ })).toHaveTextContent('(2)'));
    expect(screen.getByRole('tab', { name: /Em produção/ })).toHaveTextContent('(0)');
  });

  it('confirma a entrega na aba "Em entrega" (DELIVERY → DELIVERED)', async () => {
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders?tab=delivery' });
    expect(await screen.findByText('João')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar pedido/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar entrega/ }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/orders/o2bbbbbb-0000/status', { status: 'DELIVERED' }));
  });

  it('pede confirmação antes de cancelar e só então envia CANCELLED', async () => {
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders' });
    fireEvent.click(await screen.findByRole('button', { name: /Cancelar pedido/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/não pode ser desfeito/)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /Cancelar pedido/ }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/orders/o1aaaaaa-0000/status', { status: 'CANCELLED' }));
  });

  it('desfaz a atualização otimista quando o servidor recusa a transição', async () => {
    api.patch.mockRejectedValueOnce(apiError(409, 'INVALID_ORDER_TRANSITION', 'Transição de status inválida.'));
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders' });
    fireEvent.click(await screen.findByRole('button', { name: /Despachar para entrega/ }));
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    // O refetch devolve o estado do servidor: o pedido continua em produção
    expect(await screen.findByText('Maria')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('tab', { name: /Em produção/ })).toHaveTextContent('(1)'));
  });

  it('não exibe transições para pedidos concluídos', async () => {
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders?tab=done' });
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Despachar|Confirmar entrega|Cancelar pedido/ })).toBeNull();
  });
});
