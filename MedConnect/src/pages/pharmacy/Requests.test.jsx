/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Requests from './Requests';
import { api } from '../../services/api';
import * as configHook from '../../hooks/usePublicConfig';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'pharm-1', name: 'Farmácia Modelo', role: 'PHARMACY' },
    userType: 'PHARMACY',
  }),
}));

const mockPrescriptions = [
  {
    id: 'rx-human-1',
    kind: 'HUMAN',
    status: 'PENDING',
    notes: 'Minoxidil 5% com biotina',
    createdAt: new Date().toISOString(),
    patient: { anonymousId: 'Paciente #ABC12' },
    quotes: [],
  },
  {
    id: 'rx-vet-1',
    kind: 'VETERINARY',
    status: 'PENDING',
    notes: 'Biscoito palatável de omeprazol 20mg',
    createdAt: new Date().toISOString(),
    species: 'DOG',
    weightGrams: 14500,
    approximateAgeMonths: 36,
    animal: {
      name: 'Max',
      species: 'DOG',
      breed: 'Labrador Retriever',
      weightGrams: 14500,
      approximateAgeMonths: 36,
    },
    prescriber: {
      name: 'Dra. Luiza Castro',
      crmv: '12345',
      uf: 'SP',
    },
    requiresManualDocumentCheck: true,
    quotes: [],
  },
];

const renderRequests = () => {
  return render(
    <MemoryRouter initialEntries={['/pharmacy/requests']}>
      <Routes>
        <Route path="/pharmacy/requests" element={<Requests />} />
        <Route path="/pharmacy/send-quote/:id" element={<div>Tela de Envio de Cotação</div>} />
        <Route path="/pharmacy/veterinary-capability" element={<div>Tela de Habilitação</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Requests Component - Farmácia (ETAPA V5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exibe selos Humano e Veterinário na listagem de oportunidades', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      isLoading: false,
    });

    api.get.mockImplementation((url) => {
      if (url === '/prescriptions/pharmacy') {
        return Promise.resolve({ data: mockPrescriptions });
      }
      if (url === '/pharmacy/capabilities') {
        return Promise.resolve({
          data: [{ type: 'VETERINARY_COMPOUNDING', status: 'VERIFIED' }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderRequests();

    expect(await screen.findByText('Paciente #ABC12')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Humano')).toBeInTheDocument();
    expect(screen.getByText('Veterinário')).toBeInTheDocument();
  });

  it('exibe espécie, raça, peso formatado em kg e prescritor para receita veterinária', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      isLoading: false,
    });

    api.get.mockImplementation((url) => {
      if (url === '/prescriptions/pharmacy') {
        return Promise.resolve({ data: mockPrescriptions });
      }
      if (url === '/pharmacy/capabilities') {
        return Promise.resolve({
          data: [{ type: 'VETERINARY_COMPOUNDING', status: 'VERIFIED' }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderRequests();

    expect(await screen.findByText('Canina (Cão)')).toBeInTheDocument();
    expect(screen.getByText(/Labrador Retriever/i)).toBeInTheDocument();
    expect(screen.getByText(/14,50 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/Dra\. Luiza Castro/i)).toBeInTheDocument();
    expect(screen.getByText(/CRMV-SP 12345/i)).toBeInTheDocument();
  });

  it('exibe alerta "Conferir documento" quando requiresManualDocumentCheck for verdadeiro', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      isLoading: false,
    });

    api.get.mockImplementation((url) => {
      if (url === '/prescriptions/pharmacy') {
        return Promise.resolve({ data: mockPrescriptions });
      }
      if (url === '/pharmacy/capabilities') {
        return Promise.resolve({
          data: [{ type: 'VETERINARY_COMPOUNDING', status: 'VERIFIED' }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderRequests();

    expect(
      await screen.findByText(/Conferir documento: Notificação de Receita Veterinária/i)
    ).toBeInTheDocument();
  });

  it('protege privacidade LGPD: NÃO exibe telefone, email ou endereço exato antes do aceite', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      isLoading: false,
    });

    api.get.mockImplementation((url) => {
      if (url === '/prescriptions/pharmacy') {
        return Promise.resolve({ data: mockPrescriptions });
      }
      if (url === '/pharmacy/capabilities') {
        return Promise.resolve({
          data: [{ type: 'VETERINARY_COMPOUNDING', status: 'VERIFIED' }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderRequests();

    await screen.findByText('Max');

    // Confirma que a localização é aproximada e oculta até aprovação
    expect(screen.getByText(/Região do Tutor \(Oculta até aprovação\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/\(\d{2}\)\s*\d{4,5}-\d{4}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it('exibe banner explicativo quando a farmácia não for VERIFIED e tentar filtrar por Veterinárias', async () => {
    jest.spyOn(configHook, 'usePublicConfig').mockReturnValue({
      vetEnabled: true,
      isLoading: false,
    });

    api.get.mockImplementation((url) => {
      if (url === '/prescriptions/pharmacy') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/pharmacy/capabilities') {
        return Promise.resolve({
          data: [{
            type: 'VETERINARY_COMPOUNDING',
            status: 'PENDING_VERIFICATION',
            mapaRegistrationNumber: 'SP-12345-6',
          }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderRequests();

    const vetFilterBtn = await screen.findByRole('button', { name: /Veterinárias/i });
    fireEvent.click(vetFilterBtn);

    expect(
      await screen.findByText('Habilitação Sanitária Veterinária Necessária')
    ).toBeInTheDocument();
    expect(screen.getByText('EM ANÁLISE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver Detalhes da Habilitação/i })).toBeInTheDocument();
  });
});
