/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Help from './Help';
import { ToastProvider } from '@/context/ToastContext';
import { api } from '@/services/api';

const mockAuth = { currentUser: null, userType: null, isAuthenticated: false };

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth,
  homeFor: () => '/',
  AuthProvider: ({ children }) => <>{children}</>,
}));

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  getSocket: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), emit: jest.fn(), on: jest.fn(), off: jest.fn() })),
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(),
}));

// jsdom não implementa a Web Animations API, usada pelo Animate UI (troca de valor do Select / Accordion)
beforeAll(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = function animate() {
      return { finished: Promise.resolve(), cancel() {}, finish() {}, play() {}, pause() {}, addEventListener() {}, removeEventListener() {} };
    };
  }
});

function renderHelp(path = '/help') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Help />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('Central de ajuda (/help)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockAuth, { currentUser: null, userType: null, isAuthenticated: false });
  });

  it('renderiza o FAQ agrupado pelos quatro temas', () => {
    renderHelp();
    expect(screen.getByRole('heading', { level: 1, name: /como podemos ajudar/i })).toBeInTheDocument();
    ['Pacientes', 'Farmácias', 'Privacidade e LGPD', 'Pagamento e entrega'].forEach((topic) => {
      expect(screen.getByRole('heading', { level: 3, name: topic })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /como envio minha receita/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /como faço o pagamento/i })).toBeInTheDocument();
  });

  it('abre a resposta ao clicar na pergunta', async () => {
    renderHelp();
    const trigger = screen.getByRole('button', { name: /como envio minha receita/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText(/JPG, PNG ou PDF de até 10 MB/i)).toBeInTheDocument();
  });

  it('é honesto sobre o pagamento: a MedConnect não processa pagamentos no piloto', async () => {
    renderHelp();
    fireEvent.click(screen.getByRole('button', { name: /como faço o pagamento/i }));
    expect(await screen.findByText(/não processa pagamentos/i)).toBeInTheDocument();
  });

  it('explica os direitos LGPD e aponta para o Centro de Privacidade', () => {
    renderHelp();
    expect(screen.getByRole('heading', { level: 2, name: /seus direitos sobre os seus dados/i })).toBeInTheDocument();
    expect(screen.getByText('Portabilidade')).toBeInTheDocument();
    // Visitante: precisa entrar para acessar o Centro de Privacidade
    expect(screen.getByRole('link', { name: /entrar para acessar/i })).toHaveAttribute('href', '/login');
  });

  it('paciente logado vê o atalho direto para /privacy-center', () => {
    Object.assign(mockAuth, { currentUser: { id: 'u1', name: 'Ana', email: 'ana@exemplo.com' }, userType: 'PATIENT', isAuthenticated: true });
    renderHelp();
    expect(screen.getByRole('link', { name: /abrir centro de privacidade/i })).toHaveAttribute('href', '/privacy-center');
  });

  it('mostra o formulário de contato com os campos obrigatórios', () => {
    renderHelp();
    const contact = document.getElementById('contato');
    expect(contact).not.toBeNull();
    const scope = within(contact);
    expect(scope.getByRole('heading', { name: /fale com a gente/i })).toBeInTheDocument();
    expect(scope.getByLabelText('Seu nome')).toBeInTheDocument();
    expect(scope.getByLabelText('E-mail para resposta')).toBeInTheDocument();
    expect(scope.getByLabelText('Título')).toBeInTheDocument();
    expect(scope.getByLabelText('Mensagem')).toBeInTheDocument();
    expect(scope.getByRole('button', { name: /enviar mensagem/i })).toBeDisabled();
  });

  it('pré-seleciona o assunto pela query string (?category=PRIVACY)', () => {
    renderHelp('/help?category=PRIVACY#contato');
    expect(screen.getByRole('combobox', { name: 'Assunto' })).toHaveTextContent('Privacidade e dados (LGPD)');
  });

  it('ignora categorias desconhecidas na query string', () => {
    renderHelp('/help?category=HACK');
    expect(screen.getByRole('combobox', { name: 'Assunto' })).toHaveTextContent('Dúvida geral');
  });

  it('envia o chamado para POST /support/tickets e mostra o protocolo', async () => {
    api.post.mockResolvedValueOnce({ data: { id: 't1', protocol: 'MC-20261112-ABCDE', status: 'OPEN', createdAt: new Date().toISOString() } });
    renderHelp('/help?category=PRIVACY');
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Maria Silva' } });
    fireEvent.change(screen.getByLabelText('E-mail para resposta'), { target: { value: 'maria@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Exportar meus dados' } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Gostaria de receber uma cópia dos meus dados.' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/support/tickets', expect.objectContaining({ category: 'PRIVACY', email: 'maria@exemplo.com' }))
    );
    expect(await screen.findByText('Mensagem enviada')).toBeInTheDocument();
    expect(await screen.findByText(/MC-20261112-ABCDE/, {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
