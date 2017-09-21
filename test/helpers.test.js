'use strict';

const assert = require('assert');
const matchType = require('../').matchType;

describe('matchType', function() {
  it('works with JSON.parse()', function() {
    const parse = matchType({ string: JSON.parse });

    const obj = { hello: 'world' };

    // If given a string, will parse it
    assert.deepEqual(parse(JSON.stringify(obj)), obj);

    // If not, will do nothing
    assert.strictEqual(parse(obj), obj);
    assert.strictEqual(parse(null), null);
    assert.strictEqual(parse(undefined), undefined);
  });

  it('works with trimming strings', function() {
    const trim = matchType({ string: str => str.trim() });

    // If given a string, will trim it
    assert.equal(trim('  abc '), 'abc');
    assert.equal(trim('abc'), 'abc');

    // If not, will do nothing
    const obj = {};
    assert.strictEqual(trim(obj), obj);
    assert.strictEqual(trim(null), null);
    assert.strictEqual(trim(undefined), undefined);
  });
});
