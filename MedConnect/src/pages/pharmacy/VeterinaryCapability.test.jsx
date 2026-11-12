/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import VeterinaryCapability from './VeterinaryCapability';
import { api } from '../../services/api';
import * as configHook from '../../hooks/usePublicConfig';
import { apiError, renderRoute } from './test-utils';

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn() },
  getSocket: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'pharm-1', name: 'Farmácia Vet Care', role: 'PHARMACY' }, userType: 'PHARMACY' }),
}));

const flags = (vetEnabled) =>
  jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
    vetEnabled,
    vetAllowFoodProducing: false,
    vetControlledEnabled: false,
    isLoading: false,
  });

const withCapabilities = (list) =>
  api.get.mockImplementation((url) =>
    url === '/pharmacy/capabilities' ? Promise.resolve({ data: list }) : Promise.reject(new Error(`unexpected GET ${url}`))
  );

const renderPage = () => renderRoute(<VeterinaryCapability />, { url: '/pharmacy/veterinary-capability' });

const now = new Date().toISOString();

async function fillValidForm() {
  fireEvent.change(await screen.findByLabelText('Registro no MAPA *'), { target: { value: 'SP-12345-6' } });
  fireEvent.change(screen.getByLabelText('Registro da empresa no CRMV *'), { target: { value: '12345-J' } });
  fireEvent.change(screen.getByLabelText('Responsável técnico (farmacêutico) *'), { target: { value: 'Dr. Roberto Guimarães' } });
  fireEvent.change(screen.getByLabelText('CRF do responsável técnico *'), { target: { value: '65432' } });
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('VeterinaryCapability (farmácia)', () => {
  it('fica indisponível quando a vertical veterinária está desligada', () => {
    flags(false);
    renderPage();
    expect(screen.getByText('Habilitação veterinária indisponível')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('mostra o formulário quando a farmácia ainda não pediu habilitação', async () => {
    flags(true);
    withCapabilities([]);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Solicitar habilitação veterinária' })).toBeInTheDocument();
    expect(screen.getByLabelText('Registro no MAPA *')).toBeInTheDocument();
    expect(screen.getByLabelText('Registro da empresa no CRMV *')).toBeInTheDocument();
    expect(screen.getByLabelText('Responsável técnico (farmacêutico) *')).toBeInTheDocument();
    expect(screen.getByLabelText('Documentos comprobatórios *')).toBeInTheDocument();
  });

  it('valida o formato do registro MAPA antes de enviar', async () => {
    flags(true);
    withCapabilities([]);
    renderPage();
    await fillValidForm();
    fireEvent.change(screen.getByLabelText('Registro no MAPA *'), { target: { value: 'sem-numero' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar para análise/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/registro MAPA válido/);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('exige ao menos um documento comprobatório', async () => {
    flags(true);
    withCapabilities([]);
    renderPage();
    await fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /Enviar para análise/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Anexe ao menos 1 documento/);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('envia os dados e as evidências em multipart para POST /pharmacy/capabilities/veterinary', async () => {
    flags(true);
    withCapabilities([]);
    api.post.mockResolvedValueOnce({ data: { id: 'cap-1', type: 'VETERINARY_COMPOUNDING', status: 'PENDING_VERIFICATION' } });
    renderPage();
    await fillValidForm();
    const file = new File(['%PDF-1.4'], 'certificado-mapa.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Documentos comprobatórios *'), { target: { files: [file] } });
    expect(await screen.findByText('certificado-mapa.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Enviar para análise/ }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe('/pharmacy/capabilities/veterinary');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(body.get('mapaRegistrationNumber')).toBe('SP-12345-6');
    expect(body.get('crmvCompanyRegistration')).toBe('12345-J');
    expect(body.get('crmvCompanyUf')).toBe('SP');
    expect(body.get('technicalResponsibleCrf')).toBe('65432');
    expect(body.getAll('evidences')).toHaveLength(1);
  });

  it('recusa arquivos que não sejam PDF, JPEG ou PNG', async () => {
    flags(true);
    withCapabilities([]);
    renderPage();
    await screen.findByLabelText('Documentos comprobatórios *');
    const bad = new File(['x'], 'planilha.xlsx', { type: 'application/vnd.ms-excel' });
    fireEvent.change(screen.getByLabelText('Documentos comprobatórios *'), { target: { files: [bad] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/apenas PDF, JPEG ou PNG/);
    expect(screen.queryByText('planilha.xlsx')).toBeNull();
  });

  it('mostra o erro do servidor quando a solicitação é recusada', async () => {
    flags(true);
    withCapabilities([]);
    api.post.mockRejectedValueOnce(apiError(400, 'INVALID_MAPA_REGISTRATION', 'Número de registro no MAPA inválido.'));
    renderPage();
    await fillValidForm();
    fireEvent.change(screen.getByLabelText('Documentos comprobatórios *'), {
      target: { files: [new File(['%PDF'], 'mapa.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar para análise/ }));
    expect(await screen.findByText('Número de registro no MAPA inválido.')).toBeInTheDocument();
  });

  it('PENDING_VERIFICATION: mostra a análise em andamento e os dados enviados', async () => {
    flags(true);
    withCapabilities([
      {
        id: 'cap-pending-1',
        type: 'VETERINARY_COMPOUNDING',
        status: 'PENDING_VERIFICATION',
        mapaRegistrationNumber: 'SP-12345-6',
        crmvCompanyRegistration: '98765-J',
        crmvCompanyUf: 'SP',
        technicalResponsibleName: 'Dr. Farmacêutico RT',
        technicalResponsibleCrf: '12345',
        technicalResponsibleCrfUf: 'SP',
        evidenceFileKeys: ['supabase://evidence-1.pdf'],
        createdAt: now,
      },
    ]);
    renderPage();
    expect(await screen.findByText('Solicitação em análise')).toBeInTheDocument();
    expect(screen.getByText('Em análise')).toBeInTheDocument();
    expect(screen.getByText('SP-12345-6')).toBeInTheDocument();
    expect(screen.getByText('98765-J/SP')).toBeInTheDocument();
    expect(screen.getByText(/documento enviado \(armazenamento privado\)/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Registro no MAPA *')).toBeNull();
  });

  it('VERIFIED: mostra a habilitação ativa e o atalho para as solicitações', async () => {
    flags(true);
    withCapabilities([{ id: 'cap-verified-1', type: 'VETERINARY_COMPOUNDING', status: 'VERIFIED', mapaRegistrationNumber: 'SP-12345-6', verifiedAt: now, createdAt: now }]);
    renderPage();
    expect(await screen.findByText('Habilitação veterinária ativa')).toBeInTheDocument();
    expect(screen.getByText('Habilitada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir para as solicitações/ })).toHaveAttribute('href', '/pharmacy/requests');
  });

  it('REJECTED: mostra o motivo e reabre o formulário preenchido para reenvio', async () => {
    flags(true);
    withCapabilities([
      {
        id: 'cap-rejected-1',
        type: 'VETERINARY_COMPOUNDING',
        status: 'REJECTED',
        mapaRegistrationNumber: 'SP-00000',
        crmvCompanyRegistration: '555-J',
        crmvCompanyUf: 'MG',
        rejectionReason: 'Certidão do CRMV com validade vencida.',
        updatedAt: now,
        createdAt: now,
      },
    ]);
    renderPage();
    expect(await screen.findByText('Solicitação recusada')).toBeInTheDocument();
    expect(screen.getByText('Recusada')).toBeInTheDocument();
    expect(screen.getByText(/Certidão do CRMV com validade vencida\./)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reenviar com correções/ }));
    expect(await screen.findByRole('heading', { name: 'Reenviar documentação' })).toBeInTheDocument();
    expect(screen.getByLabelText('Registro no MAPA *')).toHaveValue('SP-00000');
    expect(screen.getByLabelText('Registro da empresa no CRMV *')).toHaveValue('555-J');
  });

  it('SUSPENDED: destaca que pedidos já aprovados continuam', async () => {
    flags(true);
    withCapabilities([
      {
        id: 'cap-suspended-1',
        type: 'VETERINARY_COMPOUNDING',
        status: 'SUSPENDED',
        mapaRegistrationNumber: 'SP-12345-6',
        rejectionReason: 'Suspensão cautelar por fiscalização sanitária.',
        updatedAt: now,
        createdAt: now,
      },
    ]);
    renderPage();
    expect(await screen.findByText('Habilitação veterinária suspensa')).toBeInTheDocument();
    expect(screen.getByText('Suspensa')).toBeInTheDocument();
    expect(screen.getByText(/Suspensão cautelar por fiscalização sanitária\./)).toBeInTheDocument();
    expect(screen.getByText(/Pedidos e cotações já aprovados anteriormente seguem seu fluxo normal/)).toBeInTheDocument();
  });
});
