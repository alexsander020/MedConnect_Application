/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Orders from './user/Orders';
import Requests from './pharmacy/Requests';
import OrderManagement from './pharmacy/OrderManagement';
import { api } from '../services/api';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'u1', name: 'Paciente Teste', role: 'PATIENT' },
    userType: 'PATIENT',
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

jest.mock('../services/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
  getSocket: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

describe('Anti-Fallback Mock Data Isolation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Orders Page (Patient)', () => {
    it('should display error state and NO mock data when api fails', async () => {
      api.get.mockRejectedValueOnce(new Error('Network Error: backend down'));

      render(
        <MemoryRouter>
          <Orders />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeTruthy();
      });

      expect(screen.queryByText('FarmaMix Manipulação')).toBeNull();
      expect(screen.queryByText('Melatonina 3mg')).toBeNull();
      expect(screen.getByText(/Erro ao carregar pedidos/i)).toBeTruthy();
    });
  });

  describe('Requests Page (Pharmacy)', () => {
    it('should display error state and NO mock data when api fails', async () => {
      api.get.mockRejectedValueOnce(new Error('Network Error: backend down'));

      render(
        <MemoryRouter>
          <Requests />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeTruthy();
      });

      expect(screen.queryByText('Ana Clara Silva')).toBeNull();
      expect(screen.queryByText('Pedro Oliveira')).toBeNull();
      expect(screen.getByText(/Erro ao carregar receitas/i)).toBeTruthy();
    });
  });

  describe('OrderManagement Page (Pharmacy)', () => {
    it('should display error state and NO mock data when api fails', async () => {
      api.get.mockRejectedValueOnce(new Error('Network Error: backend down'));

      render(
        <MemoryRouter>
          <OrderManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeTruthy();
      });

      expect(screen.queryByText('ORD-2024001')).toBeNull();
      expect(screen.queryByText('Marcos Almeida')).toBeNull();
      expect(screen.getByText(/Erro ao carregar pedidos/i)).toBeTruthy();
    });
  });
});
