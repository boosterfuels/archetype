'use strict';

const Archetype = require('../');
const assert = require('assert');

describe('defaults', function() {
  it('basic $default', function() {
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

  it('deep defaults', function() {
    const C = new Archetype({
      firstName: {
        $type: 'string',
        $default: () => 'test'
      },
      name: {
        first: {
          $type: 'string',
          $default: () => 'test'
        }
      },
      multiple: {
        a: {
          $type: 'string',
          $default: () => 'test'
        },
        b: {
          $type: 'string'
        }
      }
    }).compile('c');

    let v = new C({ multiple: { b: 'foo' } });
    assert.equal(v.firstName, 'test');
    assert.equal(v.name.first, 'test');
    assert.equal(v.multiple.a, 'test');
    assert.equal(v.multiple.b, 'foo');
  });

  it('clones empty default array and object', function() {
    const T = new Archetype({
      myArr: {
        $type: ['string'],
        $default: []
      },
      myObj: {
        $type: Object,
        $default: {}
      }
    }).compile('T');

    const obj1 = new T({});

    obj1.myArr.push('test');
    obj1.myObj.hello = 'world';

    assert.equal(obj1.myArr[0], 'test');
    assert.equal(obj1.myObj.hello, 'world');

    const obj2 = new T({});
    assert.deepEqual(obj2.myArr, []);
    assert.deepEqual(obj2.myObj, {});
  });

  it('throws if default is non-empty object', function() {
    assert.throws(() => {
      new Archetype({
        myArr: {
          $type: ['string'],
          $default: ['test']
        }
      }).compile('T');
    }, /Default is a non-empty object/);

    assert.throws(() => {
      new Archetype({
        myArr: {
          $type: {},
          $default: { test: 42 }
        }
      }).compile('T');
    }, /Default is a non-empty object/);
  });
});
