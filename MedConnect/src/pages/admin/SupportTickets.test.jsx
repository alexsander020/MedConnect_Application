/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupportTickets from './SupportTickets';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'admin1', name: 'Admin', role: 'ADMIN' }, logout: jest.fn() }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };
jest.mock('../../context/ToastContext', () => ({
  useToast: () => mockToast,
}));

const LIST_ITEM = {
  id: 't1',
  protocol: 'MC-20261111-AB2CD',
  requesterType: 'PATIENT',
  name: 'Paciente Carla',
  email: 'carla@example.com',
  category: 'ORDER',
  subject: 'Pedido atrasado',
  preview: 'Meu pedido deveria ter chegado ontem…',
  status: 'OPEN',
  createdAt: '2026-11-11T10:00:00.000Z',
  updatedAt: '2026-11-11T10:00:00.000Z',
  resolvedAt: null,
};

const DETAIL = {
  ...LIST_ITEM,
  userId: 'u2',
  pharmacyId: null,
  message: 'Meu pedido deveria ter chegado ontem e ainda não recebi nenhuma atualização da farmácia.',
  resolution: null,
  handledById: null,
};

function mockApi() {
  api.get.mockImplementation((url) => {
    if (url === '/admin/support-tickets') return Promise.resolve({ data: { data: [LIST_ITEM], total: 1, page: 1, limit: 20, totalPages: 1 } });
    if (url === '/admin/support-tickets/t1') return Promise.resolve({ data: DETAIL });
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  });
}

const renderAt = (route) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <SupportTickets />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/** Abre o Select de status (Radix) pelo teclado e escolhe a opção */
async function chooseStatus(label) {
  const trigger = screen.getByRole('combobox', { name: /^status$/i });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: label }));
  // Espera o Select fechar (a animação de saída mantém o resto da tela aria-hidden)
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  expect(trigger).toHaveTextContent(label);
}

describe('Admin · Atendimento', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lista chamados com prévia, sem a mensagem completa', async () => {
    mockApi();
    renderAt('/admin/support?status=OPEN');

    expect(await screen.findByText('Pedido atrasado')).toBeInTheDocument();
    expect(screen.getByText(LIST_ITEM.preview)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/admin/support-tickets', { params: { status: 'OPEN', page: 1 } });
  });

  it('exige resposta para resolver e envia status + resolução ao backend', async () => {
    mockApi();
    api.patch.mockResolvedValueOnce({ data: { ...DETAIL, status: 'RESOLVED', resolution: 'Falamos com a farmácia: entrega hoje à tarde.', updatedAt: '2026-11-12T09:00:00.000Z', resolvedAt: '2026-11-12T09:00:00.000Z' } });
    renderAt('/admin/support?id=t1');

    // Mensagem completa (leitura auditada) e conta vinculada (userId)
    expect(await screen.findByText(DETAIL.message)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/admin/support-tickets/t1');
    expect(screen.getByRole('link', { name: /abrir conta do paciente/i })).toHaveAttribute('href', '/admin/users?id=u2');

    await chooseStatus('Resolvido');
    fireEvent.click(screen.getByRole('button', { name: /salvar atendimento/i }));

    expect(await screen.findByText(/para marcar como resolvido, escreva a resposta/i)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/resposta ao solicitante/i), {
      target: { value: 'Falamos com a farmácia: entrega hoje à tarde.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar atendimento/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/support-tickets/t1', {
        status: 'RESOLVED',
        resolution: 'Falamos com a farmácia: entrega hoje à tarde.',
      });
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/notificado/i), expect.stringMatching(/MC-20261111-AB2CD/));
    });
  });

  it('permite mudar para "Em atendimento" sem resposta', async () => {
    mockApi();
    api.patch.mockResolvedValueOnce({ data: { ...DETAIL, status: 'IN_PROGRESS', updatedAt: '2026-11-12T09:00:00.000Z' } });
    renderAt('/admin/support?id=t1');

    await screen.findByText(DETAIL.message);
    await chooseStatus('Em atendimento');
    fireEvent.click(screen.getByRole('button', { name: /salvar atendimento/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/support-tickets/t1', { status: 'IN_PROGRESS', resolution: null });
    });
  });
});
