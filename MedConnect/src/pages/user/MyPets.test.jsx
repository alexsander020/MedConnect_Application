/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyPets from './MyPets';
import { api } from '../../services/api';
import * as configHook from '../../hooks/usePublicConfig';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
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

const renderWithProviders = (ui, initialRoute = '/my-pets') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/my-pets" element={ui} />
          <Route path="/dashboard" element={<div>Dashboard Principal</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MyPets Component (Testing Library)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redireciona para o dashboard se vetEnabled estiver desligada', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: false,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    renderWithProviders(<MyPets />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Principal')).toBeInTheDocument();
      expect(screen.queryByText('Animais Cadastrados')).not.toBeInTheDocument();
    });
  });

  it('exibe estado de erro e botão tentar novamente quando busca de pets falha', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });
    api.get.mockRejectedValueOnce(new Error('Erro ao carregar pets'));

    renderWithProviders(<MyPets />);

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar a lista de pets/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tentar Novamente/i })).toBeInTheDocument();
    });
  });

  it('exibe lista de pets cadastrados com conversão de peso para kg', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });
    api.get.mockResolvedValueOnce({
      data: [
        {
          id: 'pet-1',
          name: 'Rex',
          species: 'DOG',
          breed: 'Golden Retriever',
          weightGrams: 28500,
          isFoodProducing: false,
        },
      ],
    });

    renderWithProviders(<MyPets />);

    await waitFor(() => {
      expect(screen.getByText('Rex')).toBeInTheDocument();
      expect(screen.getByText(/Cachorro \(Cão\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Golden Retriever/i)).toBeInTheDocument();
      expect(screen.getByText(/28.5 kg/i)).toBeInTheDocument();
    });
  });

  it('bloqueia animal destinado à produção se vetAllowFoodProducing for falsa', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });
    api.get.mockResolvedValueOnce({ data: [] });

    renderWithProviders(<MyPets />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cadastrar Pet/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cadastrar Pet/i }));

    await waitFor(() => {
      expect(screen.getByText('Novo Animal')).toBeInTheDocument();
    });

    // Preenche campos com placeholders reais
    fireEvent.change(screen.getByPlaceholderText(/Ex: Thor, Mel, Nina/i), {
      target: { value: 'Boiadeiro' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: 8.5/i), {
      target: { value: '450' },
    });

    // Marca animal de produção
    const foodCheckbox = screen.getByLabelText(/Este animal é destinado à produção ou alimentação humana\?/i);
    fireEvent.click(foodCheckbox);

    // Deve exibir aviso amigável e desabilitar botão Salvar Pet
    await waitFor(() => {
      expect(screen.getByText(/Aviso regulatório:/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Salvar Pet/i });
    expect(submitBtn).toBeDisabled();
  });

  it('permite cadastrar pet com sucesso convertendo kg para gramas', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });
    api.get.mockResolvedValueOnce({ data: [] });
    api.post.mockResolvedValueOnce({
      data: {
        id: 'pet-new',
        name: 'Pipoca',
        species: 'CAT',
        breed: 'Siamês',
        weightGrams: 4200,
        isFoodProducing: false,
      },
    });

    renderWithProviders(<MyPets />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cadastrar Pet/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cadastrar Pet/i }));

    await waitFor(() => {
      expect(screen.getByText('Novo Animal')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Ex: Thor, Mel, Nina/i), {
      target: { value: 'Pipoca' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: 8.5/i), {
      target: { value: '4.2' },
    });

    const submitBtn = screen.getByRole('button', { name: /Salvar Pet/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/animals',
        expect.objectContaining({
          name: 'Pipoca',
          weightGrams: 4200,
        })
      );
    });
  });
});
