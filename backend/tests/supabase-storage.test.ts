/**
 * Supabase Storage (receitas): upload privado e URL assinada via API REST.
 * O fetch é simulado — nenhum tráfego sai do teste.
 */
describe('Supabase Storage de receitas', () => {
  const ORIGINAL_ENV = { ...process.env };
  const fetchMock = jest.fn();

  function loadModule() {
    let mod: typeof import('../src/services/storage/supabaseStorage');
    jest.isolateModules(() => {
      mod = require('../src/services/storage/supabaseStorage');
    });
    return mod!;
  }

  beforeEach(() => {
    jest.resetModules();
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    process.env.SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co/';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_only';
    process.env.SUPABASE_STORAGE_BUCKET = 'prescriptions';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('fica desligado sem a chave secreta', () => {
    delete process.env.SUPABASE_SECRET_KEY;
    expect(loadModule().isSupabaseStorageConfigured()).toBe(false);
  });

  it('envia o arquivo ao bucket privado sem upsert e devolve o identificador supabase://', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ Key: 'prescriptions/abc.pdf' }) });
    const { uploadToSupabaseStorage } = loadModule();

    const id = await uploadToSupabaseStorage('abc.pdf', Buffer.from('%PDF-1.4'), 'application/pdf');

    expect(id).toBe('supabase://abc.pdf');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://abcdefghijklmnop.supabase.co/storage/v1/object/prescriptions/abc.pdf');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      apikey: 'sb_secret_test_only',
      Authorization: 'Bearer sb_secret_test_only',
      'Content-Type': 'application/pdf',
      'x-upsert': 'false'
    });
  });

  it('converte falha do Storage em UPLOAD_FAILED sem vazar detalhes', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: 'detalhe interno' }) });
    const { uploadToSupabaseStorage } = loadModule();

    await expect(uploadToSupabaseStorage('abc.pdf', Buffer.from('x'), 'application/pdf')).rejects.toMatchObject({
      status: 500,
      code: 'UPLOAD_FAILED'
    });
  });

  it('gera URL assinada absoluta com a expiração pedida', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ signedURL: '/object/sign/prescriptions/abc.pdf?token=tok' })
    });
    const { createSupabaseSignedUrl } = loadModule();

    const url = await createSupabaseSignedUrl('supabase://abc.pdf', 300);

    expect(url).toBe('https://abcdefghijklmnop.supabase.co/storage/v1/object/sign/prescriptions/abc.pdf?token=tok');
    const [signUrl, init] = fetchMock.mock.calls[0];
    expect(signUrl).toBe('https://abcdefghijklmnop.supabase.co/storage/v1/object/sign/prescriptions/abc.pdf');
    expect(JSON.parse(init.body)).toEqual({ expiresIn: 300 });
  });

  it('falha com SIGNED_URL_FAILED quando o Storage não devolve a URL', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const { createSupabaseSignedUrl } = loadModule();

    await expect(createSupabaseSignedUrl('supabase://abc.pdf', 300)).rejects.toMatchObject({
      code: 'SIGNED_URL_FAILED'
    });
  });
});
