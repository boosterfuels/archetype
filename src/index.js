'use strict';

const Any = require('./any');
const _ = require('lodash');

class Schema {
  constructor(obj) {
    this._obj = _.cloneDeep(obj);
    this._paths = {};
    this.compile();
  }

  compile() {
    this._paths = visitor(this._obj);
  }

  json() {
    return this._obj;
  }

  path(path, props) {
    if (!props) {
      return _.get(this._obj, path);
    }
    _.set(this._obj, path, props);
    return this;
  }

  paths() {
    return _.map(Object.keys(this._paths),
      path => ({ key: path, value: this[path] }));
  }
}

function visitor(obj) {
  var paths = paths || {};

  visitObject(obj, '', paths);
  return paths;
}

function visitArray(arr, path, paths) {
  paths[path] = { $type: Array };
  if (arr.length > 0) {
    if (Array.isArray(arr[0])) {
      visitArray(arr[0], path + '.$', paths);
    } else if (typeof arr[0] === 'object') {
      visitObject(arr[0], path + '.$', paths);
    } else {
      paths[path + '.$'] = { $type: arr[0] };
    }
  } else {
    paths[path + '.$'] = { $type: Any };
  }
  return paths[path];
}

function visitObject(obj, path, paths) {
  let keys = Object.keys(obj);
  if (keys.length > 0 && keys[0].charAt(0) === '$') {
    paths[path] = obj;
    return;
  }

  if (path) {
    paths[path] = { $type: Object, $schema: obj };
  }
  _.each(obj, function(value, key) {
    if (Array.isArray(value)) {
      visitArray(value, join(path, key), paths);
    } else if (typeof value === 'object') {
      visitObject(value, join(path, key), paths);
    } else {
      paths[join(path, key)] = { $type: value };
    }
  });
}

function join(path, key) {
  if (path) {
    return path + '.' + key;
  }
  return key;
}

Schema.Any = Any;

exports.Any = Any;
exports.Schema = Schema;
