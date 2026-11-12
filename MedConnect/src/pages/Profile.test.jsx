/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import Profile from './Profile';
import { api } from '../services/api';
import { renderPage, routeGet } from './user/test-utils';

const mockUpdateCurrentUser = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'u1', name: 'Ana Souza', email: 'ana@exemplo.com', role: 'PATIENT' },
    updateCurrentUser: mockUpdateCurrentUser,
  }),
}));

jest.mock('../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), defaults: { baseURL: 'http://localhost:3000/api' } },
  getSocket: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn(), emit: jest.fn() })),
}));

const ME = {
  id: 'u1',
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  role: 'PATIENT',
  phone: '11987654321',
  address: 'Rua das Flores, 10 — São Paulo, SP',
  cpf: '***.***.***-35',
  status: 'ACTIVE',
  emailVerified: true,
  createdAt: '2026-01-10T10:00:00.000Z',
  lastLoginAt: '2026-11-12T08:00:00.000Z',
  counts: { prescriptions: 3, orders: 2, reviews: 1 },
};

describe('Profile — Meus dados do paciente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routeGet(api, { '/users/me': ME });
  });

  it('mostra CPF mascarado, e-mail somente leitura com verificação e contadores', async () => {
    renderPage(<Profile />);
    expect(await screen.findByLabelText('Nome completo')).toHaveValue('Ana Souza');
    expect(screen.getByLabelText('CPF')).toHaveValue('***.***.***-35');
    expect(screen.getByLabelText('CPF')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('readonly');
    expect(screen.getByText('Verificado')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone ou WhatsApp')).toHaveValue('(11) 98765-4321');
    expect(screen.getByRole('list', { name: 'Sua atividade' })).toHaveTextContent('3Receitas');
  });

  it('salva com PATCH /users/me { name, phone, address } e atualiza o nome da sessão', async () => {
    api.patch.mockResolvedValueOnce({ data: { ...ME, name: 'Ana Paula Souza', phone: '(21) 3456-7890' } });
    renderPage(<Profile />);
    const save = await screen.findByRole('button', { name: /Salvar alterações/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: '  Ana Paula Souza ' } });
    fireEvent.change(screen.getByLabelText('Telefone ou WhatsApp'), { target: { value: '2134567890' } });
    expect(screen.getByLabelText('Telefone ou WhatsApp')).toHaveValue('(21) 3456-7890');
    fireEvent.click(save);

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/users/me', {
        name: 'Ana Paula Souza',
        phone: '(21) 3456-7890',
        address: 'Rua das Flores, 10 — São Paulo, SP',
      })
    );
    await waitFor(() => expect(mockUpdateCurrentUser).toHaveBeenCalledWith({ name: 'Ana Paula Souza' }));
  });

  it('valida o nome antes de enviar', async () => {
    renderPage(<Profile />);
    fireEvent.change(await screen.findByLabelText('Nome completo'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));
    expect(await screen.findByText(/Informe seu nome completo/)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('mostra erro com nova tentativa quando GET /users/me falha', async () => {
    routeGet(api, { '/users/me': new Error('Network Error') });
    renderPage(<Profile />);
    expect(await screen.findByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });
});
