'use strict';

const _ = require('lodash');
const unmarshal = require('./unmarshal');

class Archetype {
  constructor(obj) {
    this._obj = _.cloneDeep(obj);
    this._paths = {};
  }

  compile(name) {
    const _this = this;
    this._paths = visitor(this._obj);
    const type = function(obj, projection) {
      if (!(this instanceof type)) {
        return new type(obj, projection);
      }
      Object.assign(this, unmarshal(_.cloneDeep(obj), _this, projection));
    };
    type.schema = this;
    if (name) {
      type.toString = () => name;
      Object.defineProperty(type, 'name', { value: name });
    }
    type.paths = () => this.paths();

    type.path = (path, props, opts) => this.path(path, props, opts);
    type.omit = path => this.omit(path);
    type.pick = paths => this.pick(paths);
    type.transform = fn => this.transform(fn);
    type.eachPath = fn => this.eachPath(fn);

    return type;
  }

  json() {
    return this._obj;
  }

  path(path, props, options) {
    if (!props) {
      return _.get(this._obj, path);
    }
    if (_.get(options, 'inPlace')) {
      _.set(this._obj, path, props);
      return this;
    }
    const newSchema = new Archetype(this._obj);
    _.set(newSchema._obj, path, props);
    return newSchema;
  }

  omit(paths) {
    const newSchema = new Archetype(this._obj);
    if (Array.isArray(paths)) {
      for (const path of paths) {
        _.unset(newSchema._obj, path);
      }
    } else {
      _.unset(newSchema._obj, paths);
    }
    return newSchema;
  }

  pick(paths) {
    const newSchema = new Archetype(_.pick(this._obj, paths));
    return newSchema;
  }

  transform(fn) {
    const newSchema = new Archetype(this._obj);
    newSchema._transform(fn, newSchema._obj, []);
    return newSchema;
  }

  _transform(fn, obj, path) {
    _.each(Object.keys(obj), key => {
      obj[key] = fn(path.concat([key]).join('.'), obj[key]);
      if (typeof obj[key] === 'object' && obj[key] && !('$type' in obj[key])) {
        this._transform(fn, obj[key], path.concat([key]));
      }
    });
  }

  eachPath(fn) {
    this._eachPath(fn, this._obj, []);
  }

  _eachPath(fn, obj, path) {
    _.each(Object.keys(obj), key => {
      fn(path.concat([key]).join('.'), obj[key]);
      if (typeof obj[key] === 'object' && obj[key] && !('$type' in obj[key])) {
        this._eachPath(fn, obj[key], path.concat([key]));
      }
    });
  }

  paths() {
    return _.map(Object.keys(this._paths),
      path => Object.assign({}, this._paths[path], { path }));
  }

  unmarshal(obj, projection) {
    return unmarshal(obj, this, projection);
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
    paths[path + '.$'] = { $type: null };
  }
  return paths[path];
}

function visitObject(obj, path, paths) {
  if ('$type' in obj) {
    if (Array.isArray(obj.$type)) {
      visitArray(obj.$type, path, paths);
      Object.assign(paths[path], _.omit(obj, '$type'));
      return;
    }
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

exports.Archetype = Archetype;
exports.CastError = require('./unmarshal/error');
