import { applyPageMeta, canonicalUrl, SITE_URL, DEFAULT_DESCRIPTION } from './seo';

const meta = (sel) => document.head.querySelector(sel)?.getAttribute('content');

describe('SEO por rota', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('gera canonical no domínio de produção, sem barra final', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
    expect(canonicalUrl('/pharmacies/')).toBe(`${SITE_URL}/pharmacies`);
  });

  it('atualiza título, descrição, canonical e OpenGraph da página', () => {
    applyPageMeta({ title: 'Central de ajuda · MedConnect', description: 'Ajuda.', pathname: '/help' });

    expect(document.title).toBe('Central de ajuda · MedConnect');
    expect(meta('meta[name="description"]')).toBe('Ajuda.');
    expect(meta('meta[property="og:title"]')).toBe('Central de ajuda · MedConnect');
    expect(meta('meta[property="og:url"]')).toBe(`${SITE_URL}/help`);
    expect(meta('meta[name="twitter:description"]')).toBe('Ajuda.');
    expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE_URL}/help`);
    expect(meta('meta[name="robots"]')).toMatch(/^index, follow/);
  });

  it('usa a descrição padrão e marca noindex quando pedido', () => {
    applyPageMeta({ title: '404', pathname: '/x', noindex: true });
    expect(meta('meta[name="description"]')).toBe(DEFAULT_DESCRIPTION);
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('reaproveita as tags existentes em vez de duplicar', () => {
    applyPageMeta({ title: 'A', pathname: '/' });
    applyPageMeta({ title: 'B', pathname: '/help' });
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });
});
