import { stripSensitiveUrlParts } from './analytics';

describe('stripSensitiveUrlParts (Vercel Analytics)', () => {
  it('remove tokens da query string e o hash, mantendo o caminho', () => {
    const event = { type: 'pageview', url: 'https://medconnect-ashen.vercel.app/redefinir-senha?token=abc123&email=a%40b.com#topo' };
    expect(stripSensitiveUrlParts(event)).toEqual({ type: 'pageview', url: 'https://medconnect-ashen.vercel.app/redefinir-senha' });
  });

  it('descarta o evento quando a URL é inválida', () => {
    expect(stripSensitiveUrlParts({ type: 'pageview', url: 'não é url' })).toBeNull();
  });
});
