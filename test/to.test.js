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
});
