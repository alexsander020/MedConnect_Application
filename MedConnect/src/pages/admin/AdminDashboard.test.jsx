/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminDashboard from './AdminDashboard';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'admin1', name: 'Administrador Regulatório', role: 'ADMIN' },
    logout: jest.fn(),
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

describe('AdminDashboard Component (Testing Library)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir lista de farmácias pendentes ao navegar para a aba correspondente', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/admin/pharmacies')) {
        return Promise.resolve({
          data: [
            {
              id: 'pharm-1',
              name: 'Drogaria Esperança',
              email: 'contato@esperanca.com',
              cnpj: '11222333000181',
              phone: '(11) 98888-7777',
              address: 'Rua das Flores, 123',
              verificationStatus: 'PENDING_VERIFICATION',
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<AdminDashboard />);

    // Clica na aba de Farmácias Pendentes
    const tabBtn = await screen.findByRole('button', { name: /Farmácias Pendentes/i });
    fireEvent.click(tabBtn);

    await waitFor(() => {
      expect(screen.getByText('Drogaria Esperança')).toBeInTheDocument();
      expect(screen.getByText(/11222333000181/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /aprovar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /recusar/i })).toBeInTheDocument();
    });
  });

  it('deve aprovar credenciamento da farmácia ao clicar em Aprovar', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/admin/pharmacies')) {
        return Promise.resolve({
          data: [
            {
              id: 'pharm-1',
              name: 'Drogaria Esperança',
              cnpj: '11222333000181',
              verificationStatus: 'PENDING_VERIFICATION',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    api.patch.mockResolvedValueOnce({
      data: { id: 'pharm-1', verified: true, verificationStatus: 'VERIFIED' },
    });

    renderWithProviders(<AdminDashboard />);

    const tabBtn = await screen.findByRole('button', { name: /Farmácias Pendentes/i });
    fireEvent.click(tabBtn);

    await waitFor(() => {
      expect(screen.getByText('Drogaria Esperança')).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /aprovar/i });
    fireEvent.click(approveBtn);

    // Confirmação no modal
    await waitFor(() => {
      expect(screen.getByText(/aprovar farmácia\?/i)).toBeInTheDocument();
    });

    const confirmApproveBtn = screen.getByRole('button', { name: /confirmar aprovação/i });
    fireEvent.click(confirmApproveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/admin/pharmacies/pharm-1/verify',
        expect.objectContaining({ approved: true })
      );
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/aprovada/i));
    });
  });

  it('deve exibir mensagem de estado vazio quando não houver farmácias pendentes', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithProviders(<AdminDashboard />);

    const tabBtn = await screen.findByRole('button', { name: /Farmácias Pendentes/i });
    fireEvent.click(tabBtn);

    await waitFor(() => {
      expect(screen.getByText(/nenhuma farmácia pendente/i)).toBeInTheDocument();
    });
  });

  it('deve exibir estado de erro na tela quando a requisição de capacidades falhar', async () => {
    api.get.mockRejectedValue(new Error('Erro interno ao buscar solicitações'));

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar solicitações/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    });
  });
});
