/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Requests from './Requests';
import { api } from '../../services/api';
import * as configHook from '../../hooks/usePublicConfig';
import { apiError, renderRoute } from './test-utils';

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn() },
  getSocket: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'ph1', name: 'Farmácia Exemplo', role: 'PHARMACY' }, userType: 'PHARMACY' }),
}));

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const LIST = [
  { id: 'p1aaaaaa-1', createdAt: hoursAgo(2), status: 'PENDING', patient: { anonymousId: 'Paciente #AAAAA' }, quotes: [] },
  { id: 'p2bbbbbb-2', createdAt: hoursAgo(72), status: 'QUOTED', patient: { anonymousId: 'Paciente #BBBBB' }, quotes: [] },
  {
    id: 'p3cccccc-3', createdAt: hoursAgo(5), status: 'QUOTED', patient: { anonymousId: 'Paciente #CCCCC' },
    quotes: [{ id: 'q3', pharmacyId: 'ph1', priceCents: 12990, price: '129.90', deliveryDays: 3, status: 'PENDING' }],
  },
];

// Mural com receitas humana e veterinária (formato de GET /prescriptions/pharmacy com VET_ENABLED)
const MIXED = [
  {
    id: 'rx-human-1',
    kind: 'HUMAN',
    status: 'PENDING',
    notes: 'Minoxidil 5% com biotina',
    createdAt: hoursAgo(1),
    patient: { anonymousId: 'Paciente #ABC12' },
    quotes: [],
  },
  {
    id: 'rx-vet-1',
    kind: 'VETERINARY',
    status: 'PENDING',
    notes: 'Biscoito palatável de omeprazol 20mg',
    createdAt: hoursAgo(1),
    species: 'DOG',
    weightGrams: 14500,
    approximateAgeMonths: 36,
    animal: { name: 'Max', species: 'DOG', breed: 'Labrador Retriever', weightGrams: 14500, approximateAgeMonths: 36 },
    prescriber: { name: 'Dra. Luiza Castro', crmv: '12345', uf: 'SP' },
    requiresManualDocumentCheck: true,
    quotes: [],
  },
];

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const renderPage = () =>
  renderRoute(
    <Routes>
      <Route path="/pharmacy/requests" element={<Requests />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { url: '/pharmacy/requests' }
  );

function mockVet({ prescriptions = MIXED, capabilities = [{ type: 'VETERINARY_COMPOUNDING', status: 'VERIFIED' }] } = {}) {
  jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({ vetEnabled: true, isLoading: false });
  api.get.mockImplementation((url) => {
    if (url === '/prescriptions/pharmacy') return Promise.resolve({ data: prescriptions });
    if (url === '/pharmacy/capabilities') return Promise.resolve({ data: capabilities });
    if (url === '/pharmacy/me') return Promise.resolve({ data: { id: 'ph1', verificationStatus: 'VERIFIED' } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  api.get.mockImplementation((url) => {
    if (url === '/prescriptions/pharmacy') return Promise.resolve({ data: LIST });
    if (url === '/pharmacy/me') return Promise.resolve({ data: { id: 'ph1', verificationStatus: 'VERIFIED' } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
});

describe('Requests (mural da farmácia)', () => {
  it('mostra o selo NOVA só para receitas recentes ainda sem proposta', async () => {
    renderPage();
    expect(await screen.findByText('Paciente #AAAAA')).toBeInTheDocument();
    expect(screen.getByText('Paciente #BBBBB')).toBeInTheDocument();
    expect(screen.getAllByText('NOVA')).toHaveLength(1);
    // A receita já cotada fica na outra aba
    expect(screen.queryByText('Paciente #CCCCC')).toBeNull();
    expect(screen.getByRole('tab', { name: /Já cotadas/ })).toHaveTextContent('(1)');
  });

  it('não oferece "Ver receita" antes do aceite e explica quando o arquivo é liberado (ADR 008)', async () => {
    renderPage();
    await screen.findByText('Paciente #AAAAA');
    expect(screen.queryByRole('button', { name: /Ver receita/ })).toBeNull();
    expect(screen.getAllByText('A receita completa e o contato do paciente são liberados após o aceite da sua proposta.')).toHaveLength(2);
  });

  it('"Enviar cotação" leva para /pharmacy/send-quote/:id', async () => {
    renderPage();
    await screen.findByText('Paciente #AAAAA');
    fireEvent.click(screen.getAllByRole('button', { name: /Enviar cotação/ })[0]);
    expect(await screen.findByTestId('where')).toHaveTextContent('/pharmacy/send-quote/p1aaaaaa-1');
  });

  it('busca pelo código da receita', async () => {
    renderPage();
    await screen.findByText('Paciente #AAAAA');
    fireEvent.change(screen.getByLabelText('Buscar receita pelo código'), { target: { value: '#P2BB' } });
    await waitFor(() => expect(screen.queryByText('Paciente #AAAAA')).toBeNull());
    expect(screen.getByText('Paciente #BBBBB')).toBeInTheDocument();
  });

  it('403 PHARMACY_NOT_VERIFIED vira um estado de bloqueio amigável (sem ErrorState)', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/prescriptions/pharmacy') return Promise.reject(apiError(403, 'PHARMACY_NOT_VERIFIED', 'Apenas farmácias verificadas.'));
      return Promise.reject(new Error('offline'));
    });
    renderPage();
    expect(await screen.findByTestId('not-verified-state')).toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('bloqueia o mural quando o perfil indica verificação pendente', async () => {
    api.get.mockImplementation((url) =>
      url === '/pharmacy/me'
        ? Promise.resolve({ data: { id: 'ph1', verificationStatus: 'PENDING_VERIFICATION' } })
        : Promise.resolve({ data: LIST })
    );
    renderPage();
    expect(await screen.findByTestId('not-verified-state')).toBeInTheDocument();
    expect(screen.queryByText('Paciente #AAAAA')).toBeNull();
  });

  it('com a vertical veterinária desligada não mostra selos de tipo nem o filtro', async () => {
    renderPage();
    await screen.findByText('Paciente #AAAAA');
    expect(screen.queryByText('Humano')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Filtrar por tipo de receita' })).toBeNull();
  });
});

describe('Requests — vertical veterinária (VET_ENABLED)', () => {
  it('exibe selos Humano e Veterinário e o animal no lugar do pseudônimo', async () => {
    mockVet();
    renderPage();
    expect(await screen.findByText('Paciente #ABC12')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Max' })).toBeInTheDocument();
    expect(screen.getByText('Humano')).toBeInTheDocument();
    expect(screen.getByText('Veterinário')).toBeInTheDocument();
  });

  it('exibe espécie, raça, peso em kg, idade e prescritor da receita veterinária', async () => {
    mockVet();
    renderPage();
    const card = (await screen.findByRole('heading', { name: 'Max' })).closest('article');
    expect(within(card).getByText('Cão')).toBeInTheDocument();
    expect(within(card).getByText(/Labrador Retriever/)).toBeInTheDocument();
    expect(within(card).getByText('14,5 kg')).toBeInTheDocument();
    expect(within(card).getByText(/3 anos/)).toBeInTheDocument();
    expect(within(card).getByText('Dra. Luiza Castro · CRMV-SP 12345')).toBeInTheDocument();
  });

  it('exibe o alerta "Conferir documento" quando requiresManualDocumentCheck é verdadeiro', async () => {
    mockVet();
    renderPage();
    expect(await screen.findByText(/Conferir documento: Notificação de Receita Veterinária/)).toBeInTheDocument();
  });

  it('protege a privacidade (LGPD): sem telefone, e-mail ou endereço antes do aceite', async () => {
    mockVet();
    renderPage();
    await screen.findByRole('heading', { name: 'Max' });
    expect(screen.getByText('A receita completa e o contato do tutor são liberados após o aceite da sua proposta.')).toBeInTheDocument();
    expect(screen.queryByText(/\(\d{2}\)\s*\d{4,5}-\d{4}/)).toBeNull();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it('filtra por tipo de receita', async () => {
    mockVet();
    renderPage();
    await screen.findByRole('heading', { name: 'Max' });
    const group = screen.getByRole('group', { name: 'Filtrar por tipo de receita' });

    fireEvent.click(within(group).getByRole('button', { name: /Humanas/ }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Max' })).toBeNull());
    expect(screen.getByText('Paciente #ABC12')).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: /Veterinárias/ }));
    expect(await screen.findByRole('heading', { name: 'Max' })).toBeInTheDocument();
    expect(screen.queryByText('Paciente #ABC12')).toBeNull();
  });

  it('explica a habilitação quando a farmácia filtra "Veterinárias" sem estar habilitada', async () => {
    mockVet({
      prescriptions: [],
      capabilities: [{ type: 'VETERINARY_COMPOUNDING', status: 'PENDING_VERIFICATION', mapaRegistrationNumber: 'SP-12345-6' }],
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Veterinárias/ }));
    expect(await screen.findByText('Habilitação veterinária necessária')).toBeInTheDocument();
    expect(screen.getByText('Em análise')).toBeInTheDocument();
    expect(screen.getByText(/registro MAPA SP-12345-6/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver detalhes da habilitação/ })).toHaveAttribute('href', '/pharmacy/veterinary-capability');
  });
});
