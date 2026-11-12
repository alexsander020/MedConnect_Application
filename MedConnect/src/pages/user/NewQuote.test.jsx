/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import NewQuote from './NewQuote';
import { api } from '../../services/api';
import { renderPage, routeGet } from './test-utils';

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), defaults: { baseURL: 'http://localhost:3000/api' } },
  getSocket: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn(), emit: jest.fn() })),
}));

const TERMS = {
  activeVersions: {
    PRESCRIPTION_UPLOAD: {
      type: 'PRESCRIPTION_UPLOAD',
      version: 'v1.0.0',
      title: 'Consentimento Específico para Envio e Análise de Receita Médica',
      text: 'Autorizo expressamente a plataforma MedConnect a tratar meus dados de saúde.',
    },
  },
};

const pngFile = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'receita.png', { type: 'image/png' });

function selectFile(container, file) {
  const input = container.querySelector('#gallery-upload');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('NewQuote (envio de receita)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routeGet(api, { '/consent/terms': TERMS, '/consent/status': { hasActiveHealthConsent: false, isRevoked: false, history: [] } });
  });

  it('mantém as âncoras do fluxo (input #gallery-upload, textarea e botão de envio)', async () => {
    const { container } = renderPage(<NewQuote />);
    expect(container.querySelector('#gallery-upload')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Observações/i }).tagName).toBe('TEXTAREA');
    expect(screen.getByRole('button', { name: /Solicitar orçamento agora/i })).toBeInTheDocument();
    expect(await screen.findByText(/Autorizo expressamente a plataforma MedConnect/)).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('exige o consentimento antes de enviar e não chama a API', async () => {
    const { container } = renderPage(<NewQuote />);
    selectFile(container, pngFile());
    expect(await screen.findByText('receita.png')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Solicitar orçamento agora/i }));

    expect(await screen.findByText(/marque a autorização de uso dos dados de saúde/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Autorizo o tratamento dos dados de saúde/i })).toHaveAttribute('aria-invalid', 'true');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejeita arquivos que não são PDF, JPG ou PNG', async () => {
    const { container } = renderPage(<NewQuote />);
    selectFile(container, new File(['texto'], 'receita.txt', { type: 'text/plain' }));

    expect(await screen.findByText(/Formato não aceito/i)).toBeInTheDocument();
    expect(screen.queryByText('receita.txt')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo o tratamento dos dados de saúde/i }));
    fireEvent.click(screen.getByRole('button', { name: /Solicitar orçamento agora/i }));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejeita arquivos acima de 10 MB', async () => {
    const { container } = renderPage(<NewQuote />);
    const big = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    selectFile(container, big);
    expect(await screen.findByText(/O limite é de 10 MB/i)).toBeInTheDocument();
  });

  it('envia FormData com file, consent e notes e mostra a confirmação', async () => {
    api.post.mockResolvedValueOnce({ data: { id: 'p1', status: 'PENDING' } });
    const { container } = renderPage(<NewQuote />);
    const file = pngFile();
    selectFile(container, file);
    fireEvent.change(screen.getByRole('textbox', { name: /Observações/i }), { target: { value: 'Cápsula vegetal' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo o tratamento dos dados de saúde/i }));
    fireEvent.click(screen.getByRole('button', { name: /Solicitar orçamento agora/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe('/prescriptions');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(body.get('consent')).toBe('true');
    expect(body.get('notes')).toBe('Cápsula vegetal');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');

    expect(await screen.findByRole('heading', { name: 'Receita enviada!' })).toBeInTheDocument();
  });

  it('mostra o estado do consentimento quando o servidor responde CONSENT_REQUIRED', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 403, data: { error: { code: 'CONSENT_REQUIRED', message: 'Consentimento obrigatório' } } } });
    const { container } = renderPage(<NewQuote />);
    selectFile(container, pngFile());
    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo o tratamento dos dados de saúde/i }));
    fireEvent.click(screen.getByRole('button', { name: /Solicitar orçamento agora/i }));

    expect(await screen.findByText(/marque a autorização de uso dos dados de saúde/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Receita enviada!' })).toBeNull();
  });
});
