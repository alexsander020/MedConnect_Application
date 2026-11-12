/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import PrivacyCenter from './PrivacyCenter';
import { api } from '../../services/api';
import { renderPage, routeGet } from './test-utils';

const mockNavigate = jest.fn();
const mockLogout = jest.fn(() => Promise.resolve());
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'u1', name: 'Ana Souza', role: 'PATIENT' }, logout: mockLogout }),
}));

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), defaults: { baseURL: 'http://localhost:3000/api' } },
  getSocket: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn(), emit: jest.fn() })),
}));

const STATUS = {
  hasActiveHealthConsent: true,
  isRevoked: false,
  latestConsent: { textVersion: 'v1.0.0' },
  history: [
    { id: 'c1', consentType: 'HEALTH_DATA_PROCESSING', textVersion: 'v1.0.0', consentedAt: '2026-11-01T10:00:00.000Z', revokedAt: null },
    { id: 'c2', consentType: 'TERMS_AND_PRIVACY', textVersion: 'v1.0.0', consentedAt: '2026-10-01T10:00:00.000Z', revokedAt: '2026-10-20T10:00:00.000Z' },
  ],
};

describe('PrivacyCenter (direitos do titular)', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let clickSpy;
  let downloads;

  beforeEach(() => {
    jest.clearAllMocks();
    downloads = [];
    URL.createObjectURL = jest.fn(() => 'blob:medconnect');
    URL.revokeObjectURL = jest.fn();
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      downloads.push(this.getAttribute('download'));
    });
    routeGet(api, { '/consent/status': STATUS, '/lgpd/export': { perfil: { nome: 'Ana Souza' } } });
  });

  afterEach(() => {
    clickSpy.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('lista os consentimentos com tipo, versão e situação', async () => {
    renderPage(<PrivacyCenter />);
    expect(await screen.findByText('Tratamento de dados de saúde')).toBeInTheDocument();
    expect(screen.getByText('Termos de Uso e Política de Privacidade')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Revogado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Política de Privacidade/ })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /Termos de Uso/ })).toHaveAttribute('href', '/terms');
  });

  it('exporta os dados chamando GET /lgpd/export e baixa o JSON com a data no nome', async () => {
    renderPage(<PrivacyCenter />);
    fireEvent.click(await screen.findByRole('button', { name: /Exportar meus dados/i }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/lgpd/export'));
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]).toMatch(/^medconnect-meus-dados-\d{4}-\d{2}-\d{2}\.json$/);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('revoga com o mesmo payload de antes, após confirmação', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'Consentimento revogado com sucesso.' } });
    renderPage(<PrivacyCenter />);
    fireEvent.click(await screen.findByRole('button', { name: /Revogar consentimentos/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Novos envios de receita ficam bloqueados/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Revogar consentimentos/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/consent/revoke', { reason: 'Revogado pelo titular nas configurações' })
    );
  });

  it('só exclui a conta depois de digitar EXCLUIR, e então sai e volta ao início', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true, mensagem: 'Dados pessoais anonimizados e excluídos com sucesso.' } });
    renderPage(<PrivacyCenter />);
    fireEvent.click(await screen.findByRole('button', { name: /Excluir conta e anonimizar dados/i }));
    const dialog = await screen.findByRole('alertdialog');
    const confirm = within(dialog).getByRole('button', { name: /Excluir conta definitivamente/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/Para confirmar, digite/i), { target: { value: 'excluir' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/lgpd/anonymize', undefined));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
