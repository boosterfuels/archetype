'use strict';

const assert = require('assert');
const mongodb = require('mongodb');
const archetype = require('../');

describe('schema', function() {
  it('compiles paths', function() {
    let schema = new archetype.Schema({
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
    let schema = new archetype.Schema({
      test: Number,
      arrMixed: [],
      arrPlain: [Number],
      arrNested: [[Number]]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'test': { $type: Number },
      'arrMixed': { $type: Array },
      'arrMixed.$': { $type: archetype.Any },
      'arrPlain': { $type: Array },
      'arrPlain.$': { $type: Number },
      'arrNested': { $type: Array },
      'arrNested.$': { $type: Array },
      'arrNested.$.$': { $type: Number }
    });
  });

  it('handles nested document arrays', function() {
    let schema = new archetype.Schema({
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
    let schema = new archetype.Schema({
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
    let schema = new archetype.Schema({
      docs: [{ _id: Number }]
    });

    assert.ok(!schema.path('_id'));
    schema.path('_id', { $type: Number });
    assert.deepEqual(schema.path('_id'), { $type: Number });
  });
});

describe('unmarshal()', function() {
  it('ignores paths not defined in the schema', function() {
    const schema = new archetype.Schema({
      name: { $type: String }
    });

    const axl = { name: 'Axl Rose', role: 'Lead Singer' };
    const res = schema.unmarshal(axl);
    assert.deepEqual(res, { name: 'Axl Rose' });
  });

  it('casts values to specified types', function() {
    const schema = new archetype.Schema({
      _id: { $type: mongodb.ObjectId },
      name: { $type: String },
      born: { $type: Number }
    });

    const axl = {
      _id: '000000000000000000000001',
      name: 'Axl Rose',
      born: '1962'
    };

    const res = schema.unmarshal(axl);

    assert.deepEqual(res, {
      _id: mongodb.ObjectId('000000000000000000000001'),
      name: 'Axl Rose',
      born: 1962
    });
  });

  it('casts into arrays', function() {
    let schema = new archetype.Schema({
      members: [{ $type: mongodb.ObjectId }]
    });

    const band = {
      members: '000000000000000000000001'
    };

    const res = schema.unmarshal(band);

    assert.deepEqual(res, {
      members: [mongodb.ObjectId('000000000000000000000001')]
    });
  });

  it('casts deeply nested arrays', function() {
    const schema = new archetype.Schema({
      points: [[{ $type: Number }]]
    });

    const obj = { points: 1 };
    const res = schema.unmarshal(obj);

    assert.deepEqual(res, {
      points: [[1]]
    });
  });

  it('error if you cast an object to a primitive', function() {
    const schema = new archetype.Schema({
      name: {
        first: { $type: String },
        last: { $type: String }
      }
    });

    let user = { name: 'Axl Rose' };
    let errored = false;
    try {
      schema.unmarshal(user);
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        name: new Error("Error: Could not cast 'Axl Rose' to Object")
      });
    }
    assert.ok(errored);
  });

  it('ignores if $type not specified', function() {
    const schema = new archetype.Schema({
      members: { $lookUp: { ref: 'Test' } },
      tags: { $type: Array }
    });

    const band = { members: { x: 1 } };
    const res = schema.unmarshal(band);
    assert.deepEqual(res, { members: { x: 1 } })
  });

  it('array of objects to primitive', function() {
    const schema = new archetype.Schema({
      names: [{
        first: { $type: String },
        last: { $type: String }
      }]
    });

    const user = { names: ['Axl Rose'] };
    let errored = false;
    try {
      schema.unmarshal(user);
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        'names.0': new Error("Error: Could not cast 'Axl Rose' to Object")
      });
    }
    assert.ok(errored);
  });

  it('array of objects', function() {
    const schema = new archetype.Schema({
      people: [{name: { $type: String, $required: true } }]
    });

    const v = { people: [{ name: 'Axl Rose', other: 'field' }] };
    const res = schema.unmarshal(v);
    assert.deepEqual(res, {
      people: [{ name: 'Axl Rose' }]
    });
  });

  it('required', function() {
    const schema = new archetype.Schema({
      name: { $type: String, $required: true }
    });

    let errored = false;
    try {
      schema.unmarshal({});
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        name: new Error('Path "name" is required')
      });
    }
    assert.ok(errored);
  });

  it('default', function() {
    const schema = new archetype.Schema({
      name: { $type: String, $required: true, $default: 'bacon' },
      names: [{ $type: String, $required: true, $default: 'eggs' }]
    });

    const val = schema.unmarshal({ names: [null] });
    assert.deepEqual(val, { name: 'bacon', names: ['eggs'] });
  });

  it('projections', function() {
    const schema = new archetype.Schema({
      name: {
        first: { $type: String },
        last: { $type: String }
      }
    });

    const user = { name: { first: 'Axl', last: 'Rose' } };
    const justFirst = schema.unmarshal(user, { 'name.first': 1 });
    assert.deepEqual(justFirst, { name: { first: 'Axl' } });
    const justLast = schema.unmarshal(user, { 'name.first': 0 });
    assert.deepEqual(justLast, { name: { last: 'Rose' } });
  });

  it('validation', function() {
    const breakfastSchema = new archetype.Schema({
      bacon: {
        $type: Number,
        $required: true,
        $validate: v => {
          if (v < 3) {
            throw new Error('Need more bacon');
          }
        }
      }
    });

    assert.throws(function() {
      breakfastSchema.unmarshal({ bacon: 2 });
    }, /Need more bacon/);
  });
});
