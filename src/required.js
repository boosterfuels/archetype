'use strict';

module.exports = checkRequired;

const ValidateError = require('./unmarshal/error');
const _ = require('lodash');
const join = require('./unmarshal/util').join;
const mpath = require('mpath');
const realPathToSchemaPath = require('./unmarshal/util').realPathToSchemaPath;
const shouldSkipPath = require('./util').shouldSkipPath;

function checkObject(root, obj, schema, path, error, projection) {
  if (shouldSkipPath(projection, path) || projection.$noRequired) {
    return;
  }

  const fakePath = realPathToSchemaPath(path);
  if (path) {
    const schemaPath = schema._paths[fakePath];
    if (isRequired(root, schemaPath) && obj == null) {
      return error.markError(path, new Error(`Path "${path}" is required`));
    }
  }

  _.each(obj, function(value, key) {
    const newPath = join(fakePath, key);
    if (schema._paths[newPath] == null) {
      return;
    }
    if (schema._paths[newPath].$type === Array) {
      checkObject(root, value, schema, newPath, error, projection);
    } else if (schema._paths[newPath].$type === Object) {
      checkObject(root, value, schema, newPath, error, projection);
    } else if (isRequired(root, newPath) && value == null) {
      error.markError(newPath, new Error(`Path "${newPath}" is required`));
    }
  });
}

function isRequired(root, schemaPath) {
  if (!schemaPath) {
    return false;
  }
  if (typeof schemaPath.$required === 'function') {
    return schemaPath.$required(root);
  }
  return schemaPath.$required;
}

function checkRequired(obj, schema, projection) {
  const error = new ValidateError();
  checkObject(obj, obj, schema, '', error, projection);
  return error;
}
