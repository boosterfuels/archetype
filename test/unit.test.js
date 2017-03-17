'use strict';

const Archetype = require('../');
const StandardError = require('standard-error');
const _ = require('lodash');
const assert = require('assert');
const mongodb = require('mongodb');

describe('schema', function() {
  it('compiles paths', function() {
    let schema = new Archetype({
      test: 'number',
      nested: {
        a: {
          $type: 'number'
        }
      }
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      test: { $type: 'number' },
      nested: { $type: Object, $schema: { a: { $type: 'number' } } },
      'nested.a': { $type: 'number' }
    });
  });

  it('handles arrays', function() {
    let schema = new Archetype({
      test: 'number',
      arrMixed: [],
      arrPlain: ['number'],
      arrNested: [['number']]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'test': { $type: 'number' },
      'arrMixed': { $type: Array },
      'arrMixed.$': { $type: Archetype.Any },
      'arrPlain': { $type: Array },
      'arrPlain.$': { $type: 'number' },
      'arrNested': { $type: Array },
      'arrNested.$': { $type: Array },
      'arrNested.$.$': { $type: 'number' }
    });
  });

  it('handles nested document arrays', function() {
    let schema = new Archetype({
      docs: [{ _id: 'number' }]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'docs': { $type: Array },
      'docs.$': { $type: Object, $schema: { _id: 'number' } },
      'docs.$._id': { $type: 'number' }
    });
  });

  it('treats keys that contain $type as a terminus', function() {
    let schema = new Archetype({
      test: {
        $type: 1
      }
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'test': { $type: 1 }
    });
  });

  it('supports $ keys', function() {
    let schema = new Archetype({
      $lt: 'number',
      $gt: 'number'
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      '$lt': { $type: 'number' },
      '$gt': { $type: 'number' }
    });
  });

  it('adding paths with .path()', function() {
    let schema = new Archetype({
      docs: [{ _id: 'number' }]
    });

    assert.ok(!schema.path('_id'));
    const newSchema = schema.path('_id', { $type: 'number' });
    assert.deepEqual(newSchema.path('_id'), { $type: 'number' });
  });

  it('arrays with $type', function() {
    const schema = new Archetype({
      docs: { $type: [{ _id: 'number' }] }
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'docs': { $type: Array },
      'docs.$': { $type: Object, $schema: { _id: 'number' } },
      'docs.$._id': { $type: 'number' }
    });
  });
});

describe('unmarshal()', function() {
  it('ignores paths not defined in the schema', function() {
    const Person = new Archetype({
      name: { $type: 'string' }
    }).compile();

    const axl = { name: 'Axl Rose', role: 'Lead Singer' };
    const res = new Person(axl);
    assert.deepEqual(res, { name: 'Axl Rose' });
  });

  it('casts values to specified types', function() {
    const Person = new Archetype({
      _id: { $type: mongodb.ObjectId },
      name: { $type: 'string' },
      born: { $type: 'number' }
    }).compile();

    const axl = {
      _id: '000000000000000000000001',
      name: 'Axl Rose',
      born: '1962'
    };

    const res = new Person(axl);

    assert.deepEqual(res, {
      _id: mongodb.ObjectId('000000000000000000000001'),
      name: 'Axl Rose',
      born: 1962
    });
    assert.ok(res instanceof Person);
  });

  it('only casts if necessary', function() {
    const Person = new Archetype({
      _id: { $type: mongodb.ObjectId },
      name: { $type: 'string' },
      born: { $type: 'number' }
    }).compile();

    const axl = {
      _id: new mongodb.ObjectId('000000000000000000000001'),
      name: 'Axl Rose',
      born: 1962
    };

    const res = new Person(axl);

    assert.deepEqual(res, {
      _id: new mongodb.ObjectId('000000000000000000000001'),
      name: 'Axl Rose',
      born: 1962
    });
    assert.ok(res instanceof Person);
    assert.ok(res._id instanceof mongodb.ObjectId);
    assert.equal(res._id.toHexString(), '000000000000000000000001');
  });

  it('casts into arrays', function() {
    let Band = new Archetype({
      members: [{ $type: mongodb.ObjectId }]
    }).compile();

    const band = {
      members: '000000000000000000000001'
    };

    const res = new Band(band);

    assert.deepEqual(res, {
      members: [mongodb.ObjectId('000000000000000000000001')]
    });
  });

  it('boolean to array', function() {
    let Band = new Archetype({
      test: { $type: Array }
    }).compile();

    const res = new Band({ test: true });
    assert.deepEqual(res.test, [true]);
  });

  it('casts deeply nested arrays', function() {
    const Graph = new Archetype({
      points: [[{ $type: 'number' }]]
    }).compile();

    const obj = { points: 1 };
    const res = new Graph(obj);

    assert.deepEqual(res, {
      points: [[1]]
    });
  });

  it('does not cast $type: Object', function() {
    const Test = new Archetype({
      nested: { $type: Object }
    }).compile();

    const obj = { nested: { hello: 'world' }, removed: 'field' };
    const res = new Test(obj);

    assert.deepEqual(res, {
      nested: { hello: 'world' }
    });
  });

  it('error if you cast an object to a primitive', function() {
    const Person = new Archetype({
      name: {
        first: { $type: 'string' },
        last: { $type: 'string' }
      }
    }).compile();

    let user = { name: 'Axl Rose' };
    let errored = false;
    try {
      new Person(user);
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        name: new StandardError("Could not cast 'Axl Rose' to Object")
      });

      const stringified = JSON.parse(JSON.stringify(error));
      assert.deepEqual(stringified.errors, {
        name: new StandardError("Could not cast 'Axl Rose' to Object")
      });
    }
    assert.ok(errored);
  });

  it('ignores if $type not specified', function() {
    const Band = new Archetype({
      members: { $lookUp: { ref: 'Test' }, $type: null },
      tags: { $type: Array }
    }).compile();

    const band = { members: { x: 1 } };
    const res = new Band(band);
    assert.deepEqual(res, { members: { x: 1 } })
  });

  it('array of objects to primitive', function() {
    const Band = new Archetype({
      names: [{
        first: { $type: 'string' },
        last: { $type: 'string' }
      }]
    }).compile();

    const user = { names: ['Axl Rose'] };
    let errored = false;
    try {
      new Band(user);
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        'names.0': new StandardError("Could not cast 'Axl Rose' to Object")
      });
    }
    assert.ok(errored);
  });

  it('array of objects', function() {
    const Band = new Archetype({
      people: [{name: { $type: 'string', $required: true } }]
    }).compile();

    const v = { people: [{ name: 'Axl Rose', other: 'field' }] };
    const res = new Band(v);
    assert.deepEqual(res, {
      people: [{ name: 'Axl Rose' }]
    });
  });

  it('required', function() {
    const Person = new Archetype({
      name: { $type: 'string', $required: true }
    }).compile();

    let errored = false;
    try {
      new Person({});
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        name: new StandardError('Path "name" is required')
      });
    }
    assert.ok(errored);

    errored = false;
    try {
      new Person({ name: undefined });
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        name: new StandardError('Path "name" is required')
      });
    }
    assert.ok(errored);

    new Person({}, { $noRequired: 1 });
  });

  it('required with ObjectIds', function() {
    const Person = new Archetype({
      name: { $type: mongodb.ObjectId, $required: true }
    }).compile();

    let errored = false;
    try {
      new Person({ name: undefined });
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        name: new StandardError('Path "name" is required')
      });
    }
    assert.ok(errored);
  });

  it('required function', function() {
    const Person = new Archetype({
      requireName: 'boolean',
      name: { $type: 'string', $required: doc => doc.requireName }
    }).compile();

    // works
    new Person({});

    let errored = false;
    try {
      new Person({ requireName: true });
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        name: new StandardError('Path "name" is required')
      });
    }
    assert.ok(errored);

    // Works
    new Person({ requireName: true }, { $noRequired: 1 });
  });

  it('required in array', function() {
    const Person = new Archetype({
      names: [{ $type: 'string', $required: true }]
    }).compile();

    let errored = false;
    try {
      new Person({ names: ['test', null] });
    } catch(error) {
      errored = true;
      assert.deepEqual(error.errors, {
        'names.1': new StandardError('Path "names.1" is required')
      });
    }
    assert.ok(errored);
  });

  it('default', function() {
    const Breakfast = new Archetype({
      name: { $type: 'string', $required: true, $default: 'bacon' },
      names: [{ $type: 'string', $required: true, $default: 'eggs' }],
      title: { $type: 'string', $default: 'N/A' }
    }).compile();

    const val = new Breakfast({ names: [null, 'avocado'], title: 'test' });
    assert.deepEqual(val, {
      name: 'bacon',
      names: ['eggs', 'avocado'],
      title: 'test'
    });
  });

  it('default function', function() {
    const now = Date.now();
    const Model = new Archetype({
      createdAt: { $type: Date, $required: true, $default: Date.now }
    }).compile();

    const val = new Model({});
    assert.ok(val.createdAt.getTime() >= now, `${val.createdAt}, ${now}`);
  });

  it('no defaults for projecton', function() {
    const now = Date.now();
    const Model = new Archetype({
      name: { $type: 'string', $default: 'test' },
      createdAt: { $type: Date, $required: true, $default: Date.now }
    }).compile();

    const val = new Model({}, { createdAt: false });
    assert.deepEqual(val, { name: 'test' });
  });

  it('no defaults for projecton', function() {
    const now = Date.now();
    const Model = new Archetype({
      name: { $type: 'string', $default: 'test' },
      createdAt: { $type: Date, $required: true, $default: Date.now }
    }).compile();

    const val = new Model({}, { $noDefaults: true, $noRequired: true });
    assert.deepEqual(val, {});
  });

  it('projections', function() {
    const Person = new Archetype({
      name: {
        first: { $type: 'string' },
        last: { $type: 'string' }
      }
    }).compile();

    const user = { name: { first: 'Axl', last: 'Rose' } };
    const justFirst = new Person(user, { 'name.first': 1 });
    assert.deepEqual(justFirst, { name: { first: 'Axl' } });
    const justLast = new Person(user, { 'name.first': 0 });
    assert.deepEqual(justLast, { name: { last: 'Rose' } });
  });

  it('validation', function() {
    const Breakfast = new Archetype({
      bacon: {
        $type: 'number',
        $required: true,
        $validate: v => {
          if (v < 3) {
            throw new Error('Need more bacon');
          }
        }
      }
    }).compile();

    assert.throws(function() {
      new Breakfast({ bacon: 2 });
    }, /Need more bacon/);
  });

  it('enum', function() {
    const Breakfast = new Archetype({
      type: {
        $type: 'string',
        $enum: ['steak and eggs', 'bacon and eggs']
      },
      addOns: [
        { name: { $type: 'string', $enum: ['cheese', 'sour cream'] } }
      ]
    }).compile();

    assert.throws(function() {
      new Breakfast({ type: 'waffles' });
    }, /Value "waffles" invalid/);

    assert.throws(function() {
      new Breakfast({ addOns: [{ name: 'maple syrup' }] });
    }, /Value "maple syrup" invalid/);

    // works
    new Breakfast({ type: 'steak and eggs' });
    new Breakfast({});
    new Breakfast({ addOns: [{ name: 'cheese' }] });
  });

  it('validation with arrays', function() {
    const Band = new Archetype({
      name: 'string',
      members: {
        $type: ['string'],
        $validate: v => {
          if (v.length !== 5) {
            throw new Error('Must have 5 members');
          }
        }
      }
    }).compile();

    assert.throws(function() {
      new Band({ name: "Guns N' Roses", members: ['Axl Rose'] });
    }, /Must have 5 members/);

    new Band({
      name: "Guns N' Roses",
      members: ['Axl Rose', 'Slash', 'Izzy', 'Duff', 'Adler']
    });
  });

  it('supports nested types', function() {
    const Person = new Archetype({
      name: 'string'
    }).compile();
    const Band = new Archetype({
      name: 'string',
      singer: {
        $type: Person
      }
    }).compile();

    const gnr = new Band({
      name: "Guns N' Roses",
      singer: {
        name: 'Axl Rose'
      }
    });
    assert.deepEqual(gnr, {
      name: "Guns N' Roses",
      singer: {
        name: 'Axl Rose'
      }
    });
  });

  it('compile takes a name param', function() {
    const Person = new Archetype({
      name: 'string'
    }).compile('PersonModel');
    assert.equal(Person.toString(), 'PersonModel');
    assert.ok(new Person({}) instanceof Person);
    assert.equal(new Person({}).constructor.name, 'PersonModel');
  });

  it('compiled function can be called without "new" keyword', function() {
    const Person = new Archetype({
      name: 'string'
    }).compile('Person');
    assert.ok(Person({}) instanceof Person);
  });

  it('validation with arrays and nested objects', function() {
    const Band = new Archetype({
      name: 'string',
      members: [{
        name: {
          $type: 'string',
          $validate: v => {
            if (['Axl Rose', 'Slash'].indexOf(v) === -1) {
              throw new Error('Invalid name!');
            }
          }
        }
      }]
    }).compile();

    assert.throws(function() {
      new Band({
        name: "Guns N' Roses",
        members: [{ name: 'Vince Neil' }]
      });
    }, /Invalid name!/);

    new Band({
      name: "Guns N' Roses",
      members: [{ name: 'Axl Rose' }]
    });
  });

  it('arrays with null', function() {
    const Nest = new Archetype({ name: { $type: 'string', $required: true } }).compile();
    const Test = new Archetype({
      members: { $type: [Nest] }
    }).compile();

    new Test({ members: null });
  });

  it('get paths as array', function() {
    const Test = new Archetype({
      str: 'string',
      num: {
        $type: 'number',
        $description: 'this is a number'
      }
    }).compile();

    assert.deepEqual(Test.paths().filter(v => !v.$description), [
      { path: 'str', $type: 'string' }
    ])
    assert.deepEqual(Test.paths().filter(v => !!v.$description), [
      {
        path: 'num',
        $type: 'number',
        $description: 'this is a number'
      }
    ])
  });

  it('to()', function() {
    const n = Archetype.to('2', 'number');
    assert.strictEqual(n, 2)
  });

  it('handles NaN', function() {
    const Test = new Archetype({ num: 'number' }).compile('Test');
    assert.throws(function() {
      new Test({ num: 'a' * 2 });
    }, /to number/);
  });

  it('handles casting whitespace to number', function() {
    const Test = new Archetype({ num: 'number' }).compile('Test');
    assert.throws(function() {
      new Test({ num: '   ' });
    }, /to number/);
  });

  it('required underneath array', function() {
    const Test = new Archetype({
      products: [{ name: { $type: 'string', $required: true } }]
    }).compile('Test');
    assert.throws(function() {
      new Test({ products: [{ name: null }] });
    }, /required/);
  });

  it('object array under projection', function() {
    const Test = new Archetype({
      name: 'string',
      arr: {
        $type: [{ el: { $type: 'string' } }],
        $required: true
      }
    }).compile('Test');

    assert.deepEqual(new Test({ name: '1', arr: [{ el: '2' }]}, { arr: 1 }), {
      arr: [{ el: '2' }]
    });
  });
});

describe('schema modifications', function() {
  it('path() adds new paths', function() {
    const Test = new Archetype({
      str: 'string'
    }).compile();

    const Test2 = Test.path('num', { $type: 'number' }).compile('Test2');
    assert.deepEqual(new Test2({ str: 123, num: '123' }), {
      str: '123',
      num: 123
    });
  });

  it('omit() removes paths', function() {
    const Test = new Archetype({
      str: 'string',
      num: 'number'
    }).compile();

    const Test2 = Test.omit('num').compile('Test2');
    assert.deepEqual(new Test2({ str: 123, num: '123' }), {
      str: '123'
    });
  });

  it('pick() creates a new schema with a subset of paths', function() {
    const Test = new Archetype({
      str: 'string',
      num: 'number'
    }).compile();

    const Test2 = Test.pick('num').compile('Test2');
    assert.deepEqual(new Test2({ str: 123, num: '123' }), {
      num: 123
    });
  });

  it('transform() loops over top-level paths and transforms them', function () {
    const Test = new Archetype({
      str: { $type: 'string', $required: true },
      num: { $type: 'number', $required: true }
    }).compile();

    const Test2 = Test.transform((path, props) => {
      if (path === 'num') {
        delete props.$required;
      }
      return props;
    }).compile('Test2');

    // Should work
    new Test2({ str: '123' });
  });

  it('transform() loops over nested paths and transforms them', function () {
    const Test = new Archetype({
      nested: {
        str: { $type: 'string', $required: true },
        num: { $type: 'number', $required: true }
      }
    }).compile();

    const Test2 = Test.transform((path, props) => {
      if (path === 'nested.num') {
        delete props.$required;
      }
      return props;
    }).compile('Test2');

    // Should work
    new Test2({ nested: { str: '123' } });
  });

  it('eachPath() loops over nested paths', function () {
    const Test = new Archetype({
      nested: {
        str: { $type: 'string', $required: true },
        num: { $type: 'number', $required: true }
      }
    }).compile();

    const arr = [];
    Test.eachPath(path => {
      arr.push(path);
    });

    assert.deepEqual(arr, ['nested', 'nested.str', 'nested.num']);
  });
});
