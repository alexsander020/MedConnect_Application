import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Domínio canônico de produção. As URLs absolutas de SEO (canonical, OpenGraph, sitemap) apontam
 * sempre para cá, mesmo quando o site é servido de outro host (ex.: GitHub Pages).
 * Ao trocar de domínio, atualize também index.html e os arquivos de public/ (robots.txt, sitemap.xml, llms.txt).
 */
export const SITE_URL = 'https://medconnect-ashen.vercel.app';

export const DEFAULT_DESCRIPTION =
  'Envie sua receita uma vez e receba cotações de farmácias de manipulação credenciadas. Compare preço e prazo, escolha a proposta e acompanhe o pedido até a entrega.';

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** URL canônica: domínio de produção + caminho da rota (sem query string nem hash) */
export function canonicalUrl(pathname = '/') {
  const path = pathname && pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';
  return `${SITE_URL}${path}`;
}

/**
 * Título, descrição, canonical e OpenGraph/Twitter da página atual.
 * `noindex` marca páginas que não devem aparecer em buscadores (ex.: 404).
 */
export function applyPageMeta({ title, description = DEFAULT_DESCRIPTION, pathname = '/', noindex = false }) {
  const url = canonicalUrl(pathname);
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertCanonical(url);
}

export function usePageMeta({ title, description, noindex = false }) {
  const { pathname } = useLocation();
  useEffect(() => {
    applyPageMeta({ title, description, pathname, noindex });
  }, [title, description, pathname, noindex]);
}
