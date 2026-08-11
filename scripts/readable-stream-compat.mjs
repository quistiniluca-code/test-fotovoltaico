export const READABLE_STREAM_COMPAT_MARKER = 'ECON_READABLE_STREAM_ASYNC_ITERATION_COMPAT';

export const READABLE_STREAM_COMPAT_SOURCE = `/* ${READABLE_STREAM_COMPAT_MARKER} */
(() => {
  if (typeof ReadableStream === 'undefined') return;
  const proto = ReadableStream.prototype;
  const asyncIterator = typeof Symbol !== 'undefined' ? Symbol.asyncIterator : null;

  if (typeof proto.values !== 'function') {
    Object.defineProperty(proto, 'values', {
      configurable: true,
      writable: true,
      value: async function* values(options = {}) {
        const reader = this.getReader();
        const preventCancel = Boolean(options && options.preventCancel);
        let completed = false;
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) {
              completed = true;
              return;
            }
            yield result.value;
          }
        } finally {
          if (!completed && !preventCancel) {
            try { await reader.cancel(); } catch {}
          }
          try { reader.releaseLock(); } catch {}
        }
      },
    });
  }

  if (asyncIterator && typeof proto[asyncIterator] !== 'function') {
    Object.defineProperty(proto, asyncIterator, {
      configurable: true,
      writable: true,
      value: function readableStreamAsyncIterator() {
        return this.values();
      },
    });
  }
})();
`;
