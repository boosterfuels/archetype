'use strict';

const to = require('../to');

exports.handleCast = function(obj, key, type) {
  obj[key] = to(obj[key], type);
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
