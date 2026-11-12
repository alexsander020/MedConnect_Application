/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import VerifyEmail from './VerifyEmail';
import * as AuthContext from '../../context/AuthContext';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
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

const renderAt = (ui, entry) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

const apiError = (status, error) => ({ response: { status, data: { error } } });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AuthContext, 'useAuth').mockReturnValue({ currentUser: null, isAuthenticated: false, userType: null });
});

describe('ForgotPassword', () => {
  const submit = (email) => {
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: /enviar instruções/i }));
  };

  it('valida o e-mail antes de chamar a API', () => {
    renderAt(<ForgotPassword />, '/forgot-password');
    submit('sem-arroba');
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('mostra a confirmação neutra quando a API responde com sucesso', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'ok' } });
    renderAt(<ForgotPassword />, '/forgot-password');
    submit('paciente@medconnect.com');

    expect(await screen.findByRole('heading', { name: /confira seu e-mail/i })).toBeInTheDocument();
    expect(screen.getByText(/se houver uma conta medconnect com o e-mail/i)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'paciente@medconnect.com' });
  });

  it('mostra a MESMA confirmação quando o servidor falha (não revela se a conta existe)', async () => {
    api.post.mockRejectedValueOnce(apiError(500, { code: 'INTERNAL_ERROR', message: 'Erro' }));
    renderAt(<ForgotPassword />, '/forgot-password');
    submit('ninguem@medconnect.com');

    expect(await screen.findByRole('heading', { name: /confira seu e-mail/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa quando há muitas tentativas (429) sem confirmar o envio', async () => {
    api.post.mockRejectedValueOnce(apiError(429, 'Muitas tentativas de autenticação.'));
    renderAt(<ForgotPassword />, '/forgot-password');
    submit('paciente@medconnect.com');

    expect(await screen.findByRole('alert')).toHaveTextContent(/muitas tentativas/i);
    expect(screen.queryByRole('heading', { name: /confira seu e-mail/i })).not.toBeInTheDocument();
  });
});

describe('ResetPassword', () => {
  const fill = (password, confirm) => {
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirm } });
    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));
  };

  it('bloqueia o envio quando as senhas não coincidem', () => {
    renderAt(<ResetPassword />, '/reset-password?token=abc123');
    fill('SenhaForte#123', 'SenhaForte#124');

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveFocus();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('bloqueia senha fraca', () => {
    renderAt(<ResetPassword />, '/reset-password?token=abc123');
    fill('fraca', 'fraca');

    expect(screen.getByText(/precisa atender a todos os requisitos/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('redefine a senha com o token da URL e volta para o login', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'ok' } });
    renderAt(<ResetPassword />, '/reset-password?token=abc123');
    fill('SenhaForte#123', 'SenhaForte#123');

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', { token: 'abc123', newPassword: 'SenhaForte#123' });
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('mostra o estado de link expirado quando o token é inválido', async () => {
    api.post.mockRejectedValueOnce(apiError(400, { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Token inválido' }));
    renderAt(<ResetPassword />, '/reset-password?token=velho');
    fill('SenhaForte#123', 'SenhaForte#123');

    expect(await screen.findByRole('heading', { name: /este link expirou ou já foi usado/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /solicitar um novo link/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('orienta quando o link chega sem token e aceita colar o código', () => {
    renderAt(<ResetPassword />, '/reset-password');

    expect(screen.getByRole('heading', { name: /link de redefinição incompleto/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Código de recuperação'), { target: { value: 'codigo-do-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
  });
});

describe('VerifyEmail', () => {
  it('confirma o e-mail ao abrir a página com token', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'ok' } });
    renderAt(<VerifyEmail />, '/verify-email?token=tok1');

    expect(screen.getByText(/confirmando seu e-mail/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /e-mail confirmado/i })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'tok1' });
    expect(screen.getByRole('link', { name: /entrar na conta/i })).toHaveAttribute('href', '/login');
  });

  it('explica quando o link de confirmação expirou', async () => {
    api.post.mockRejectedValueOnce(apiError(400, { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Token inválido' }));
    renderAt(<VerifyEmail />, '/verify-email?token=velho');

    expect(await screen.findByRole('heading', { name: /este link expirou ou já foi usado/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /falar com o suporte/i })).toHaveAttribute(
      'href',
      '/help?category=GENERAL#contato'
    );
  });

  it('não chama a API quando o link vem sem token', () => {
    renderAt(<VerifyEmail />, '/verify-email');
    expect(screen.getByRole('heading', { name: /link de confirmação incompleto/i })).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
