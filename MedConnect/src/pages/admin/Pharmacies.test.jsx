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
  operatingAuth: 'AFE-7.12345-6', // gitleaks:allow (número fictício de fixture)
  technicalResponsibleName: 'Dra. Helena Prado',
  technicalResponsibleCrf: '12345',
  technicalResponsibleUf: 'SP',
  documentUrl: 'https://example.com/licenca.pdf',
  cnpjData: JSON.stringify({ razaoSocial: 'Drogaria Esperança Ltda', situacaoCadastral: 'ATIVA', municipio: 'São Paulo', uf: 'SP' }),
  createdAt: new Date().toISOString(),
};

/**
 * GET por URL: a página consulta em paralelo a fila de credenciamento, as feature flags (/config)
 * e as habilitações. Rotas ausentes respondem lista vazia; um Error vira rejeição.
 */
function mockGetRoutes(routes) {
  api.get.mockImplementation((url) => {
    const value = Object.prototype.hasOwnProperty.call(routes, url) ? routes[url] : url === '/config' ? { vetEnabled: false } : [];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve({ data: value });
  });
}

describe('Admin · Farmácias — fila de credenciamento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir lista de farmácias pendentes quando API responder com sucesso', async () => {
    mockGetRoutes({ '/admin/pharmacies/pending': [PENDING] });

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
    mockGetRoutes({ '/admin/pharmacies/pending': [PENDING] });
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
    mockGetRoutes({ '/admin/pharmacies/pending': [PENDING] });
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
    mockGetRoutes({ '/admin/pharmacies/pending': [] });

    renderWithProviders(<Pharmacies />);

    await waitFor(() => {
      expect(screen.getByText(/nenhuma farmácia pendente/i)).toBeInTheDocument();
    });
  });

  it('deve exibir estado de erro na tela quando a requisição falhar', async () => {
    mockGetRoutes({ '/admin/pharmacies/pending': new Error('Erro interno ao buscar farmácias') });

    renderWithProviders(<Pharmacies />);

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar solicitações/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    });
  });
});

// ─── Habilitações regulatórias (vertical veterinária) ───────────────────────
// Migrado de AdminDashboard.test.jsx (origin/main): a análise de capacidades agora é a aba "Habilitações".

const VET_CAPABILITY = {
  id: 'cap-1',
  pharmacyId: 'pharm-vet',
  type: 'VETERINARY_COMPOUNDING',
  status: 'PENDING_VERIFICATION',
  mapaRegistrationNumber: 'SP-12345-6',
  crmvCompanyRegistration: '9876',
  crmvCompanyUf: 'SP',
  technicalResponsibleName: 'Dra. Beatriz Santos',
  technicalResponsibleCrf: '65432',
  technicalResponsibleCrfUf: 'SP',
  evidenceFileKeys: ['supabase://a.pdf', 'supabase://b.pdf'],
  evidenceCount: 2,
  createdAt: new Date().toISOString(),
  pharmacy: {
    id: 'pharm-vet',
    name: 'VetMed Manipulação',
    email: 'contato@vetmed.com.br',
    cnpj: '11222333000181',
    cnpjData: JSON.stringify({ razaoSocial: 'VetMed Manipulação Ltda', situacaoCadastral: 'ATIVA', municipio: 'São Paulo', uf: 'SP' }),
  },
};

describe('Admin · Farmácias — habilitações regulatórias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const CAPS_ROUTE = '/admin/pharmacies?tab=capabilities';

  it('mostra a aba Habilitações com a solicitação veterinária pendente e os dados regulatórios', async () => {
    mockGetRoutes({ '/config': { vetEnabled: true }, '/admin/capabilities': [VET_CAPABILITY] });

    renderWithProviders(<Pharmacies />, CAPS_ROUTE);

    expect(await screen.findByText('VetMed Manipulação')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /habilitações/i })).toBeInTheDocument();
    expect(screen.getByText('SP-12345-6')).toBeInTheDocument();
    expect(screen.getByText('9876/SP')).toBeInTheDocument();
    expect(screen.getByText('Dra. Beatriz Santos')).toBeInTheDocument();
    expect(screen.getByText('65432/SP')).toBeInTheDocument();
    expect(screen.getByText('VetMed Manipulação Ltda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir documento 1 de vetmed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir documento 2 de vetmed/i })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/admin/capabilities', expect.anything());
  });

  it('esconde a aba quando a vertical está desligada e não há habilitações', async () => {
    mockGetRoutes({ '/admin/pharmacies/pending': [PENDING] });

    renderWithProviders(<Pharmacies />);

    await waitFor(() => expect(screen.getByText('Drogaria Esperança')).toBeInTheDocument());
    expect(screen.queryByRole('tab', { name: /habilitações/i })).not.toBeInTheDocument();
  });

  it('só aprova a habilitação veterinária depois do checklist regulatório completo', async () => {
    mockGetRoutes({ '/config': { vetEnabled: true }, '/admin/capabilities': [VET_CAPABILITY] });
    api.patch.mockResolvedValueOnce({ data: { ...VET_CAPABILITY, status: 'VERIFIED' } });

    renderWithProviders(<Pharmacies />, CAPS_ROUTE);
    fireEvent.click(await screen.findByRole('button', { name: /^aprovar$/i }));

    const confirm = await screen.findByRole('button', { name: /confirmar aprovação/i });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /registro no mapa/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /crmv da empresa/i }));
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /responsável técnico e crf/i }));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/capabilities/cap-1/approve', {
        checklist: { mapaChecked: true, crmvChecked: true, rtCrfChecked: true },
      });
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/habilitada/i), 'Habilitação aprovada');
    });
  });

  it('exige motivo para recusar a habilitação e envia ao backend', async () => {
    mockGetRoutes({ '/config': { vetEnabled: true }, '/admin/capabilities': [VET_CAPABILITY] });
    api.patch.mockResolvedValueOnce({ data: { ...VET_CAPABILITY, status: 'REJECTED' } });

    renderWithProviders(<Pharmacies />, CAPS_ROUTE);
    fireEvent.click(await screen.findByRole('button', { name: /^recusar$/i }));

    const confirm = await screen.findByRole('button', { name: /confirmar recusa/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/motivo da recusa/i), { target: { value: 'Registro no MAPA não localizado' } });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/capabilities/cap-1/reject', { reason: 'Registro no MAPA não localizado' });
    });
  });

  it('suspende uma habilitação ativa com motivo obrigatório', async () => {
    const verified = { ...VET_CAPABILITY, status: 'VERIFIED', verifiedAt: new Date().toISOString() };
    mockGetRoutes({ '/config': { vetEnabled: true }, '/admin/capabilities': [verified] });
    api.patch.mockResolvedValueOnce({ data: { ...verified, status: 'SUSPENDED' } });

    renderWithProviders(<Pharmacies />, `${CAPS_ROUTE}&capStatus=VERIFIED`);
    expect(screen.queryByRole('button', { name: /^aprovar$/i })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /^suspender$/i }));

    const confirm = await screen.findByRole('button', { name: /confirmar suspensão/i });
    fireEvent.change(screen.getByLabelText(/motivo da suspensão/i), { target: { value: 'CRMV da empresa vencido' } });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/capabilities/cap-1/suspend', { reason: 'CRMV da empresa vencido' });
      expect(mockToast.info).toHaveBeenCalledWith(expect.any(String), 'Habilitação suspensa');
    });
  });

  it('abre o documento de evidência pela URL assinada', async () => {
    const signedUrl = 'https://abc.supabase.co/storage/v1/object/sign/prescriptions/a.pdf?token=t';
    mockGetRoutes({
      '/config': { vetEnabled: true },
      '/admin/capabilities': [VET_CAPABILITY],
      '/admin/capabilities/cap-1/evidences/0/view-url': { signedUrl, expiresInSeconds: 300 },
    });
    const fakeWindow = { closed: false, opener: {}, location: { href: '' }, document: { body: {} }, close: jest.fn() };
    const openSpy = jest.spyOn(window, 'open').mockReturnValue(fakeWindow);

    renderWithProviders(<Pharmacies />, CAPS_ROUTE);
    fireEvent.click(await screen.findByRole('button', { name: /abrir documento 1 de vetmed/i }));

    await waitFor(() => expect(fakeWindow.location.href).toBe(signedUrl));
    expect(api.get).toHaveBeenCalledWith('/admin/capabilities/cap-1/evidences/0/view-url');
    expect(fakeWindow.opener).toBeNull();
    openSpy.mockRestore();
  });

  it('mostra estado de erro quando a consulta de habilitações falha', async () => {
    mockGetRoutes({ '/config': { vetEnabled: true }, '/admin/capabilities': new Error('falha') });

    renderWithProviders(<Pharmacies />, CAPS_ROUTE);

    expect(await screen.findByText(/erro ao carregar solicitações de habilitação/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
