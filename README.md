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

## Type Properties

Archetype uses nested objects to describe the properties that are allowed in
an object. A key that starts with `$` identifies an object as a _type description_.
The following type properties are supported:

* `$type`: the type to cast `value` to
* `$required`: if falsy, `null` and `undefined` are valid values for this path. If true, `null` and `undefined` are not allowed. Can also handle a function `$required: doc => {}`. If the `$required` function returns falsy, `null` and `undefined` are valid, otherwise they are not.
* `$default`: use this value instead if this path is `null` or `undefined`. If `$default` is a function `$default: doc => {}`, archetype will use the return value of the function.
* `$validate`: executes a function that validates `value`. If this function throws, archetype will report an error for this path. Function signature is `$validate: (v, { typeProps, doc }) => {}`
* `$enum`: lists valid values for this path, modulo `null` and `undefined` if `$required` is falsy.

## Connect

Follow [archetype on Twitter](https://twitter.com/archetype_js) for updates, including our gists of the week. Here's some older gists of the week:

* 20180112: [Virtual Types with Archetype](https://gist.github.com/vkarpov15/32abd9f72dfb2ba1558e9e6a1060c768)
* 20180105: [Transform an Archetype So All Properties are Not Required](https://gist.github.com/vkarpov15/6c49c0bc5ed0eab42633645bf03e8fa7)
* 20171124: [Embedding Only Certain Fields in an Embedded Archetype](https://gist.github.com/vkarpov15/37622608b33eb144acfda5d3ad936be6)
* 20171117: [Async/Await with Archetype](https://gist.github.com/vkarpov15/f10b560468f49166bcc14c6e41bb755e)
* 20171110: [Configuring Custom Validators for Individual Paths in Archetype](https://gist.github.com/vkarpov15/dcf7c490c69e625764c0dc1453555524)
* 20171103: [Conditionally Required Properties with Archetype](https://gist.github.com/vkarpov15/b4a9cb225699b3bf852c3fa8ca2c56e2)
* 20171027: [Custom Types with Archetype](https://gist.github.com/vkarpov15/d4cbd7941b40346741cf791d379001e5)
* 20171020: [Embedding a Subset of One Archetype's Properties in another Archetype](https://gist.github.com/vkarpov15/0dc21e98acfb96e72d0bb9b602adb3ad)
* 20171013: [Embedded Objects vs Embedded Types in Archetype](https://gist.github.com/vkarpov15/1520cfb604972e81198db028e4606809)
* 20171006: [Consistent Arrays from Query Params with Express and Archetype](https://gist.github.com/vkarpov15/e03dafb2ac478cb38ff3fbe4c36139d6)
