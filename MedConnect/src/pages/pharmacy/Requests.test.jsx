/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Requests from './Requests';
import { api } from '../../services/api';
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

beforeEach(() => {
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
});
