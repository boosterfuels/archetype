'use strict';

const util = require('util');

class Path {
  constructor(obj) {
    if (obj != null && obj.$default != null && typeof obj.$default === 'object') {
      const $default = obj.$default;
      const numKeys = Array.isArray($default) ?
        $default.length :
        Object.keys($default).length;
      if (numKeys > 0) {
        throw new Error('Default is a non-empty object `' +
          util.inspect($default) + '`. Please make `$default` a function ' +
          'that returns an object instead');
      }
    }
    Object.assign(this, obj);
  }
}

module.exports = Path;