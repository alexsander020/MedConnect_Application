/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Pharmacies from './Pharmacies';
import { api } from '../../services/api';

// Migrado de AdminDashboard.test.jsx: a fila de credenciamento agora vive em /admin/pharmacies

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
  warning: jest.fn(),
};
jest.mock('../../context/ToastContext', () => ({
  useToast: () => mockToast,
}));

const renderWithProviders = (ui, route = '/admin/pharmacies') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

const PENDING = {
  id: 'pharm-1',
  name: 'Drogaria Esperança',
  email: 'contato@esperanca.com',
  cnpj: '11222333000181',
  phone: '(11) 98888-7777',
  address: 'Rua das Flores, 123',
  verificationStatus: 'PENDING_VERIFICATION',
  sanitaryLicense: 'LS-2026-0042',
  operatingAuth: 'AFE-7.12345-6',
  technicalResponsibleName: 'Dra. Helena Prado',
  technicalResponsibleCrf: '12345',
  technicalResponsibleUf: 'SP',
  documentUrl: 'https://example.com/licenca.pdf',
  cnpjData: JSON.stringify({ razaoSocial: 'Drogaria Esperança Ltda', situacaoCadastral: 'ATIVA', municipio: 'São Paulo', uf: 'SP' }),
  createdAt: new Date().toISOString(),
};

describe('Admin · Farmácias — fila de credenciamento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir lista de farmácias pendentes quando API responder com sucesso', async () => {
    api.get.mockResolvedValueOnce({ data: [PENDING] });

    renderWithProviders(<Pharmacies />);

    await waitFor(() => {
      expect(screen.getByText('Drogaria Esperança')).toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledWith('/admin/pharmacies/pending');
    // CNPJ formatado, dados sanitários, responsável técnico e consulta da Receita
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(screen.getByText('LS-2026-0042')).toBeInTheDocument();
    expect(screen.getByText('AFE-7.12345-6')).toBeInTheDocument();
    expect(screen.getByText('Dra. Helena Prado')).toBeInTheDocument();
    expect(screen.getByText('12345/SP')).toBeInTheDocument();
    expect(screen.getByText('Drogaria Esperança Ltda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver documento comprobatório/i })).toHaveAttribute('href', PENDING.documentUrl);
    expect(screen.getByRole('button', { name: /aprovar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recusar/i })).toBeInTheDocument();
  });

  it('deve aprovar credenciamento da farmácia ao clicar em Aprovar', async () => {
    api.get.mockResolvedValue({ data: [PENDING] });
    api.patch.mockResolvedValueOnce({
      data: { id: 'pharm-1', verified: true, verificationStatus: 'VERIFIED' },
    });

    renderWithProviders(<Pharmacies />);

    await waitFor(() => {
      expect(screen.getByText('Drogaria Esperança')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));

    // Confirmação no AlertDialog
    await waitFor(() => {
      expect(screen.getByText(/aprovar farmácia\?/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /confirmar aprovação/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/admin/pharmacies/pharm-1/verify',
        expect.objectContaining({ approved: true })
      );
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/aprovada/i), expect.anything());
    });
  });

  it('deve exigir motivo para recusar e enviá-lo ao backend', async () => {
    api.get.mockResolvedValue({ data: [PENDING] });
    api.patch.mockResolvedValueOnce({ data: { id: 'pharm-1', verified: false, verificationStatus: 'REJECTED' } });

    renderWithProviders(<Pharmacies />);
    await waitFor(() => expect(screen.getByText('Drogaria Esperança')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /recusar/i }));
    const confirm = await screen.findByRole('button', { name: /confirmar recusa/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/motivo da recusa/i), { target: { value: 'Alvará vencido em 2025' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/pharmacies/pharm-1/verify', {
        approved: false,
        rejectionReason: 'Alvará vencido em 2025',
      });
    });
  });

  it('deve exibir mensagem de estado vazio quando não houver farmácias pendentes', async () => {
    api.get.mockResolvedValueOnce({ data: [] });

    renderWithProviders(<Pharmacies />);

    await waitFor(() => {
      expect(screen.getByText(/nenhuma farmácia pendente/i)).toBeInTheDocument();
    });
  });

  it('deve exibir estado de erro na tela quando a requisição falhar', async () => {
    api.get.mockRejectedValueOnce(new Error('Erro interno ao buscar farmácias'));

    renderWithProviders(<Pharmacies />);

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar solicitações/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    });
  });
});
