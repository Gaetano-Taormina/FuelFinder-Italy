import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker, unregisterServiceWorker } from '../../../src/services/swRegistration.js';

describe('Service Worker Registration Service', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete window.__ENABLE_SW__;
  });

  it('returns null if navigator does not support serviceWorker', async () => {
    const originalSW = navigator.serviceWorker;
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true
    });

    const result = await registerServiceWorker();
    expect(result).toBeNull();

    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalSW,
      configurable: true
    });
  });

  it('registers service worker in production or when __ENABLE_SW__ is true', async () => {
    window.__ENABLE_SW__ = true;
    const mockRegistration = {
      onupdatefound: null,
      installing: {
        state: 'installing',
        onstatechange: null
      }
    };

    const registerMock = vi.fn().mockResolvedValue(mockRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: registerMock,
        controller: {}
      },
      configurable: true
    });

    const reg = await registerServiceWorker();
    expect(reg).toBe(mockRegistration);
    expect(registerMock).toHaveBeenCalledWith('/sw.js', { scope: '/' });

    // Trigger updatefound and statechange
    if (typeof mockRegistration.onupdatefound === 'function') {
      mockRegistration.onupdatefound();
      mockRegistration.installing.state = 'installing';
      if (typeof mockRegistration.installing.onstatechange === 'function') {
        mockRegistration.installing.onstatechange();
      }
      mockRegistration.installing.state = 'installed';
      if (typeof mockRegistration.installing.onstatechange === 'function') {
        mockRegistration.installing.onstatechange();
      }
    }
  });

  it('handles updatefound when installing worker is null or without controller', async () => {
    window.__ENABLE_SW__ = true;
    const mockRegistration = {
      onupdatefound: null,
      installing: null
    };

    const registerMock = vi.fn().mockResolvedValue(mockRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: registerMock,
        controller: null
      },
      configurable: true
    });

    await registerServiceWorker();
    if (typeof mockRegistration.onupdatefound === 'function') {
      mockRegistration.onupdatefound();
    }
  });

  it('handles registration failure gracefully', async () => {
    window.__ENABLE_SW__ = true;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const registerMock = vi.fn().mockRejectedValue(new Error('SW failed'));
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: registerMock
      },
      configurable: true
    });

    const reg = await registerServiceWorker();
    expect(reg).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('unregisters active service worker safely', async () => {
    const unregisterMock = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          unregister: unregisterMock
        })
      },
      configurable: true
    });

    const result = await unregisterServiceWorker();
    expect(result).toBe(true);
    expect(unregisterMock).toHaveBeenCalled();
  });

  it('handles unregister error safely', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.reject(new Error('Cannot unregister'))
      },
      configurable: true
    });

    const result = await unregisterServiceWorker();
    expect(result).toBe(false);
  });

  it('returns false when unregistering without serviceWorker support', async () => {
    const originalSW = navigator.serviceWorker;
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true
    });

    const result = await unregisterServiceWorker();
    expect(result).toBe(false);

    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalSW,
      configurable: true
    });
  });

  it('returns null/false when window is undefined (SSR environment)', async () => {
    const originalWindow = globalThis.window;
    // @ts-ignore
    delete globalThis.window;

    expect(await registerServiceWorker()).toBeNull();
    expect(await unregisterServiceWorker()).toBe(false);

    globalThis.window = originalWindow;
  });
});
