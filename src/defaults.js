'use strict';

module.exports = applyDefaults;

const _ = require('lodash');
const join = require('./unmarshal/util').join;
const mpath = require('mpath');
const realPathToSchemaPath = require('./unmarshal/util').realPathToSchemaPath;
const shouldSkipPath = require('./util').shouldSkipPath;

function applyDefaults(obj, schema, projection) {
  _.each(Object.keys(schema._obj), key => {
    const def = defaults(obj, obj[key], schema, key, projection)
    if (def !== void 0 && obj[key] == null) {
      obj[key] = def;
    }
  });
}

function defaults(root, v, schema, path, projection) {
  if (shouldSkipPath(projection, path) || projection.$noDefaults) {
    return;
  }

  const fakePath = realPathToSchemaPath(path);
  const schemaPath = schema._paths[fakePath];

  if (!schemaPath) {
    return;
  }

  if ('$default' in schemaPath) {
    return handleDefault(schemaPath.$default, root);
  }

  if (schemaPath.$type === Object && schemaPath.$schema) {
    _.each(schemaPath.$schema, (value, key) => {
      const def = defaults(root, _.get(v, key), schema, join(fakePath, key), projection);
      if (def !== void 0 && value == null) {
        v[key] = def;
      }
    });
  }
  if (schemaPath.$type === Array) {
    _.each(v || [], (value, index) => {
      const def = defaults(root, value, schema, join(fakePath, index.toString()), projection);
      if (def !== void 0 && value == null) {
        v[index] = def;
      }
    });
  }
}

function handleDefault(obj, ctx) {
  if (typeof obj === 'function') {
    return obj(ctx);
  }
  return obj;
}
