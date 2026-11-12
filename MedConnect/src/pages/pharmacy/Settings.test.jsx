/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import Settings from './Settings';
import { api } from '../../services/api';
import { apiError, renderRoute } from './test-utils';

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn() },
  getSocket: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'ph1', name: 'Farmácia Exemplo', role: 'PHARMACY' }, userType: 'PHARMACY' }),
}));

const ME = {
  id: 'ph1',
  name: 'Farmácia Exemplo',
  email: 'contato@exemplo.com',
  cnpj: '11222333000181',
  phone: '11999990000',
  address: 'Rua das Flores, 100',
  city: 'São Paulo',
  state: 'SP',
  deliveryArea: 'Zona Sul',
  description: 'Manipulação magistral.',
  services: ['Dermatológicos'],
  timezone: 'America/Sao_Paulo',
  verificationStatus: 'VERIFIED',
  termsAcceptedAt: '2026-10-01T12:00:00.000Z',
  termsVersion: 'v1.0.0',
  businessHours: [{ dayOfWeek: 1, opensAt: '08:00', closesAt: '12:00' }],
};

const renderHours = () => renderRoute(<Settings />, { url: '/pharmacy/settings?tab=hours' });

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation((url) =>
    url === '/pharmacy/me' ? Promise.resolve({ data: ME }) : Promise.reject(new Error(`unexpected GET ${url}`))
  );
  api.put.mockImplementation((url, body) =>
    Promise.resolve({ data: { timezone: body.timezone, businessHours: body.hours, openStatus: { isOpen: false, closesAt: null, nextOpening: null } } })
  );
});

describe('Pharmacy Settings — editor de horários', () => {
  it('abre na aba indicada por ?tab=hours com a grade atual', async () => {
    renderHours();
    expect(await screen.findByLabelText('Segunda, intervalo 1: abre às')).toHaveValue('08:00');
    expect(screen.getByLabelText('Segunda, intervalo 1: fecha às')).toHaveValue('12:00');
    expect(screen.getByRole('switch', { name: 'Segunda' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Terça' })).not.toBeChecked();
  });

  it('bloqueia o envio quando há intervalos sobrepostos', async () => {
    renderHours();
    await screen.findByLabelText('Segunda, intervalo 1: abre às');

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar intervalo' }));
    const opens2 = screen.getByLabelText('Segunda, intervalo 2: abre às');
    fireEvent.change(opens2, { target: { value: '11:00' } });
    fireEvent.blur(opens2, { target: { value: '11:00' } });

    expect(await screen.findByText(/se sobrepõe ao das 08:00–12:00/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Salvar horários/ }));
    expect(await screen.findByText(/Corrija o horário abaixo para salvar/)).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('rejeita 24:00 como abertura e fechamento antes da abertura', async () => {
    renderHours();
    const opens = await screen.findByLabelText('Segunda, intervalo 1: abre às');
    fireEvent.change(opens, { target: { value: '24:00' } });
    fireEvent.blur(opens, { target: { value: '24:00' } });
    expect(await screen.findByText('24:00 só vale como fechamento.')).toBeInTheDocument();

    fireEvent.change(opens, { target: { value: '13:00' } });
    fireEvent.blur(opens, { target: { value: '13:00' } });
    expect(await screen.findByText('O fechamento precisa ser depois da abertura.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Salvar horários/ }));
    expect(api.put).not.toHaveBeenCalled();
  });

  it('salva { timezone, hours: [{ dayOfWeek, opensAt, closesAt }] } no PUT /pharmacy/me/hours', async () => {
    renderHours();
    await screen.findByLabelText('Segunda, intervalo 1: abre às');

    // Liga a terça (intervalo padrão 08:00–18:00) e encerra a segunda à meia-noite
    fireEvent.click(screen.getByRole('switch', { name: 'Terça' }));
    const closes = screen.getByLabelText('Segunda, intervalo 1: fecha às');
    fireEvent.change(closes, { target: { value: '2400' } });
    fireEvent.blur(closes, { target: { value: '2400' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar horários/ }));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(api.put).toHaveBeenCalledWith('/pharmacy/me/hours', {
      timezone: 'America/Sao_Paulo',
      hours: [
        { dayOfWeek: 1, opensAt: '08:00', closesAt: '24:00' },
        { dayOfWeek: 2, opensAt: '08:00', closesAt: '18:00' },
      ],
    });
  });

  it('"Copiar para dias úteis" replica o horário de segunda para terça a sexta', async () => {
    renderHours();
    await screen.findByLabelText('Segunda, intervalo 1: abre às');

    fireEvent.click(screen.getByRole('button', { name: 'Copiar o horário de segunda para os dias úteis' }));
    fireEvent.click(screen.getByRole('button', { name: /Salvar horários/ }));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    const [, body] = api.put.mock.calls[0];
    expect(body.hours).toEqual([1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, opensAt: '08:00', closesAt: '12:00' })));
  });

  it('mostra a mensagem de validação devolvida pelo servidor', async () => {
    api.put.mockRejectedValueOnce(apiError(400, 'OVERLAPPING_INTERVALS', 'Em segunda-feira, os intervalos 08:00–12:00 e 11:00–13:00 se sobrepõem.'));
    renderHours();
    await screen.findByLabelText('Segunda, intervalo 1: abre às');

    fireEvent.click(screen.getByRole('switch', { name: 'Terça' }));
    fireEvent.click(screen.getByRole('button', { name: /Salvar horários/ }));

    expect(await screen.findByText(/os intervalos 08:00–12:00 e 11:00–13:00 se sobrepõem/)).toBeInTheDocument();
  });
});

describe('Pharmacy Settings — perfil', () => {
  it('mostra CNPJ formatado e envia só os campos editáveis no PATCH /pharmacy/me', async () => {
    api.patch.mockImplementation((url, body) => Promise.resolve({ data: { ...ME, ...body } }));
    renderRoute(<Settings />, { url: '/pharmacy/settings' });

    expect(await screen.findByText('11.222.333/0001-81')).toBeInTheDocument();
    const area = screen.getByLabelText('Área de entrega');
    fireEvent.change(area, { target: { value: 'Zona Sul e Centro' } });

    const services = screen.getByLabelText('Serviços oferecidos');
    fireEvent.change(services, { target: { value: 'Florais' } });
    fireEvent.keyDown(services, { key: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: /Salvar perfil/ }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    const [url, body] = api.patch.mock.calls[0];
    expect(url).toBe('/pharmacy/me');
    expect(body).toEqual({
      phone: '11999990000',
      address: 'Rua das Flores, 100',
      city: 'São Paulo',
      state: 'SP',
      deliveryArea: 'Zona Sul e Centro',
      description: 'Manipulação magistral.',
      services: ['Dermatológicos', 'Florais'],
    });
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('cnpj');
    expect(body).not.toHaveProperty('email');
  });
});
