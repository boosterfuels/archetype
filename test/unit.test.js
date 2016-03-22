'use strict';

let assert = require('assert');
let Schema = require('../src');

describe('schema', function() {
  it('compiles paths', function() {
    let schema = new Schema({
      test: Number,
      nested: {
        a: {
          $type: Number
        }
      }
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      test: { $type: Number },
      nested: { $type: Object, $schema: { a: { $type: Number } } },
      'nested.a': { $type: Number }
    });
  });

  it('handles arrays', function() {
    let schema = new Schema({
      test: Number,
      arrMixed: [],
      arrPlain: [Number],
      arrNested: [[Number]]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'test': { $type: Number },
      'arrMixed': { $type: Array },
      'arrMixed.$': { $type: Schema.Any },
      'arrPlain': { $type: Array },
      'arrPlain.$': { $type: Number },
      'arrNested': { $type: Array },
      'arrNested.$': { $type: Array },
      'arrNested.$.$': { $type: Number }
    });
  });

  it('handles nested document arrays', function() {
    let schema = new Schema({
      docs: [{ _id: Number }]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'docs': { $type: Array },
      'docs.$': { $type: Object, $schema: { _id: Number } },
      'docs.$._id': { $type: Number }
    });
  });

  it('treats keys that start with $ as a terminus', function() {
    let schema = new Schema({
      test: {
        $prop: 1
      }
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'test': { $prop: 1 }
    });
  });

  it('adding paths with .path()', function() {
    let schema = new Schema({
      docs: [{ _id: Number }]
    });

    assert.ok(!schema.path('_id'));
    schema.path('_id', { $type: Number });
    assert.deepEqual(schema.path('_id'), { $type: Number });
  });
});
