// tests/helpers.js — small helpers shared by the test files.

/** Replaces global fetch for one test; `t.mock` puts the real one back when the test ends. */
export function mockFetch(t, impl) {
  return t.mock.method(globalThis, 'fetch', impl);
}

/** A fetch Response-like object. */
export const jsonResponse = (data, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => data });

/**
 * A tiny stand-in for the browser (window, localStorage, sessionStorage, document.cookie) so code that
 * touches them can run under Node. Returns the fake window; call restore() when the test ends.
 */
export function installFakeBrowser({ hostname = 'www.example.com', blockStorage = false } = {}) {
  const makeStorage = () => {
    const data = new Map();
    return {
      getItem: (k) => {
        if (blockStorage) throw new Error('storage blocked');
        return data.has(k) ? data.get(k) : null;
      },
      setItem: (k, v) => {
        if (blockStorage) throw new Error('storage blocked');
        data.set(k, String(v));
      },
      removeItem: (k) => data.delete(k),
    };
  };
  const listeners = new Map();
  const win = {
    location: { hostname },
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    gtagCalls: [],
    addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) || []), fn]),
    removeEventListener: () => {},
    dispatchEvent: (event) => {
      (listeners.get(event.type) || []).forEach((fn) => fn(event));
      return true;
    },
    setTimeout: (fn) => {
      fn(); // run "later" work right away so tests don't wait
      return 0;
    },
  };
  win.gtag = (...args) => win.gtagCalls.push(args);

  const cookieWrites = [];
  const fakeDocument = {
    cookieWrites,
    get cookie() {
      return '_ga=1; _ga_ABC123=2; theme=dark';
    },
    set cookie(value) {
      cookieWrites.push(value);
    },
  };

  const saved = { window: globalThis.window, document: globalThis.document };
  globalThis.window = win;
  globalThis.document = fakeDocument;
  return {
    win,
    document: fakeDocument,
    restore() {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    },
  };
}
