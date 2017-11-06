# archetype

<img src="https://i.imgur.com/TW4rq2f.png">

Archetype is a library for casting and validating objects. It has exceptional support for deeply nested objects, type composition, custom types, and geoJSON.

[![CircleCI](https://circleci.com/gh/boosterfuels/archetype.svg?style=svg)](https://circleci.com/gh/boosterfuels/archetype)

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

## Connect

Follow [archetype on Twitter](https://twitter.com/archetype_js) for updates, including our gists of the week. Here's some older gists of the week:

* 20171103: [Conditionally Required Properties with Archetype](https://gist.github.com/vkarpov15/b4a9cb225699b3bf852c3fa8ca2c56e2)
* 20171027: [Custom Types with Archetype](https://gist.github.com/vkarpov15/d4cbd7941b40346741cf791d379001e5)
* 20171020: [Embedding a Subset of One Archetype's Properties in another Archetype](https://gist.github.com/vkarpov15/0dc21e98acfb96e72d0bb9b602adb3ad)
* 20171013: [Embedded Objects vs Embedded Types in Archetype](https://gist.github.com/vkarpov15/1520cfb604972e81198db028e4606809)
* 20171006: [Consistent Arrays from Query Params with Express and Archetype](https://gist.github.com/vkarpov15/e03dafb2ac478cb38ff3fbe4c36139d6)
