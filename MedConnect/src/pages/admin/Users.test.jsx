/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Users from './Users';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'admin1', name: 'Administradora Ana', email: 'ana@medconnect.com.br', role: 'ADMIN' },
    logout: jest.fn(),
  }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };
jest.mock('../../context/ToastContext', () => ({
  useToast: () => mockToast,
}));

const user = (over = {}) => ({
  id: 'u2',
  name: 'Paciente Carla',
  email: 'carla@example.com',
  role: 'PATIENT',
  status: 'ACTIVE',
  emailVerified: true,
  isAnonymized: false,
  cpf: '***.***.***-21',
  createdAt: '2026-10-01T12:00:00.000Z',
  lastLoginAt: '2026-11-10T12:00:00.000Z',
  suspendedAt: null,
  counts: { prescriptions: 3, reviews: 1 },
  ...over,
});

const detail = (over = {}) => ({
  ...user(over),
  phone: '11988887777',
  address: 'Rua A, 10',
  suspensionReason: null,
  consents: [{ consentType: 'HEALTH_DATA_PROCESSING', textVersion: 'v1.0.0', consentedAt: '2026-10-01T12:00:00.000Z', revokedAt: null }],
  ...over,
});

/** Roteia os GETs pela URL: listagem e detalhe */
function mockApi(detailData) {
  api.get.mockImplementation((url) => {
    if (url === '/admin/users') return Promise.resolve({ data: { data: [user(detailData)], total: 1, page: 1, limit: 20, totalPages: 1 } });
    if (url.startsWith('/admin/users/')) return Promise.resolve({ data: detail(detailData) });
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  });
}

const renderAt = (route) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Users />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Admin · Usuários', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lista usuários com CPF mascarado e filtros vindos da URL', async () => {
    mockApi({});
    renderAt('/admin/users?role=PATIENT&status=ACTIVE');

    expect(await screen.findByText('Paciente Carla')).toBeInTheDocument();
    expect(screen.getByText('***.***.***-21')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/admin/users', { params: { role: 'PATIENT', status: 'ACTIVE', page: 1 } });
  });

  it('exige motivo para suspender e chama PATCH /admin/users/:id/status', async () => {
    mockApi({});
    api.patch.mockResolvedValueOnce({ data: user({ status: 'SUSPENDED' }) });
    renderAt('/admin/users?id=u2');

    // Detalhe aberto pela URL: leitura auditada
    expect(await screen.findByText(/registrado na trilha de auditoria/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/admin/users/u2');

    fireEvent.click(screen.getByRole('button', { name: /suspender conta/i }));
    const confirm = await screen.findByRole('button', { name: /confirmar suspensão/i });
    expect(confirm).toBeDisabled();

    const reason = screen.getByLabelText(/motivo da suspensão/i);
    fireEvent.change(reason, { target: { value: 'abc' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(reason, { target: { value: 'Uso indevido da plataforma' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/users/u2/status', { status: 'SUSPENDED', reason: 'Uso indevido da plataforma' });
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/suspensa/i), 'Usuário suspenso');
    });
  });

  it('bloqueia a suspensão da própria conta e explica o motivo', async () => {
    mockApi({ id: 'admin1', name: 'Administradora Ana', role: 'ADMIN' });
    renderAt('/admin/users?id=admin1');

    const button = await screen.findByRole('button', { name: /suspender conta/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/não pode suspender a si mesmo/i)).toBeInTheDocument();
  });

  it('bloqueia a suspensão de outro administrador, mas permite reativá-lo', async () => {
    mockApi({ id: 'admin2', name: 'Outro Admin', role: 'ADMIN' });
    const { unmount } = renderAt('/admin/users?id=admin2');
    expect(await screen.findByRole('button', { name: /suspender conta/i })).toBeDisabled();
    expect(screen.getByText(/contas de administrador não podem ser suspensas/i)).toBeInTheDocument();
    unmount();

    mockApi({ id: 'admin2', name: 'Outro Admin', role: 'ADMIN', status: 'SUSPENDED', suspendedAt: '2026-11-01T10:00:00.000Z' });
    api.patch.mockResolvedValueOnce({ data: user({ id: 'admin2', role: 'ADMIN', status: 'ACTIVE' }) });
    renderAt('/admin/users?id=admin2');
    const reactivate = await screen.findByRole('button', { name: /reativar conta/i });
    expect(reactivate).toBeEnabled();
    fireEvent.click(reactivate);
    fireEvent.click(await screen.findByRole('button', { name: /confirmar reativação/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/users/admin2/status', { status: 'ACTIVE', reason: undefined }));
  });

  it('mostra mensagem clara quando o backend recusa com CANNOT_SUSPEND_ADMIN', async () => {
    mockApi({});
    api.patch.mockRejectedValueOnce({ response: { status: 403, data: { error: { code: 'CANNOT_SUSPEND_ADMIN', message: 'Não é permitido suspender outro administrador.' } } } });
    renderAt('/admin/users?id=u2');

    fireEvent.click(await screen.findByRole('button', { name: /suspender conta/i }));
    fireEvent.change(await screen.findByLabelText(/motivo da suspensão/i), { target: { value: 'Motivo qualquer' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar suspensão/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Contas de administrador não podem ser suspensas por outro administrador.');
    });
    // O diálogo continua aberto para o admin corrigir ou cancelar
    expect(screen.getByRole('button', { name: /confirmar suspensão/i })).toBeInTheDocument();
  });
});
