'use strict';

module.exports = checkRequired;

const ValidateError = require('./unmarshal/error');
const get = require('./get');
const join = require('./unmarshal/util').join;
const realPathToSchemaPath = require('./unmarshal/util').realPathToSchemaPath;
const shouldSkipPath = require('./util').shouldSkipPath;

function check(root, v, schema, path, state, projection) {
  if (shouldSkipPath(projection, path) || projection.$noRequired) {
    return;
  }

  const fakePath = realPathToSchemaPath(path);
  const schemaPath = schema._paths[fakePath];
  if (isRequired(root, schemaPath) && v == null) {
    // Lazily allocate the accumulator so checking a document with no missing
    // required paths allocates zero Error objects (see unmarshal/index.js).
    state.error = (state.error == null ? new ValidateError() : state.error).
      markError(path, new Error(`Path "${path}" is required`));
    return;
  }

  if (!path) {
    for (const key of Object.keys(schema._obj)) {
      check(root, v[key], schema, join(fakePath, key), state, projection);
    }
  } else if (schemaPath) {
    if (schemaPath.$type === Object && schemaPath.$schema) {
      for (const key of Object.keys(schemaPath.$schema)) {
        check(root, get(v, key), schema, join(fakePath, key), state, projection);
      }
    } else if (schemaPath.$type === Array) {
      const arr = v || [];
      for (let index = 0; index < arr.length; ++index) {
        check(root, arr[index], schema, join(fakePath, index.toString()),
          state, projection);
      }
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
  const state = { error: null };
  check(obj, obj, schema, '', state, projection);
  return state.error;
}
