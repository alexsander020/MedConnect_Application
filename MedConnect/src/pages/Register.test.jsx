/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Register from './Register';
import * as AuthContext from '../context/AuthContext';
import { api } from '../services/api';

jest.mock('../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  getSocket: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), emit: jest.fn(), on: jest.fn(), off: jest.fn() })),
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(),
}));

// jsdom não implementa SVGGeometryElement, usado pelos indicadores animados (Checkbox/Select) do Animate UI
if (typeof window.SVGGeometryElement === 'undefined') {
  window.SVGGeometryElement = class SVGGeometryElement extends window.SVGElement {};
}
// ...nem a Web Animations API (Element.animate), usada na lista do Select do Animate UI
if (typeof Element.prototype.animate !== 'function') {
  Element.prototype.animate = function animate() {
    return {
      finished: Promise.resolve(),
      playState: 'finished',
      currentTime: 0,
      effect: null,
      cancel() {},
      finish() {},
      play() {},
      pause() {},
      addEventListener() {},
      removeEventListener() {},
    };
  };
}
if (typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = () => [];
}

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const CONSENT = {
  type: 'HEALTH_DATA_PROCESSING',
  version: 'v1.0.0',
  title: 'Consentimento para Tratamento de Dados Pessoais Sensíveis de Saúde',
  text: 'Autorizo expressamente a plataforma MedConnect a tratar meus dados de saúde para cotação.',
};

describe('Register (Testing Library)', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      register: mockRegister,
      currentUser: null,
    });
    api.get.mockImplementation((url) =>
      url === '/consent/terms'
        ? Promise.resolve({ data: { currentHealthConsent: CONSENT, activeVersions: {} } })
        : Promise.reject(new Error('unexpected'))
    );
  });

  const renderComponent = (entry = '/register') => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <Register />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const next = () => fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  const fillPatientStep1 = (email = 'paciente@medconnect.com') => {
    type('Nome completo', 'Paciente Teste');
    type('E-mail', email);
    type('Crie uma senha', 'SenhaForte#123');
    next();
  };

  const fillPatientStep2 = () => {
    type('Telefone ou WhatsApp', '11988887777');
    type('CPF', '11144477735');
    type('Endereço de entrega', 'Rua das Flores, 123');
    next();
  };

  /** Abre um Select (Radix) pelo teclado e escolhe a opção */
  const pickUf = async (label, sigla) => {
    const trigger = screen.getByRole('combobox', { name: label });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: new RegExp(`^${sigla} —`) }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: label })).toHaveTextContent(sigla));
  };

  it('deve renderizar o passo 1 com nome, e-mail, senha e o indicador de etapas', () => {
    renderComponent();

    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Crie uma senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /etapas do cadastro/i })).toHaveTextContent(/passo 1 de 3/i);
    expect(screen.getByRole('tab', { name: /sou paciente/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('deve validar e-mail inválido e senha fraca no passo 1', () => {
    renderComponent();

    type('Nome completo', 'Paciente Teste');
    type('E-mail', 'email-errado');
    type('Crie uma senha', 'fraca');
    next();

    expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument();
    expect(screen.getByText(/a senha deve ter 8\+ caracteres/i)).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument(); // continua no passo 1
  });

  it('deve avançar para o passo 2 com dados válidos e validar o CPF', async () => {
    renderComponent();
    fillPatientStep1();

    expect(await screen.findByText(/dados pessoais e de entrega/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone ou WhatsApp')).toHaveFocus();

    type('Telefone ou WhatsApp', '11988887777');
    type('CPF', '111.111.111-11');
    type('Endereço de entrega', 'Rua das Flores, 123');
    next();

    expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument();
    expect(screen.getByLabelText('CPF')).toHaveAttribute('aria-invalid', 'true');
  });

  it('deve aplicar as máscaras de telefone e CPF', async () => {
    renderComponent();
    fillPatientStep1();
    await screen.findByLabelText('CPF');

    type('Telefone ou WhatsApp', '11988887777');
    type('CPF', '11144477735');
    expect(screen.getByLabelText('Telefone ou WhatsApp')).toHaveValue('(11) 98888-7777');
    expect(screen.getByLabelText('CPF')).toHaveValue('111.444.777-35');
  });

  it('deve exigir os Termos e o consentimento de dados de saúde (texto vindo da API)', async () => {
    renderComponent();
    fillPatientStep1();
    await screen.findByLabelText('CPF');
    fillPatientStep2();

    expect(await screen.findByText(CONSENT.title)).toBeInTheDocument();
    expect(screen.getByText(CONSENT.text)).toBeInTheDocument();
    expect(screen.getByText('Versão v1.0.0')).toBeInTheDocument();
    const termsLink = screen.getByRole('link', { name: /termos de uso \(abre em nova aba\)/i });
    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(termsLink).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /política de privacidade \(abre em nova aba\)/i })).toHaveAttribute(
      'href',
      '/privacy'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByText(/aceite os termos de uso e a política de privacidade/i)).toBeInTheDocument();
    expect(screen.getByText(/é obrigatório consentir com o tratamento de dados de saúde/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /li e aceito os termos/i })).toHaveFocus();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('deve usar um texto de consentimento resumido quando a API de termos falhar', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    renderComponent();
    fillPatientStep1();
    await screen.findByLabelText('CPF');
    fillPatientStep2();

    expect(await screen.findByText(/art\. 11, I, da LGPD/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /autorizo o tratamento dos meus dados de saúde/i })).toBeInTheDocument();
  });

  it('deve concluir o cadastro do paciente com o payload completo e ir para o login', async () => {
    mockRegister.mockResolvedValueOnce({ id: 'u1' });
    renderComponent();
    fillPatientStep1();
    await screen.findByLabelText('CPF');
    fillPatientStep2();
    await screen.findByText(CONSENT.title);

    fireEvent.click(screen.getByRole('checkbox', { name: /li e aceito os termos/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /autorizo o tratamento dos meus dados de saúde/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        {
          name: 'Paciente Teste',
          email: 'paciente@medconnect.com',
          password: 'SenhaForte#123',
          phone: '(11) 98888-7777',
          address: 'Rua das Flores, 123',
          cpf: '11144477735',
          healthConsent: true,
          termsAccepted: true,
        },
        'patient'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: { email: 'paciente@medconnect.com' },
      });
    });
  });

  it('deve exibir mensagem de erro da API quando o cadastro for rejeitado', async () => {
    mockRegister.mockRejectedValueOnce(new Error('E-mail já cadastrado na plataforma.'));
    renderComponent();
    fillPatientStep1('duplicado@medconnect.com');
    await screen.findByLabelText('CPF');
    fillPatientStep2();
    await screen.findByText(CONSENT.title);

    fireEvent.click(screen.getByRole('checkbox', { name: /li e aceito os termos/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /autorizo o tratamento dos meus dados de saúde/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/e-mail já cadastrado na plataforma/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('deve voltar ao campo de e-mail quando a API responder EMAIL_ALREADY_EXISTS', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { status: 409, data: { error: { code: 'EMAIL_ALREADY_EXISTS', message: 'E-mail já está cadastrado.' } } },
    });
    renderComponent();
    fillPatientStep1();
    await screen.findByLabelText('CPF');
    fillPatientStep2();
    await screen.findByText(CONSENT.title);
    fireEvent.click(screen.getByRole('checkbox', { name: /li e aceito os termos/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /autorizo o tratamento dos meus dados de saúde/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    const email = await screen.findByLabelText('E-mail');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(email).toHaveFocus());
    expect(screen.getAllByText(/este e-mail já está cadastrado/i).length).toBeGreaterThan(0);
  });

  it('deve abrir o formulário de farmácia com ?type=pharmacy e enviar o credenciamento completo', async () => {
    mockRegister.mockResolvedValueOnce({ id: 'f1' });
    renderComponent('/register?type=pharmacy');

    expect(screen.getByRole('tab', { name: /sou farmácia/i })).toHaveAttribute('aria-selected', 'true');
    type('Nome fantasia da farmácia', 'Farmácia Teste');
    type('E-mail da farmácia', 'contato@farmaciateste.com.br');
    type('Crie uma senha', 'SenhaForte#123');
    next();

    // Passo 2 — dados da farmácia
    await screen.findByLabelText('CNPJ');
    next();
    expect(screen.getByText(/cnpj inválido/i)).toBeInTheDocument();
    expect(screen.getByText('Selecione a UF.')).toBeInTheDocument();

    type('CNPJ', '11222333000181');
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11.222.333/0001-81');
    type('Telefone ou WhatsApp', '1134567890');
    type('Endereço da farmácia', 'Rua Augusta, 500');
    type('Cidade', 'São Paulo');
    await pickUf('UF', 'SP');
    fireEvent.click(screen.getByRole('radio', { name: '15 km' }));
    next();

    // Passo 3 — regularidade e responsável técnico
    await screen.findByLabelText('Licença sanitária');
    fireEvent.click(screen.getByRole('button', { name: /enviar para análise/i }));
    expect(screen.getByText(/aceite o termo de adesão/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Licença sanitária')).toHaveFocus();
    expect(mockRegister).not.toHaveBeenCalled();

    type('Licença sanitária', 'LS-2024-001');
    type('AFE (Anvisa)', '1.23456.7');
    type('Farmacêutico(a) responsável técnico(a)', 'Ana Souza');
    type('Inscrição no CRF', '12345');
    await pickUf('UF do CRF', 'SP');
    type('Link dos documentos (opcional)', 'ftp://invalido');
    fireEvent.click(screen.getByRole('checkbox', { name: /termo de adesão/i }));
    expect(screen.getByRole('link', { name: /termo de adesão para farmácias/i })).toHaveAttribute('href', '/pharmacy-terms');
    fireEvent.click(screen.getByRole('button', { name: /enviar para análise/i }));
    expect(screen.getByText(/informe um link válido/i)).toBeInTheDocument();

    type('Link dos documentos (opcional)', 'https://drive.example.com/pasta');
    fireEvent.click(screen.getByRole('button', { name: /enviar para análise/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        {
          name: 'Farmácia Teste',
          email: 'contato@farmaciateste.com.br',
          password: 'SenhaForte#123',
          phone: '(11) 3456-7890',
          address: 'Rua Augusta, 500',
          cnpj: '11222333000181',
          deliveryArea: '15',
          city: 'São Paulo',
          state: 'SP',
          sanitaryLicense: 'LS-2024-001',
          operatingAuth: '1.23456.7',
          technicalResponsibleName: 'Ana Souza',
          technicalResponsibleCrf: '12345',
          technicalResponsibleUf: 'SP',
          documentUrl: 'https://drive.example.com/pasta',
          termsAccepted: true,
        },
        'pharmacy'
      );
    });

    // Explica a verificação pendente antes de liberar cotações
    expect(await screen.findByRole('heading', { name: /sua farmácia está em análise/i })).toBeInTheDocument();
    expect(screen.getByText(/verificação pendente/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /entrar no painel da farmácia/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login?type=pharmacy', {
      replace: true,
      state: { email: 'contato@farmaciateste.com.br' },
    });
  });
});
