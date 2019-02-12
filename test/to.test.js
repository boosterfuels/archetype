'use strict';

const assert = require('assert');
const to = require('../src/to');

describe('to()', function() {
  it('handles strings', function() {
    assert.strictEqual(to('foo', 'string'), 'foo');
    assert.strictEqual(to(42, 'string'), '42');
    assert.strictEqual(to(void 0, 'string'), void 0);
    assert.strictEqual(to(null, 'string'), null);
  });

  it('handles numbers', function() {
    assert.strictEqual(to('42 ', 'number'), 42);
    assert.strictEqual(to(' 42', 'number'), 42);
    assert.strictEqual(to(new Date(1), 'number'), 1);
    assert.throws(() => to({ valueOf: () => '' }, 'number'), /Could not cast/i);
    assert.throws(() => to({ valueOf: () => null }, 'number'), /Could not cast/i);
    assert.strictEqual(to(void 0, 'string'), void 0);
    assert.strictEqual(to(null, 'string'), null);
  });
});
