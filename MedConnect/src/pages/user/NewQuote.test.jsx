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

describe('NewQuote — vertical veterinária (VET_ENABLED)', () => {
  const PETS = [{ id: 'pet-1', name: 'Thor', species: 'DOG', breed: 'Labrador', weightGrams: 15000 }];
  const consentStatus = { hasActiveHealthConsent: false, isRevoked: false, history: [] };
  const vetRoutes = (config = {}, pets = PETS) => ({
    '/consent/terms': TERMS,
    '/consent/status': consentStatus,
    '/config': { vetEnabled: true, vetAllowFoodProducing: false, vetControlledEnabled: false, ...config },
    '/animals': pets,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function switchToPet() {
    fireEvent.click(await screen.findByRole('button', { name: /Para meu pet/i }));
    return screen.findByRole('combobox', { name: /Animal/i });
  }

  it('com a vertical desligada, não mostra o seletor "Para mim / Para meu pet" nem campos veterinários', async () => {
    routeGet(api, { '/consent/terms': TERMS, '/consent/status': consentStatus, '/config': { vetEnabled: false } });
    renderPage(<NewQuote />);
    expect(await screen.findByText(/Autorizo expressamente a plataforma MedConnect/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Para meu pet/i })).toBeNull();
    expect(screen.queryByLabelText(/CRMV do prescritor/i)).toBeNull();
    expect(screen.getByRole('heading', { name: /Receita médica/i })).toBeInTheDocument();
  });

  it('com a vertical ligada, mostra o seletor e mantém "Para mim" como padrão', async () => {
    routeGet(api, vetRoutes());
    renderPage(<NewQuote />);
    expect(await screen.findByRole('button', { name: /Para mim/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Para meu pet/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText(/CRMV do prescritor/i)).toBeNull();
  });

  it('"Para meu pet" mostra o animal, os dados do prescritor e o aviso regulatório', async () => {
    routeGet(api, vetRoutes());
    renderPage(<NewQuote />);
    const petSelect = await switchToPet();

    expect(await screen.findByRole('option', { name: /Thor · Cão · 15 kg/ })).toBeInTheDocument();
    expect(petSelect).toHaveAttribute('id', 'pet-select');
    expect(screen.getByPlaceholderText(/Mariana Costa/)).toBeInTheDocument();
    expect(screen.getByLabelText(/CRMV do prescritor/i)).toBeInTheDocument();
    expect(screen.getByText(/não substitui a orientação do médico veterinário/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Receita veterinária/i })).toBeInTheDocument();
    // Sem a flag de controlados, só a receita magistral fica disponível
    expect(screen.queryByRole('option', { name: /Notificação de receita controlada/i })).toBeNull();
  });

  it('abre direto em "Para meu pet" quando a navegação pede a cotação veterinária', async () => {
    routeGet(api, vetRoutes());
    renderPage(<NewQuote />, { route: { pathname: '/new-quote', state: { kind: 'VETERINARY' } } });
    expect(await screen.findByRole('button', { name: /Para meu pet/i })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByLabelText(/CRMV do prescritor/i)).toBeInTheDocument();
  });

  it('bloqueia o envio com CRMV inválido e não chama a API', async () => {
    routeGet(api, vetRoutes());
    const { container } = renderPage(<NewQuote />);
    const petSelect = await switchToPet();
    await screen.findByRole('option', { name: /Thor/ });

    fireEvent.change(petSelect, { target: { value: 'pet-1' } });
    fireEvent.change(screen.getByLabelText(/Nome do médico veterinário/i), { target: { value: 'Dr. Roberto Santos' } });
    fireEvent.change(screen.getByLabelText(/CRMV do prescritor/i), { target: { value: 'CRMV-INVALIDO' } });
    fireEvent.change(screen.getByLabelText(/UF do CRMV/i), { target: { value: 'SP' } });
    selectFile(container, pngFile());
    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo o tratamento dos dados desta receita veterinária/i }));
    fireEvent.click(screen.getByRole('button', { name: /Solicitar orçamento agora/i }));

    expect(await screen.findByText(/Informe um CRMV válido para a UF selecionada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CRMV do prescritor/i)).toHaveAttribute('aria-invalid', 'true');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('exige animal, prescritor e UF antes de enviar', async () => {
    routeGet(api, vetRoutes());
    const { container } = renderPage(<NewQuote />);
    await switchToPet();
    await screen.findByRole('option', { name: /Thor/ });
    selectFile(container, pngFile());
    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo o tratamento dos dados desta receita veterinária/i }));
    fireEvent.click(screen.getByRole('button', { name: /Solicitar orçamento agora/i }));

    expect(await screen.findByText(/Selecione para qual animal é a receita/i)).toBeInTheDocument();
    expect(screen.getByText(/Informe o nome do médico veterinário/i)).toBeInTheDocument();
    expect(screen.getByText(/Selecione a UF do CRMV/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('envia a receita veterinária com kind, animal, prescritor e preferências nas observações', async () => {
    routeGet(api, vetRoutes());
    api.post.mockResolvedValueOnce({ data: { id: 'p-vet', status: 'PENDING', kind: 'VETERINARY' } });
    const { container } = renderPage(<NewQuote />);
    const petSelect = await switchToPet();
    await screen.findByRole('option', { name: /Thor/ });

    fireEvent.change(petSelect, { target: { value: 'pet-1' } });
    fireEvent.change(screen.getByLabelText(/Nome do médico veterinário/i), { target: { value: 'Dra. Camila Nogueira' } });
    fireEvent.change(screen.getByLabelText(/CRMV do prescritor/i), { target: { value: '54321' } });
    fireEvent.change(screen.getByLabelText(/UF do CRMV/i), { target: { value: 'SP' } });
    fireEvent.change(screen.getByLabelText(/Forma farmacêutica/i), { target: { value: 'BISCOITO_MEDICAMENTOSO' } });
    fireEvent.change(screen.getByLabelText(/Sabor ou aromatização/i), { target: { value: 'carne' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Observações/i }), { target: { value: 'Dar após a refeição' } });
    selectFile(container, pngFile());
    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo o tratamento dos dados desta receita veterinária/i }));
    fireEvent.click(screen.getByRole('button', { name: /Solicitar orçamento agora/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/prescriptions');
    expect(body.get('kind')).toBe('VETERINARY');
    expect(body.get('petId')).toBe('pet-1');
    expect(body.get('prescriberName')).toBe('Dra. Camila Nogueira');
    expect(body.get('prescriberCrmv')).toBe('54321');
    expect(body.get('prescriberUf')).toBe('SP');
    expect(body.get('vetDocumentType')).toBe('MAGISTRAL');
    expect(body.get('controlledNotificationNumber')).toBeNull();
    expect(body.get('consent')).toBe('true');
    expect(body.get('notes')).toBe('Dar após a refeição\nForma farmacêutica preferida: Biscoito medicamentoso\nSabor/aromatização: carne');
    expect(await screen.findByRole('heading', { name: 'Receita enviada!' })).toBeInTheDocument();
  });

  it('com controlados habilitados, exige o número da notificação de receita', async () => {
    routeGet(api, vetRoutes({ vetControlledEnabled: true }));
    renderPage(<NewQuote />);
    await switchToPet();
    await screen.findByRole('option', { name: /Thor/ });

    fireEvent.change(screen.getByLabelText(/Tipo de receita/i), { target: { value: 'CONTROLLED_NOTIFICATION' } });
    const numberField = await screen.findByLabelText(/Número da notificação de receita/i);
    expect(numberField).toHaveAttribute('placeholder', 'Ex.: NOT-2026-98765');

    fireEvent.click(screen.getByRole('button', { name: /Solicitar orçamento agora/i }));
    expect(await screen.findByText(/Informe o número da notificação de receita/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sem pets cadastrados, leva o tutor ao cadastro', async () => {
    routeGet(api, vetRoutes({}, []));
    renderPage(<NewQuote />);
    fireEvent.click(await screen.findByRole('button', { name: /Para meu pet/i }));
    expect(await screen.findByText(/Você ainda não cadastrou nenhum pet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cadastrar pet/i })).toHaveAttribute('href', '/my-pets');
  });
});

