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
}));

const apiError = (status, error) => ({ response: { status, data: { error } } });

describe('Login (Testing Library)', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      login: mockLogin,
      currentUser: null,
    });
  });

  const renderComponent = (entry = '/login') =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Login />
      </MemoryRouter>
    );

  const fillAndSubmit = (email, password) => {
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  };

  it('deve renderizar os campos de e-mail, senha, o botão de entrar e os links de apoio', () => {
    const { container } = renderComponent();

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password');
    // O E2E usa estes seletores: um único submit, um e-mail e uma senha
    expect(container.querySelectorAll('button[type="submit"]')).toHaveLength(1);
    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /esqueci minha senha/i })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: /criar conta de paciente/i })).toHaveAttribute('href', '/register');
  });

  it('deve alternar entre os perfis Paciente e Farmácia (abas Radix)', () => {
    renderComponent();

    const patientTab = screen.getByRole('tab', { name: /paciente/i });
    const pharmacyTab = screen.getByRole('tab', { name: /farmácia/i });
    expect(patientTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.mouseDown(pharmacyTab);
    expect(pharmacyTab).toHaveAttribute('aria-selected', 'true');
    expect(patientTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('link', { name: /credenciar minha farmácia/i })).toHaveAttribute(
      'href',
      '/register?type=pharmacy'
    );

    fireEvent.mouseDown(patientTab);
    expect(patientTab).toHaveAttribute('aria-selected', 'true');
  });

  it('deve pré-selecionar Farmácia com ?type=pharmacy e enviar o perfil no login', async () => {
    mockLogin.mockResolvedValueOnce({ user: { id: 'f1', role: 'PHARMACY' } });
    renderComponent('/login?type=pharmacy');

    expect(screen.getByRole('tab', { name: /farmácia/i })).toHaveAttribute('aria-selected', 'true');
    fillAndSubmit('farmacia@medconnect.com', 'SenhaForte#123');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('farmacia@medconnect.com', 'SenhaForte#123', 'pharmacy');
      expect(mockNavigate).toHaveBeenCalledWith('/pharmacy', { replace: true });
    });
  });

  it('deve submeter o formulário com sucesso e redirecionar para o painel do paciente', async () => {
    mockLogin.mockResolvedValueOnce({ user: { id: 'u1', role: 'PATIENT' } });
    renderComponent();

    fillAndSubmit('paciente@medconnect.com', 'SenhaForte#123');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('paciente@medconnect.com', 'SenhaForte#123', 'patient');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('deve voltar para a página protegida de origem (location.state.from)', async () => {
    mockLogin.mockResolvedValueOnce({ user: { id: 'u1', role: 'PATIENT' } });
    renderComponent({ pathname: '/login', state: { from: '/order/123?tab=status' } });

    fillAndSubmit('paciente@medconnect.com', 'SenhaForte#123');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/order/123?tab=status', { replace: true });
    });
  });

  it('deve validar e-mail inválido e senha vazia sem chamar a API', () => {
    renderComponent();

    fillAndSubmit('email-errado', '');

    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
    const email = screen.getByLabelText('E-mail');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email.getAttribute('aria-describedby')).toContain('login-email-error');
    expect(email).toHaveFocus();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('deve exibir "E-mail ou senha incorretos" quando a API responde 401', async () => {
    mockLogin.mockRejectedValueOnce(apiError(401, { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' }));
    renderComponent();

    fillAndSubmit('errado@medconnect.com', 'SenhaErrada#1');

    expect(await screen.findByRole('alert')).toHaveTextContent(/e-mail ou senha incorretos/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('deve explicar a suspensão (403 ACCOUNT_SUSPENDED) com link para o suporte', async () => {
    mockLogin.mockRejectedValueOnce(
      apiError(403, { code: 'ACCOUNT_SUSPENDED', message: 'Esta conta está suspensa.' })
    );
    renderComponent();

    fillAndSubmit('suspenso@medconnect.com', 'SenhaForte#123');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/conta suspensa/i);
    expect(screen.getByRole('link', { name: /falar com o suporte/i })).toHaveAttribute(
      'href',
      '/help?category=GENERAL#contato'
    );
  });

  it('deve avisar sobre muitas tentativas (429)', async () => {
    mockLogin.mockRejectedValueOnce(apiError(429, 'Muitas tentativas de autenticação. Tente novamente mais tarde.'));
    renderComponent();

    fillAndSubmit('paciente@medconnect.com', 'SenhaForte#123');

    expect(await screen.findByRole('alert')).toHaveTextContent(/muitas tentativas/i);
  });

  it('deve mostrar e ocultar a senha', () => {
    renderComponent();

    const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(toggle).toHaveAttribute('type', 'button');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });
});
