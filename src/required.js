'use strict';

module.exports = checkRequired;

const ValidateError = require('./unmarshal/error');
const _ = require('lodash');
const join = require('./unmarshal/util').join;
const realPathToSchemaPath = require('./unmarshal/util').realPathToSchemaPath;
const shouldSkipPath = require('./util').shouldSkipPath;

function check(root, v, schema, path, error, projection) {
  if (shouldSkipPath(projection, path) || projection.$noRequired) {
    return;
  }

  const fakePath = realPathToSchemaPath(path);
  const schemaPath = schema._paths[fakePath];
  if (isRequired(root, schemaPath) && v == null) {
    return error.markError(path, new Error(`Path "${path}" is required`));
  }

  if (!path) {
    _.each(schema._obj, (type, key) => check(root, v[key], schema, join(fakePath, key), error, projection));
  } else if (schemaPath) {
    if (schemaPath.$type === Object && schemaPath.$schema) {
      _.each(schemaPath.$schema, (value, key) => check(root, _.get(v, key), schema, join(fakePath, key), error, projection));
    }
    if (schemaPath.$type === Array) {
      _.each(v || [], (value, index) => check(root, value, schema, join(fakePath, index.toString()), error, projection));
    }
  }
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
  check(obj, obj, schema, '', error, projection);
  return error;
}
