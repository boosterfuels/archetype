'use strict';

const Schema = require('../').Schema;
const ValidateError = require('./error');
const _ = require('lodash');
const debug = require('debug')('monoschema:validate');
const handleCast = require('./util').handleCast;
const join = require('./util').join;
const mpath = require('mpath');
const realPathToSchemaPath = require('./util').realPathToSchemaPath;

module.exports = castDocument;

function markSubpaths(projection, path, val) {
  const pieces = path.split('.');
  let cur = pieces[0];
  projection[cur] = val;
  for (let i = 1; i < pieces.length; ++i) {
    cur += `.${pieces[i]}`;
    projection[cur] = val;
  }
}

function handleProjection(projection) {
  if (!projection) {
    return { $inclusive: true };
  }
  projection = _.cloneDeep(projection);
  let inclusive = null;
  for (const key of Object.keys(projection)) {
    if (projection[key] > 0) {
      if (inclusive === true) {
        throw new Error("Can't mix inclusive and exclusive in projection");
      }
      markSubpaths(projection, key, projection[key]);
      inclusive = false;
    } else {
      if (inclusive === false) {
        throw new Error("Can't mix inclusive and exclusive in projection");
      }
      inclusive = true;
    }
  }

  if (inclusive === null) {
    inclusive = true;
  }
  projection.$inclusive = inclusive;
  return projection;
}

function shouldSkipPath(projection, path) {
  if (projection.$inclusive) {
    return projection[path] != null;
  } else {
    return projection[path] == null;
  }
}

function castDocument(obj, schema, projection) {
  projection = handleProjection(projection);
  obj = _.cloneDeep(obj);
  applyDefaults(obj, schema, projection);
  const error = new ValidateError();
  error.merge(visitObject(obj, schema, projection, '').error);
  error.merge(checkRequired(obj, schema, projection));
  error.merge(runValidation(obj, schema, projection));
  if (error.hasError) {
    throw error;
  }
  return obj;
}

function visitArray(arr, schema, projection, path) {
  debug('visitArray', arr, path, schema);
  let error = new ValidateError();
  let curPath = realPathToSchemaPath(path);
  let newPath = join(curPath, '$');
  if (!schema._paths[newPath] || !schema._paths[newPath].$type) {
    debug('skipping', newPath);
    return {
      value: arr,
      error: null
    };
  }

  if (!Array.isArray(arr)) {
    arr = [arr];
  }

  debug('newPath', newPath, schema._paths[newPath].$type);
  arr.forEach(function(value, index) {
    if (schema._paths[newPath].$type === Array) {
      let res = visitArray(value, schema, projection, join(path, index, true));
      if (res.error) {
        error.merge(res.error);
      }
      arr[index] = res.value;
      return;
    } else if (schema._paths[newPath].$type === Object) {
      let res = visitObject(value, schema, projection, join(path, index, true));
      if (res.error) {
        error.merge(res.error);
      }
      arr[index] = res.value;
      return;
    }

    try {
      handleTerminus(arr, index, schema, newPath);
    } catch(err) {
      error.markError(join(realPath, index, true), err);
    }
  });

  return {
    value: arr,
    error: (error.hasError ? error : null)
  };
}

function visitObject(obj, schema, projection, path) {
  debug('visitObject', obj, schema, projection, path);
  let error = new ValidateError();
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    let err = new Error('Could not cast ' + require('util').inspect(obj) +
      ' to Object');
    error.markError(path, err);
    return {
      value: null,
      error: error
    };
  }

  let fakePath = realPathToSchemaPath(path);
  debug('fakePath', fakePath);

  _.each(obj, function(value, key) {
    let newPath = join(fakePath, key);
    debug('visit', key);
    if (!schema._paths[newPath] || shouldSkipPath(projection, newPath)) {
      delete obj[key];
      return;
    }
    if (!schema._paths[newPath].$type) {
      // If type not specified, no type casting
      return;
    }

    if (schema._paths[newPath].$type === Array) {
      let res = visitArray(value, schema, projection, newPath);
      if (res.error) {
        debug('merge', res.error.errors);
        error.merge(res.error);
      }
      obj[key] = res.value;
      return;
    } else if (schema._paths[newPath].$type === Object) {
      if (value == null) {
        delete obj[key];
        return;
      }
      let res = visitObject(value, schema, projection, newPath);
      if (res.error) {
        debug('merge', res.error.errors);
        error.merge(res.error);
      }
      obj[key] = res.value;
      return;
    }

    try {
      handleTerminus(obj, key, schema, newPath);
    } catch(err) {
      error.markError(join(path, key, true), err);
    }
  });

  return {
    value: obj,
    error: (error.hasError ? error : null)
  };
}

function handleTerminus(value, key, schema, path) {
  schema = schema._paths[path];
  handleCast(value, key, schema.$type);
}

function checkRequired(obj, schema, projection) {
  const error = new ValidateError();
  _.each(Object.keys(schema._paths), path => {
    if (shouldSkipPath(projection, path)) {
      return;
    }
    if (!schema._paths[path].$required) {
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

function runValidation(obj, schema, projection) {
  const error = new ValidateError();
  _.each(Object.keys(schema._paths), path => {
    if (shouldSkipPath(projection, path)) {
      return;
    }
    if (!schema._paths[path].$validate) {
      return true;
    }
    const _path = path.replace(/\.\$\./g, '.').replace(/\.\$$/g, '');
    const val = mpath.get(_path, obj);
    if (val == null) {
      return;
    }
    if (Array.isArray(val)) {
      _.each(val, (val, index) => {
        try {
          schema._paths[path].$validate(val, schema._paths[path], obj);
        } catch(_error) {
          error.markError(`${path}.${index}`, _error);
        }
      });
    } else {
      try {
        schema._paths[path].$validate(val, schema._paths[path], obj);
      } catch(_error) {
        error.markError(path, _error);
      }
    }
  });
  return error;
}

function applyDefaults(obj, schema, projection) {
  _.each(Object.keys(schema._paths), path => {
    if (!schema._paths[path].$default) {
      return;
    }
    if (shouldSkipPath(projection, path)) {
      return;
    }
    const _path = path.replace(/\.\$\./g, '.').replace(/\.\$$/g, '');
    const val = mpath.get(_path, obj);
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; ++i) {
        if (!val[i]) {
          val[i] = handleDefault(schema._paths[path].$default);
        }
      }
      mpath.set(_path, val, obj);
    } else if (val == null) {
      mpath.set(_path, handleDefault(schema._paths[path].$default), obj);
    }
  });
}

function handleDefault(obj) {
  if (typeof obj === 'function') {
    return obj();
  }
  return obj;
}
