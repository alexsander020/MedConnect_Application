/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrderManagement from './OrderManagement';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock('../../context/ToastContext', () => ({
  useToast: () => mockToast,
}));

const mockOrders = [
  {
    id: 'ord-vet-12345678',
    status: 'PRODUCTION',
    deliveryAddress: 'Rua das Flores, 123 - Jardins, São Paulo - SP',
    createdAt: new Date().toISOString(),
    quote: {
      id: 'quote-vet-1',
      price: 65,
      deliveryDays: 2,
      prescription: {
        id: 'rx-vet-1',
        kind: 'VETERINARY',
        notes: 'Biscoito palatável sabor carne',
        prescriberName: 'Dra. Camila',
        prescriberCrmv: '54321',
        prescriberUf: 'SP',
        pet: {
          id: 'pet-1',
          name: 'Thor',
          species: 'DOG',
          breed: 'Golden Retriever',
          weightGrams: 15500,
        },
        patient: {
          id: 'tutor-1',
          name: 'Carlos Oliveira (Tutor)',
          phone: '(11) 98765-4321',
          address: 'Rua das Flores, 123',
        },
      },
    },
  },
];

const renderOrderManagement = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  api.get.mockResolvedValueOnce({ data: mockOrders });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrderManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('OrderManagement Component - Farmácia (ETAPA V5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exibe selo Veterinário, dados do animal e dados de contato do tutor após aceite', async () => {
    renderOrderManagement();

    expect(await screen.findByText('Veterinário')).toBeInTheDocument();
    expect(screen.getByText('Thor')).toBeInTheDocument();
    expect(screen.getByText(/Canina \(Cão\)/i)).toBeInTheDocument();
    expect(screen.getByText(/15,50 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/Dra\. Camila/i)).toBeInTheDocument();

    // Dados de contato do tutor (liberados no pedido aceito)
    expect(screen.getByText(/Rua das Flores, 123/i)).toBeInTheDocument();
    expect(screen.getByText(/\(11\) 98765-4321/i)).toBeInTheDocument();
  });

  it('permite avançar o status do pedido na máquina de estados', async () => {
    api.patch.mockResolvedValueOnce({
      data: { id: 'ord-vet-12345678', status: 'DELIVERY' },
    });

    renderOrderManagement();

    const advanceBtn = await screen.findByRole('button', { name: /Despachar para Entrega/i });
    fireEvent.click(advanceBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/orders/ord-vet-12345678/status', {
        status: 'DELIVERY',
      });
    });
  });
});

