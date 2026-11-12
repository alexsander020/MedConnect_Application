import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// jsdom não implementa SVGGeometryElement (usado pelo indicador animado do Checkbox do Animate UI)
if (typeof window !== 'undefined' && !window.SVGGeometryElement && window.SVGElement) {
  window.SVGGeometryElement = class SVGGeometryElement extends window.SVGElement {};
  global.SVGGeometryElement = window.SVGGeometryElement;
}

// O Motion usa a Web Animations API quando Element.prototype.animate existe e espera `onfinish`.
// Um stub que nunca dispara `onfinish` trava as saídas do AnimatePresence; este dispara no próximo tick.
if (typeof window !== 'undefined' && typeof Element !== 'undefined') {
  Element.prototype.animate = function animate() {
    let onfinish = null;
    const animation = {
      finished: Promise.resolve(),
      playState: 'finished',
      currentTime: 0,
      startTime: 0,
      effect: null,
      oncancel: null,
      cancel() {},
      finish() {
        if (typeof onfinish === 'function') onfinish({});
      },
      play() {},
      pause() {},
      commitStyles() {},
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(animation, 'onfinish', {
      configurable: true,
      get: () => onfinish,
      set: (fn) => {
        onfinish = fn;
        if (typeof fn === 'function') setTimeout(() => onfinish === fn && fn({}), 0);
      },
    });
    return animation;
  };
}

/** Renderiza com QueryClient isolado (sem retry) e roteador em memória */
export function renderPage(ui, { route = '/' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
}

/** api.get roteado por URL: { '/rota': dados | Error } */
export function routeGet(apiMock, routes) {
  apiMock.get.mockImplementation((url) => {
    const hit = routes[url];
    if (hit === undefined) return Promise.reject(Object.assign(new Error('not mocked'), { response: { status: 404, data: {} } }));
    if (hit instanceof Error) return Promise.reject(hit);
    return Promise.resolve({ data: typeof hit === 'function' ? hit() : hit });
  });
}
