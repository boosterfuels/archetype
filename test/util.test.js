'use strict';

const assert = require('assert');
const shouldSkipPath = require('../src/util').shouldSkipPath;

describe('shouldSkipPath', function() {
  it('returns false for __proto__', function() {
    assert.ok(!shouldSkipPath({}, '__proto__'));
  });
});