import assert from 'node:assert/strict';
import vm from 'node:vm';
import { READABLE_STREAM_COMPAT_SOURCE } from '../scripts/readable-stream-compat.mjs';

class FakeReadableStream {
  constructor(values = []) {
    this._values = [...values];
    this.cancelled = false;
    this.released = false;
  }

  getReader() {
    const stream = this;
    return {
      async read() {
        if (!stream._values.length) return { done: true, value: undefined };
        return { done: false, value: stream._values.shift() };
      },
      async cancel() { stream.cancelled = true; },
      releaseLock() { stream.released = true; },
    };
  }
}

assert.equal(typeof FakeReadableStream.prototype.values, 'undefined');
assert.equal(typeof FakeReadableStream.prototype[Symbol.asyncIterator], 'undefined');

vm.runInNewContext(READABLE_STREAM_COMPAT_SOURCE, {
  ReadableStream: FakeReadableStream,
  Symbol,
  Object,
  Boolean,
  Promise,
});

assert.equal(typeof FakeReadableStream.prototype.values, 'function');
assert.equal(typeof FakeReadableStream.prototype[Symbol.asyncIterator], 'function');

const stream = new FakeReadableStream(['a', 'b']);
const seen = [];
for await (const value of stream) seen.push(value);
assert.deepEqual(seen, ['a', 'b']);
assert.equal(stream.cancelled, false);
assert.equal(stream.released, true);

const early = new FakeReadableStream([1, 2, 3]);
for await (const value of early) {
  assert.equal(value, 1);
  break;
}
assert.equal(early.cancelled, true);
assert.equal(early.released, true);

console.log('ReadableStream Safari compatibility: PASS');
