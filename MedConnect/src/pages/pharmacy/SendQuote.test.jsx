/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SendQuote from './SendQuote';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'pharm-1', name: 'Farmácia Modelo', role: 'PHARMACY' },
    userType: 'PHARMACY',
  }),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
};
jest.mock('../../context/ToastContext', () => ({
  useToast: () => mockToast,
}));

const mockVetPrescription = {
  id: 'rx-vet-test-1',
  kind: 'VETERINARY',
  status: 'PENDING',
  notes: 'Fórmula de gabapentina 50mg palatável',
  createdAt: new Date().toISOString(),
  prescriberName: 'Dr. Fernando Dias',
  prescriberCrmv: '9876',
  prescriberUf: 'MG',
  pet: {
    name: 'Bidu',
    species: 'DOG',
    breed: 'Schnauzer',
    weightGrams: 8500,
  },
};

const renderSendQuote = (prescriptionData = mockVetPrescription) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  api.get.mockResolvedValueOnce({ data: prescriptionData });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pharmacy/send-quote/rx-vet-test-1']}>
        <Routes>
          <Route path="/pharmacy/send-quote/:id" element={<SendQuote />} />
          <Route path="/pharmacy/requests" element={<div>Mural de Receitas</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('SendQuote Component - Farmácia (ETAPA V5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exibe resumo do animal e campos veterinários específicos (forma, sabor, prazo)', async () => {
    renderSendQuote();

    expect(await screen.findByText('Bidu')).toBeInTheDocument();
    expect(screen.getByText('Veterinário')).toBeInTheDocument();
    expect(screen.getByText(/8,50 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Fernando Dias/i)).toBeInTheDocument();
    expect(screen.getByText(/CRMV-MG 9876/i)).toBeInTheDocument();

    // Campos veterinários
    expect(screen.getByText(/Forma Farmacêutica Ofertada/i)).toBeInTheDocument();
    expect(screen.getByText(/Aromatização \/ Palatabilizante/i)).toBeInTheDocument();
    expect(screen.getByText(/Tempo de Manipulação \(dias\)/i)).toBeInTheDocument();
  });

  it('submete cotação com valor e especificações galênicas veterinárias', async () => {
    api.post.mockResolvedValueOnce({
      data: { id: 'quote-123', priceCents: 7500, status: 'PENDING' },
    });

    renderSendQuote();

    const priceInput = await screen.findByPlaceholderText(/89,90/i);
    const formInput = screen.getByPlaceholderText(/Biscoito Palatável/i);
    const flavorInput = screen.getByPlaceholderText(/Sabor Carne/i);
    const daysInputs = screen.getAllByPlaceholderText(/Ex: 2/i);

    fireEvent.change(priceInput, { target: { value: '75,00' } });
    fireEvent.change(formInput, { target: { value: 'Biscoito Palatável' } });
    fireEvent.change(flavorInput, { target: { value: 'Sabor Carne' } });
    fireEvent.change(daysInputs[0], { target: { value: '2' } }); // Tempo de manipulação
    fireEvent.change(daysInputs[1], { target: { value: '3' } }); // Prazo de entrega total

    const submitBtn = screen.getByRole('button', { name: /Enviar Proposta ao Tutor/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/quotes', expect.objectContaining({
        prescriptionId: 'rx-vet-test-1',
        price: 75,
        deliveryDays: 3,
        estimatedPreparationDays: 2,
        pharmaceuticalForm: 'Biscoito Palatável',
        flavoring: 'Sabor Carne',
      }));
    });

    expect(await screen.findByText('Proposta Enviada!')).toBeInTheDocument();
  });
});
