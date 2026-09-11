import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processStationsOffThread, terminateGeoWorker } from '../../../src/services/geoWorkerService.js';

describe('GeoWorkerService', () => {
  beforeEach(() => {
    terminateGeoWorker();
  });

  afterEach(() => {
    terminateGeoWorker();
    vi.restoreAllMocks();
  });

  it('processes stations directly via fallback when Worker is undefined', async () => {
    const originalWorker = global.Worker;
    delete global.Worker;

    const origin = { lat: 37.31, lng: 13.58 };
    const stations = [
      { id: 1, name: 'Close', lat: 37.311, lng: 13.581, currentPrice: 1.70 },
      { id: 2, name: 'Far', lat: 45.0, lng: 9.0, currentPrice: 1.50 }
    ];

    const results = await processStationsOffThread(stations, origin, 10);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(1);

    global.Worker = originalWorker;
  });

  it('dispatches to WebWorker and resolves on message', async () => {
    class MockWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
      }
      postMessage(data) {
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({
              data: {
                id: data.id,
                type: 'PROCESS_STATIONS_SUCCESS',
                results: [{ id: 99, dist: 1.2 }]
              }
            });
          }
        }, 10);
      }
      terminate() {}
    }

    const originalWorker = global.Worker;
    global.Worker = MockWorker;

    const results = await processStationsOffThread([{ id: 99 }], { lat: 40, lng: 10 }, 20);
    expect(results).toEqual([{ id: 99, dist: 1.2 }]);

    global.Worker = originalWorker;
  });

  it('handles worker error by terminating and rejecting pending requests', async () => {
    class ErrorWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
      }
      postMessage() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Error('Worker crashed'));
          }
        }, 10);
      }
      terminate() {}
    }

    const originalWorker = global.Worker;
    global.Worker = ErrorWorker;

    await expect(processStationsOffThread([{ id: 1 }], { lat: 40, lng: 10 }, 20))
      .rejects.toThrow('GeoWorker processing error');

    global.Worker = originalWorker;
  });

  it('falls back gracefully if Worker constructor throws exception', async () => {
    class ThrowingWorker {
      constructor() {
        throw new Error('SecurityException: Worker not allowed');
      }
    }

    const originalWorker = global.Worker;
    global.Worker = ThrowingWorker;

    const origin = { lat: 37.31, lng: 13.58 };
    const stations = [{ id: 1, name: 'Close', lat: 37.311, lng: 13.581, currentPrice: 1.70 }];

    const results = await processStationsOffThread(stations, origin, 10);
    expect(results).toHaveLength(1);

    global.Worker = originalWorker;
  });

  it('reuses existing worker instance across multiple calls and handles non-matching messages', async () => {
    let constructorCallCount = 0;
    let workerInstanceRef = null;

    class MultiWorker {
      constructor() {
        constructorCallCount++;
        this.onmessage = null;
        this.onerror = null;
        workerInstanceRef = this;
      }
      postMessage(data) {
        setTimeout(() => {
          if (this.onmessage) {
            // Send an unrelated event first
            this.onmessage({ data: { type: 'UNKNOWN_EVENT' } });
            // Send valid response
            this.onmessage({
              data: {
                id: data.id,
                type: 'PROCESS_STATIONS_SUCCESS',
                results: data.stations
              }
            });
          }
        }, 10);
      }
      terminate() {}
    }

    const originalWorker = global.Worker;
    global.Worker = MultiWorker;

    const res1 = await processStationsOffThread([{ id: 1 }], { lat: 40, lng: 10 }, 20);
    const res2 = await processStationsOffThread([{ id: 2 }], { lat: 40, lng: 10 }, 20);

    expect(constructorCallCount).toBe(1);
    expect(res1[0].id).toBe(1);
    expect(res2[0].id).toBe(2);

    // Call onmessage with empty/null event
    if (workerInstanceRef && workerInstanceRef.onmessage) {
      workerInstanceRef.onmessage({});
    }

    global.Worker = originalWorker;
  });
});
