/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';
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

describe('Register Component (Testing Library)', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      register: mockRegister,
      currentUser: null,
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

  it('deve renderizar o passo 1 com campos de nome, email e senha', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('Ex: Carlos Alberto Silva')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar para o passo 2/i })).toBeInTheDocument();
  });

  it('deve validar email inválido e senha fraca no passo 1', () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Alberto Silva'), {
      target: { value: 'Paciente Teste' }
    });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'email-errado' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'fraca' }
    });

    const nextBtn = screen.getByRole('button', { name: /continuar para o passo 2/i });
    fireEvent.submit(nextBtn.closest('form'));

    expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument();
  });

  it('deve avançar para o passo 2 com dados válidos e validar CPF no passo 2', async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Alberto Silva'), {
      target: { value: 'Paciente Teste' }
    });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'paciente@medconnect.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'SenhaForte#123' }
    });

    const nextBtn = screen.getByRole('button', { name: /continuar para o passo 2/i });
    fireEvent.submit(nextBtn.closest('form'));

    // Passo 2
    await waitFor(() => {
      expect(screen.getByText(/dados de entrega/i)).toBeInTheDocument();
    });

    // Submete com CPF inválido
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '111.111.111-11' }
    });

    const finishBtn = screen.getByRole('button', { name: /finalizar cadastro/i });
    fireEvent.submit(finishBtn.closest('form'));

    expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro da API quando o cadastro for rejeitado', async () => {
    mockRegister.mockRejectedValueOnce(new Error('E-mail já cadastrado na plataforma.'));

    renderComponent();

    // Passo 1
    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Alberto Silva'), {
      target: { value: 'Paciente Teste' }
    });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'duplicado@medconnect.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'SenhaForte#123' }
    });
    const nextBtn = screen.getByRole('button', { name: /continuar para o passo 2/i });
    fireEvent.submit(nextBtn.closest('form'));

    // Passo 2
    await waitFor(() => {
      expect(screen.getByPlaceholderText('000.000.000-00')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('(11) 98765-4321'), {
      target: { value: '(11) 98888-7777' }
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '111.444.777-35' }
    });
    fireEvent.change(screen.getByPlaceholderText('Av. Paulista, 1000 - Bela Vista, São Paulo - SP'), {
      target: { value: 'Rua das Flores, 123' }
    });

    const finishBtn = screen.getByRole('button', { name: /finalizar cadastro/i });
    fireEvent.submit(finishBtn.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/e-mail já cadastrado na plataforma/i)).toBeInTheDocument();
    });
  });
});
