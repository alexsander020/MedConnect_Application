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

// Pedido veterinário: a listagem (GET /orders/my) traz só o resumo do animal; contato do tutor só no detalhe auditado
const VET_ORDER = {
  id: 'ord-vet-12345678',
  status: 'PRODUCTION',
  createdAt: now,
  updatedAt: now,
  quote: {
    id: 'quote-vet-1',
    priceCents: 6500,
    price: '65.00',
    deliveryDays: 2,
    pharmaceuticalForm: 'Biscoito medicamentoso',
    flavoring: 'Carne',
    estimatedPreparationDays: 1,
    prescriptionId: 'rx-vet-1',
    prescription: {
      id: 'rx-vet-1',
      kind: 'VETERINARY',
      vetDocumentType: 'MAGISTRAL',
      patient: { id: 'tutor-1', name: 'Carlos Oliveira' },
      pet: { id: 'pet-1', name: 'Thor', species: 'DOG', breed: 'Golden Retriever', weightGrams: 15500 },
    },
  },
  history: [],
};

const VET_ORDER_DETAIL = {
  ...VET_ORDER,
  quote: {
    ...VET_ORDER.quote,
    prescription: {
      ...VET_ORDER.quote.prescription,
      prescriberName: 'Dra. Camila',
      prescriberCrmv: '54321',
      prescriberUf: 'SP',
      patient: { id: 'tutor-1', name: 'Carlos Oliveira', phone: '11987654321', address: 'Rua das Flores, 123' },
    },
  },
};

describe('OrderManagement — pedido veterinário', () => {
  beforeEach(() => {
    store = [{ ...VET_ORDER }];
    api.get.mockImplementation((url) => {
      if (url === '/orders/my') return Promise.resolve({ data: store.map((o) => ({ ...o })) });
      if (url === `/orders/${VET_ORDER.id}`) return Promise.resolve({ data: VET_ORDER_DETAIL });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
  });

  it('exibe o selo Veterinário, o animal e a formulação, sem o contato do tutor na listagem', async () => {
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders' });
    expect(await screen.findByRole('heading', { name: 'Thor' })).toBeInTheDocument();
    expect(screen.getByText('Veterinário')).toBeInTheDocument();
    expect(screen.getByText('Cão')).toBeInTheDocument();
    expect(screen.getByText(/Golden Retriever/)).toBeInTheDocument();
    expect(screen.getByText('15,5 kg')).toBeInTheDocument();
    expect(screen.getByText('Biscoito medicamentoso · Carne')).toBeInTheDocument();
    expect(screen.getByText(/tutor: Carlos/)).toBeInTheDocument();
    // Minimização (ADR 008): nada de telefone ou endereço na listagem
    expect(screen.queryByText(/Rua das Flores/)).toBeNull();
  });

  it('o detalhe do pedido traz prescritor e o contato do tutor para a entrega', async () => {
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders' });
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalhes do pedido/ }));
    const sheet = await screen.findByRole('dialog');
    expect(await within(sheet).findByText('Rua das Flores, 123')).toBeInTheDocument();
    expect(within(sheet).getByText('Tutor')).toBeInTheDocument();
    expect(within(sheet).getByText('Dra. Camila · CRMV-SP 54321')).toBeInTheDocument();
    expect(within(sheet).getByText(/98765-4321/)).toBeInTheDocument();
  });

  it('avança o status do pedido veterinário pela máquina de estados', async () => {
    renderRoute(<OrderManagement />, { url: '/pharmacy/orders' });
    fireEvent.click(await screen.findByRole('button', { name: /Despachar para entrega/ }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/orders/ord-vet-12345678/status', { status: 'DELIVERY' }));
  });
});
