import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Helpers dos testes da área da farmácia.
 * O Select do Animate UI anima a troca de valor com a Web Animations API (Element.animate),
 * que o jsdom não implementa — instalamos um stub mínimo aqui.
 */
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    return { cancel() {}, finish() {}, finished: Promise.resolve(), onfinish: null };
  };
}

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

/** Renderiza `ui` numa rota (`path`) a partir de `url`, com React Query isolado */
export function renderRoute(ui, { url = '/', path = '*' } = {}) {
  const queryClient = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...result, queryClient };
}

/** Resposta de erro no formato da API ({ error: { code, message } }) */
export function apiError(status, code, message = 'Erro') {
  const err = new Error(message);
  err.response = { status, data: { error: { code, message } } };
  return err;
}
