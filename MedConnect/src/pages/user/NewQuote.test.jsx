/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewQuote from './NewQuote';
import { api } from '../../services/api';
import * as configHook from '../../hooks/usePublicConfig';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'patient-1', name: 'Tutor Teste', role: 'PATIENT' },
    userType: 'patient',
  }),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};
jest.mock('../../context/ToastContext', () => ({
  useToast: () => mockToast,
}));

const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('NewQuote Component (Testing Library)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('quando vetEnabled=false, esconde o seletor Humano/Pet e preserva fluxo humano padrão', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: false,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    renderWithProviders(<NewQuote />);

    expect(screen.queryByRole('button', { name: /Para meu pet/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Para mim/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Selecione o Pet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Anexar Receita Médica/i)).toBeInTheDocument();
  });

  it('quando vetEnabled=true, exibe seletor claro Humano e Pet', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    renderWithProviders(<NewQuote />);

    expect(screen.getByRole('button', { name: /Para mim/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Para meu pet/i })).toBeInTheDocument();
  });

  it('ao mudar para Para meu pet, exibe seleção de animais, dados do prescritor e aviso regulatório', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });
    api.get.mockImplementation((url) => {
      if (url.includes('/animals')) {
        return Promise.resolve({
          data: [
            { id: 'pet-1', name: 'Thor', species: 'DOG', weightGrams: 15000 },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<NewQuote />);

    const petSelectorBtn = screen.getByRole('button', { name: /Para meu pet/i });
    fireEvent.click(petSelectorBtn);

    await waitFor(() => {
      expect(screen.getByText(/Selecione o Pet/i)).toBeInTheDocument();
      expect(screen.getByText(/Thor \(DOG • 15.0 kg\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Dados do Médico Veterinário Prescritor/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ex: Dra. Mariana Costa/i)).toBeInTheDocument();
      expect(screen.getByText(/A farmácia credenciada confere a receita e a plataforma não substitui a orientação do médico veterinário/i)).toBeInTheDocument();
    });
  });

  it('bloqueia envio e exibe erro claro quando CRMV informado for inválido', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });
    api.get.mockImplementation((url) => {
      if (url.includes('/animals')) {
        return Promise.resolve({
          data: [
            { id: 'pet-1', name: 'Thor', species: 'DOG', weightGrams: 15000 },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<NewQuote />);

    // Ativa modo veterinário
    fireEvent.click(screen.getByRole('button', { name: /Para meu pet/i }));

    await waitFor(() => {
      expect(screen.getByText(/Thor \(DOG • 15.0 kg\)/i)).toBeInTheDocument();
    });

    // Seleciona pet
    fireEvent.change(screen.getByDisplayValue('Selecione o animal paciente...'), {
      target: { value: 'pet-1' },
    });

    // Informa veterinário com CRMV inválido (ex: letras ou vazio)
    fireEvent.change(screen.getByPlaceholderText(/Ex: Dra. Mariana Costa/i), {
      target: { value: 'Dr. Roberto Santos' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: 12345/i), {
      target: { value: 'CRMV-INVALIDO' },
    });

    // Simula upload de arquivo no JSDOM
    const file = new File(['receita-teste'], 'receita.pdf', { type: 'application/pdf' });
    const fileInput = document.getElementById('file-upload');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Note: healthConsent já inicia como true

    // Clica em enviar / submete o formulário
    const submitBtn = screen.getByRole('button', { name: /Solicitar Orçamento Agora/i });
    const form = submitBtn.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Informe um CRMV válido para a UF selecionada/i)).toBeInTheDocument();
    });
  });

  it('permite notificação de receita veterinária controlada quando vetControlledEnabled for true', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: true,
      isLoading: false,
    });
    api.get.mockImplementation((url) => {
      if (url.includes('/animals')) {
        return Promise.resolve({
          data: [
            { id: 'pet-1', name: 'Thor', species: 'DOG', weightGrams: 15000 },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<NewQuote />);

    fireEvent.click(screen.getByRole('button', { name: /Para meu pet/i }));

    await waitFor(() => {
      expect(screen.getByText(/Notificação de Receita Veterinária \(Controle Especial\)/i)).toBeInTheDocument();
    });
  });
});
