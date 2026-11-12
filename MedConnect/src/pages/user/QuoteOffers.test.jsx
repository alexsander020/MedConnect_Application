/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import QuoteOffers from './QuoteOffers';
import { api } from '../../services/api';
import { renderPage, routeGet } from './test-utils';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), defaults: { baseURL: 'http://localhost:3000/api' } },
  getSocket: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn(), emit: jest.fn() })),
}));

const PRESCRIPTIONS = [
  {
    id: 'presc-0001-aaaa',
    status: 'QUOTED',
    createdAt: '2026-11-10T12:00:00.000Z',
    quotes: [
      {
        id: 'q-alfa',
        prescriptionId: 'presc-0001-aaaa',
        pharmacyId: 'ph-alfa',
        status: 'PENDING',
        priceCents: 4500,
        price: '45.00',
        deliveryDays: 2,
        notes: 'Cápsulas vegetais',
        createdAt: '2026-11-11T10:00:00.000Z',
        pharmacy: { id: 'ph-alfa', name: 'Farmácia Alfa' },
      },
      {
        id: 'q-beta',
        prescriptionId: 'presc-0001-aaaa',
        pharmacyId: 'ph-beta',
        status: 'PENDING',
        priceCents: 3990,
        price: '39.90',
        deliveryDays: 5,
        notes: null,
        createdAt: '2026-11-11T11:00:00.000Z',
        pharmacy: { id: 'ph-beta', name: 'Farmácia Beta' },
      },
    ],
  },
  { id: 'presc-0002-bbbb', status: 'PENDING', createdAt: '2026-11-11T12:00:00.000Z', quotes: [] },
];

const PUBLIC = { data: [{ id: 'ph-alfa', name: 'Farmácia Alfa', averageRating: 4.8, reviewsCount: 12 }], meta: { total: 1, openNow: 0 } };

describe('QuoteOffers (comparador de cotações)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routeGet(api, { '/prescriptions/my': PRESCRIPTIONS, '/pharmacies/public': PUBLIC });
  });

  it('agrupa por receita e destaca menor preço e menor prazo', async () => {
    renderPage(<QuoteOffers />);
    const alfa = await screen.findByRole('article', { name: /Cotação de Farmácia Alfa/ });
    const beta = screen.getByRole('article', { name: /Cotação de Farmácia Beta/ });

    expect(screen.getByRole('heading', { name: /Receita #PRESC-00/ })).toBeInTheDocument();
    expect(within(beta).getByText('Menor preço')).toBeInTheDocument();
    expect(within(alfa).getByText('Mais rápido')).toBeInTheDocument();
    expect(within(alfa).getByText(/R\$\s*45,00/)).toBeInTheDocument();
    expect(within(alfa).getByText('2 dias úteis')).toBeInTheDocument();
    await waitFor(() => expect(within(alfa).getByText('4,8')).toBeInTheDocument());
    expect(screen.getByText(/Mais 1 receita aguardando cotações/)).toBeInTheDocument();
  });

  it('confirma no diálogo e cria o pedido com POST /orders { quoteId }', async () => {
    api.post.mockResolvedValueOnce({ data: { id: 'order-123', status: 'PRODUCTION' } });
    renderPage(<QuoteOffers />);
    const alfa = await screen.findByRole('article', { name: /Cotação de Farmácia Alfa/ });

    fireEvent.click(within(alfa).getByRole('button', { name: /Aprovar cotação e fazer pedido/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/R\$\s*45,00/)).toBeInTheDocument();
    expect(within(dialog).getByText('2 dias úteis')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /Confirmar pedido/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/orders', { quoteId: 'q-alfa' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/order/order-123'));
  });

  it('mostra estado vazio com chamada para enviar receita quando não há cotações', async () => {
    routeGet(api, { '/prescriptions/my': [], '/pharmacies/public': PUBLIC });
    renderPage(<QuoteOffers />);
    expect(await screen.findByText('Nenhuma cotação para comparar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Enviar receita/i })).toHaveAttribute('href', '/new-quote');
  });

  it('mostra erro com nova tentativa quando a API falha', async () => {
    routeGet(api, { '/prescriptions/my': new Error('Network Error') });
    renderPage(<QuoteOffers />);
    expect(await screen.findByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText('Erro ao carregar cotações')).toBeInTheDocument();
    expect(screen.queryByText('Network Error')).toBeNull();
  });
});
