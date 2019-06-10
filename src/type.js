'use strict';

const cloneDeep = require('lodash.clonedeep');
const unmarshal = require('./unmarshal');

class Type {
  constructor(obj, projection) {
    Object.assign(this, unmarshal(cloneDeep(obj), this.constructor.schema, projection));
  }
}

module.exports = Type;
