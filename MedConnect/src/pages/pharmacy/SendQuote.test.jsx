/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import SendQuote from './SendQuote';
import { api } from '../../services/api';
import { apiError, renderRoute } from './test-utils';

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn() },
  getSocket: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'ph1', name: 'Farmácia Exemplo', role: 'PHARMACY' }, userType: 'PHARMACY' }),
}));

// Formato de GET /prescriptions/:id para farmácia (ADR 008): sem fileUrl/patientId/cotações de concorrentes
const PRESCRIPTION = {
  id: 'p1aaaaaa-1111',
  status: 'QUOTED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  contactReleased: false,
  patient: { anonymousId: 'Paciente #ABCDE' },
  quotes: [],
};
const ME = { id: 'ph1', name: 'Farmácia Exemplo', timezone: 'America/Sao_Paulo', businessHours: [], verificationStatus: 'VERIFIED' };

function mockGets(prescription = PRESCRIPTION) {
  api.get.mockImplementation((url) => {
    if (url === `/prescriptions/${PRESCRIPTION.id}`) return Promise.resolve({ data: prescription });
    if (url === '/pharmacy/me') return Promise.resolve({ data: ME });
    if (url === '/pharmacy/stats') return Promise.resolve({ data: { reviewsCount: 0, averageRating: 5 } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

const renderPage = () => renderRoute(<SendQuote />, { url: `/pharmacy/send-quote/${PRESCRIPTION.id}`, path: '/pharmacy/send-quote/:id' });

async function fillForm() {
  fireEvent.change(await screen.findByPlaceholderText('Ex: 89,90'), { target: { value: '45,00' } });
  fireEvent.change(screen.getByPlaceholderText('Ex: 2'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Observações para o paciente'), { target: { value: 'Matéria-prima pura com laudo.' } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGets();
  api.post.mockImplementation((url, body) =>
    Promise.resolve({ data: { id: 'q1', ...body, priceCents: 4500, price: '45.00', status: 'PENDING', pharmacyId: 'ph1' } })
  );
});

describe('SendQuote (farmácia)', () => {
  it('antes do aceite: só o pseudônimo, aviso de liberação e nenhum botão "Ver receita"', async () => {
    renderPage();
    expect(await screen.findAllByText('Paciente #ABCDE')).not.toHaveLength(0);
    expect(screen.getByText('A receita completa e o contato do paciente são liberados após o aceite da sua proposta.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver receita/ })).toBeNull();
  });

  it('proposta já aceita: mostra a proposta e libera "Ver receita"', async () => {
    mockGets({
      ...PRESCRIPTION,
      status: 'ACCEPTED',
      contactReleased: true,
      patient: { id: 'u1', name: 'Paciente Liberado', phone: '11988887777' },
      quotes: [{ id: 'q1', pharmacyId: 'ph1', priceCents: 4500, price: '45.00', deliveryDays: 2, status: 'ACCEPTED' }],
    });
    renderPage();
    expect(await screen.findByText('Você já enviou uma proposta para esta receita')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver receita/ })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Ex: 89,90')).toBeNull();
  });

  it('proposta enviada e ainda pendente: sem "Ver receita", com o aviso de liberação', async () => {
    mockGets({ ...PRESCRIPTION, quotes: [{ id: 'q1', pharmacyId: 'ph1', priceCents: 4500, price: '45.00', deliveryDays: 2, status: 'PENDING' }] });
    renderPage();
    expect(await screen.findByText('Você já enviou uma proposta para esta receita')).toBeInTheDocument();
    expect(screen.getByText(/são liberados após o aceite da sua proposta/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver receita/ })).toBeNull();
  });

  it('envia { prescriptionId, price, deliveryDays, notes } após a confirmação e mostra o sucesso', async () => {
    renderPage();
    await fillForm();
    // Pré-visualização ao vivo
    expect(within(screen.getByRole('region', { name: 'Pré-visualização da proposta' })).getByText('R$ 45,00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Enviar proposta ao paciente/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('R$ 45,00')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /Confirmar e enviar/ }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/quotes', {
        prescriptionId: PRESCRIPTION.id,
        price: 45,
        deliveryDays: 2,
        notes: 'Matéria-prima pura com laudo.',
      })
    );
    expect(await screen.findByRole('heading', { name: 'Proposta enviada!' })).toBeInTheDocument();
  });

  it('valida o valor e o prazo antes de abrir a confirmação', async () => {
    renderPage();
    await screen.findByPlaceholderText('Ex: 89,90');
    fireEvent.click(screen.getByRole('button', { name: /Enviar proposta ao paciente/ }));
    expect(await screen.findByText('Informe o valor da proposta.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ex: 89,90'), { target: { value: '12,345' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: 2'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar proposta ao paciente/ }));
    expect(await screen.findByText(/até 2 casas decimais/)).toBeInTheDocument();
    expect(screen.getByText(/Use um número inteiro de 1 a 60/)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('409 QUOTE_ALREADY_EXISTS: informa que a farmácia já enviou proposta', async () => {
    api.post.mockRejectedValueOnce(apiError(409, 'QUOTE_ALREADY_EXISTS', 'Esta farmácia já enviou uma cotação para esta receita'));
    renderPage();
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Enviar proposta ao paciente/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /Confirmar e enviar/ }));
    expect(await screen.findByText('Você já enviou uma proposta para esta receita')).toBeInTheDocument();
  });

  it('403 PHARMACY_NOT_VERIFIED ao carregar: mostra o estado de bloqueio', async () => {
    api.get.mockImplementation((url) => {
      if (url.startsWith('/prescriptions/')) return Promise.reject(apiError(403, 'PHARMACY_NOT_VERIFIED', 'Apenas farmácias verificadas.'));
      if (url === '/pharmacy/me') return Promise.resolve({ data: { ...ME, verificationStatus: 'PENDING_VERIFICATION' } });
      return Promise.resolve({ data: {} });
    });
    renderPage();
    expect(await screen.findByTestId('not-verified-state')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Ex: 89,90')).toBeNull();
  });

  it('receita já aceita com outra farmácia não mostra o formulário', async () => {
    mockGets({ ...PRESCRIPTION, status: 'ACCEPTED' });
    renderPage();
    expect(await screen.findByText('Esta receita não recebe mais propostas')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Ex: 89,90')).toBeNull();
  });
});
