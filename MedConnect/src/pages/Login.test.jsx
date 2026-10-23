/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import * as AuthContext from '../context/AuthContext';

jest.mock('../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  getSocket: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), emit: jest.fn(), on: jest.fn(), off: jest.fn() })),
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { type: 'user' } }),
}));

describe('Login Component (Testing Library)', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      login: mockLogin,
      currentUser: null,
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

  it('deve renderizar os campos de email, senha e botão de login', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar na plataforma/i })).toBeInTheDocument();
  });

  it('deve alternar entre os perfis Paciente e Farmácia', () => {
    renderComponent();

    const pharmacyTab = screen.getByText('Farmácia');
    fireEvent.click(pharmacyTab);

    expect(screen.getByText('Farmácia')).toHaveClass('active');

    const patientTab = screen.getByText('Paciente');
    fireEvent.click(patientTab);

    expect(screen.getByText('Paciente')).toHaveClass('active');
  });

  it('deve submeter o formulário com sucesso e redirecionar para o dashboard', async () => {
    mockLogin.mockResolvedValueOnce({
      user: { id: 'u1', role: 'PATIENT' }
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'paciente@medconnect.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'SenhaForte#123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /entrar na plataforma/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('paciente@medconnect.com', 'SenhaForte#123', 'user');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('deve exibir mensagem de erro na tela quando o login falhar', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' } }
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'errado@medconnect.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'SenhaErrada#1' }
    });

    fireEvent.click(screen.getByRole('button', { name: /entrar na plataforma/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
    });
  });
});
