'use strict';

let SPECIAL_CASES = new WeakMap();
SPECIAL_CASES.
  set(Number, function(v) {
    let casted = Number(v);
    if (isNaN(casted)) {
      throw new Error('Could not cast ' + require('util').inspect(v) +
        ' to Number');
    }
    return casted;
  }).
  set(String, String);

exports.handleCast = function(obj, key, type) {
  if (SPECIAL_CASES.has(type)) {
    obj[key] = SPECIAL_CASES.get(type)(obj[key]);
    return;
  }

  if (!(obj[key] instanceof type)) {
    obj[key] = new type(obj[key]);
  }
};

exports.realPathToSchemaPath = function(path) {
  return path.replace(/\.\d+\./g, '.$.').replace(/\.\d+$/, '.$');
};

exports.join = function(path, key, real) {
  if (!real && typeof key === 'number') {
    key = '$';
  }
  if (path) {
    return path + '.' + key;
  }
  return key;
};
