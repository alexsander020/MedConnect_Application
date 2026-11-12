import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// APIs de navegador ausentes no jsdom, usadas por Radix UI, Motion e Animate UI
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
  class IO {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb?.([{ isIntersecting: true, target: el, intersectionRatio: 1 }]); }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  if (!window.IntersectionObserver) window.IntersectionObserver = IO;
  if (!global.IntersectionObserver) global.IntersectionObserver = IO;
  class RO { observe() {} unobserve() {} disconnect() {} }
  if (!window.ResizeObserver) window.ResizeObserver = RO;
  if (!global.ResizeObserver) global.ResizeObserver = RO;
  if (!window.scrollTo) window.scrollTo = () => {};
  window.scrollTo = () => {};
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};

  // jsdom não implementa SVGGeometryElement, usado pelos indicadores animados (Checkbox/Select) do Animate UI
  if (typeof window.SVGGeometryElement === 'undefined' && window.SVGElement) {
    window.SVGGeometryElement = class SVGGeometryElement extends window.SVGElement {};
  }
  // ...nem a Web Animations API (Element.animate). O Motion a usa quando existe e espera `onfinish`:
  // um stub que nunca dispara `onfinish` trava as saídas do AnimatePresence — este dispara no próximo tick.
  if (typeof Element.prototype.animate !== 'function') {
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
  if (typeof Element.prototype.getAnimations !== 'function') {
    Element.prototype.getAnimations = () => [];
  }
}
