'use strict';

const Archetype = require('../');
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

  it('treats keys that start with $ as a terminus', function() {
    let schema = new Archetype({
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
    let schema = new Archetype({
      docs: [{ _id: 'number' }]
    });

    assert.ok(!schema.path('_id'));
    schema.path('_id', { $type: 'number' });
    assert.deepEqual(schema.path('_id'), { $type: 'number' });
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
        name: new Error("Error: Could not cast 'Axl Rose' to Object")
      });
    }
    assert.ok(errored);
  });

  it('ignores if $type not specified', function() {
    const Band = new Archetype({
      members: { $lookUp: { ref: 'Test' } },
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
        'names.0': new Error("Error: Could not cast 'Axl Rose' to Object")
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
        name: new Error('Path "name" is required')
      });
    }
    assert.ok(errored);

    new Person({}, { $noRequired: 1 }); 
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
        'names.$': new Error('Path "names.$" is required')
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
});
