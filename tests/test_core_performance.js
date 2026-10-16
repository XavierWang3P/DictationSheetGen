import assert from 'assert';
import {
  calculateWritingGridWidth,
  clearWritingGridMeasurementCache
} from '../src/core/writingGridWidth.js';

let canvasCreateCount = 0;
const previousDocument = globalThis.document;

globalThis.document = {
  createElement(tagName) {
    assert.equal(tagName, 'canvas');
    canvasCreateCount += 1;
    return {
      getContext() {
        return {
          font: '',
          measureText(text) {
            return { width: text.length * 10 };
          }
        };
      }
    };
  }
};

try {
  clearWritingGridMeasurementCache();
  const first = calculateWritingGridWidth({ text: 'apple', availableWidth: 300 });
  const second = calculateWritingGridWidth({ text: 'banana', availableWidth: 300 });
  const cached = calculateWritingGridWidth({ text: 'apple', availableWidth: 300 });

  assert.equal(canvasCreateCount, 1, '多次字宽测量应复用同一个 Canvas');
  assert.equal(first.measuredWidth, 50);
  assert.equal(second.measuredWidth, 60);
  assert.equal(cached.measuredWidth, 50);
  console.log('CORE_PERFORMANCE_TESTS_PASSED');
} finally {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
}
