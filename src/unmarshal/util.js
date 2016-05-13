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

exports.to = function(v, type) {
  if (SPECIAL_CASES.has(type)) {
    return SPECIAL_CASES.get(type)(v);
  }

  if (!(v instanceof type)) {
    return new type(v);
  }
  return v;
}

exports.handleCast = function(obj, key, type) {
  obj[key] = exports.to(obj[key], type);
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
