# archetype

[![Build Status](https://travis-ci.org/vkarpov15/archetype-js.svg?branch=master)](https://travis-ci.org/vkarpov15/archetype-js)

Archetype is a runtime type-casting library. Its purpose is to compose
types from existing types in a way that's easy to write and document.

```javascript
const { ObjectId } = require('mongodb');
const moment = require('moment');

// `Person` is now a constructor
const Person = new Archetype({
  name: 'string',
  bandId: {
    $type: ObjectId,
    $required: true
  },
  createdAt: {
    $type: moment,
    $default: () => moment()
  }
}).compile('Person');

const test = new Person({
  name: 'test',
  bandId: '507f191e810c19729de860ea'
});

test.bandId; // Now a mongodb ObjectId
test.createdAt; // moment representing now
```

If casting fails, archetype throws a nice clean exception:

```javascript
try {
  Person({ // <-- calling with `new` is optional
    name: 'test',
    bandId: 'ImNotAValidObjectId'
  });
} catch(error) {
  error.errors['bandId'].message; // Mongodb ObjectId error
}
```

[Archetypes are composable, inspectable, and extendable via `extends`.](http://thecodebarbarian.com/casting-mongodb-queries-with-archetype.html)
