'use strict';

const unmarshal = require('./unmarshal');

class Type {
  constructor(obj, projection) {
    Object.assign(this, unmarshal(obj, this.constructor.schema, projection));
  }
}

module.exports = Type;
