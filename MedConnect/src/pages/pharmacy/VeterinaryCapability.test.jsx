/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VeterinaryCapability from './VeterinaryCapability';
import { api } from '../../services/api';
import * as configHook from '../../hooks/usePublicConfig';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'pharm-1', name: 'Farmácia Vet Care', role: 'PHARMACY' },
    userType: 'PHARMACY',
  }),
}));

const renderWithProviders = (ui, initialRoute = '/pharmacy/veterinary-capability') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/pharmacy/veterinary-capability" element={ui} />
          <Route path="/pharmacy" element={<div>Painel Farmácia</div>} />
          <Route path="/pharmacy/requests" element={<div>Mural de Receitas</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('VeterinaryCapability Component (ETAPA V5 - Testing Library)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exibe tela de indisponibilidade se vetEnabled estiver desligada', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: false,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    renderWithProviders(<VeterinaryCapability />);

    expect(screen.getByText('Habilitação Veterinária Indisponível')).toBeInTheDocument();
  });

  it('exibe formulário de solicitação quando a farmácia ainda não possui registro veterinário', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    api.get.mockResolvedValueOnce({ data: [] });

    renderWithProviders(<VeterinaryCapability />);

    expect(await screen.findByText('Solicitar Habilitação VETERINARY_COMPOUNDING')).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de Registro no MAPA/i)).toBeInTheDocument();
    expect(screen.getByText(/Registro da Empresa no CRMV e UF/i)).toBeInTheDocument();
    expect(screen.getByText(/Nome do Responsável Técnico/i)).toBeInTheDocument();
  });

  it('valida formato do Registro no MAPA antes de submeter', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    api.get.mockResolvedValueOnce({ data: [] });

    renderWithProviders(<VeterinaryCapability />);

    const mapaInput = await screen.findByPlaceholderText(/SP-12345-6/i);
    const crmvInput = screen.getByPlaceholderText(/12345-J/i);
    const rtInput = screen.getByPlaceholderText(/Roberto Guimarães/i);
    const crfInput = screen.getByPlaceholderText(/65432/i);

    fireEvent.change(mapaInput, { target: { value: 'invalid-mapa-form' } });
    fireEvent.change(crmvInput, { target: { value: '12345-J' } });
    fireEvent.change(rtInput, { target: { value: 'Dr. Roberto' } });
    fireEvent.change(crfInput, { target: { value: '12345' } });

    const form = mapaInput.closest('form');
    fireEvent.submit(form);

    expect(await screen.findByText(/Informe um Registro MAPA válido/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('exibe card de status PENDING_VERIFICATION com instruções de conferência pelo ADMIN', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    api.get.mockResolvedValueOnce({
      data: [
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
          evidenceFileKeys: ['local://evidence-1.pdf'],
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderWithProviders(<VeterinaryCapability />);

    expect(await screen.findByText('Solicitação em Análise pelo Administrador')).toBeInTheDocument();
    expect(screen.getByText('EM VERIFICAÇÃO')).toBeInTheDocument();
    expect(screen.getByText('SP-12345-6')).toBeInTheDocument();
    expect(screen.getByText('98765-J/SP')).toBeInTheDocument();
    expect(screen.getByText(/1 documento\(s\) em cofre privado/i)).toBeInTheDocument();
  });

  it('exibe card de status VERIFIED com homologação ativa e atalho para o mural', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    api.get.mockResolvedValueOnce({
      data: [
        {
          id: 'cap-verified-1',
          type: 'VETERINARY_COMPOUNDING',
          status: 'VERIFIED',
          mapaRegistrationNumber: 'SP-12345-6',
          verifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderWithProviders(<VeterinaryCapability />);

    expect(await screen.findByText('Habilitação Veterinária Ativa e Homologada')).toBeInTheDocument();
    expect(screen.getByText('VERIFICADA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ir para Mural de Oportunidades/i })).toBeInTheDocument();
  });

  it('exibe card de status REJECTED com motivo obrigatório e opção de reenvio', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    api.get.mockResolvedValueOnce({
      data: [
        {
          id: 'cap-rejected-1',
          type: 'VETERINARY_COMPOUNDING',
          status: 'REJECTED',
          mapaRegistrationNumber: 'SP-00000',
          rejectionReason: 'Certidão do CRMV com validade vencida.',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderWithProviders(<VeterinaryCapability />);

    expect(await screen.findByText('Solicitação Recusada pelo Administrador')).toBeInTheDocument();
    expect(screen.getByText('RECUSADA')).toBeInTheDocument();
    expect(screen.getByText(/"Certidão do CRMV com validade vencida\."/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reenviar Solicitação com Correções/i })).toBeInTheDocument();
  });

  it('exibe card de status SUSPENDED destacando que pedidos em andamento continuam', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
      isLoading: false,
    });

    api.get.mockResolvedValueOnce({
      data: [
        {
          id: 'cap-suspended-1',
          type: 'VETERINARY_COMPOUNDING',
          status: 'SUSPENDED',
          mapaRegistrationNumber: 'SP-12345-6',
          rejectionReason: 'Suspensão cautelar por fiscalização sanitária.',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderWithProviders(<VeterinaryCapability />);

    expect(await screen.findByText('Capacidade de Manipulação Veterinária Suspensa')).toBeInTheDocument();
    expect(screen.getByText('SUSPENSA')).toBeInTheDocument();
    expect(screen.getByText(/"Suspensão cautelar por fiscalização sanitária\."/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedidos e cotações já aprovados anteriormente seguem seu fluxo normal/i)).toBeInTheDocument();
  });
});
