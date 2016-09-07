'use strict';

module.exports = checkRequired;

const ValidateError = require('./unmarshal/error');
const _ = require('lodash');
const mpath = require('mpath');
const shouldSkipPath = require('./util').shouldSkipPath;

function checkRequired(obj, schema, projection) {
  const error = new ValidateError();
  _.each(Object.keys(schema._paths), path => {
    if (shouldSkipPath(projection, path) || projection.$noRequired) {
      return;
    }
    const isRequired = typeof schema._paths[path].$required === 'function' ?
      schema._paths[path].$required(obj, schema) :
      schema._paths[path].$required;

    if (!isRequired) {
      return true;
    }
    const _path = path.replace(/\.\$\./g, '.').replace(/\.\$$/g, '');
    const val = mpath.get(_path, obj);
    if (Array.isArray(val)) {
      if (_.some(val, v => v == null)) {
        error.markError(path, new Error(`Path "${path}" is required`));
      }
    } else if (val == null) {
      error.markError(path, new Error(`Path "${path}" is required`));
    }
  });
  return error;
}
