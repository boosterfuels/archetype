'use strict';

const StandardError = require('standard-error');
const _ = require('lodash');

class CastError extends Error {
  constructor() {
    super();
    this.errors = {};
    this.hasError = false;
    this._isArchetypeError = true;
  }

  markError(path, error) {
    const standardized = new StandardError(error.message);
    standardized.stack = error.stack;
    this.errors[path] = standardized;
    this.hasError = true;
    this.message = this.toString();
    return this;
  }

  merge(error) {
    if (!error) {
      return this;
    }
    _.each(error.errors, (value, key) => {
      this.errors[key] = value;
    });
    this.hasError = Object.keys(this.errors).length > 0;
    this.message = this.toString();
    return this;
  }

  toString() {
    let str = [];
    _.each(this.errors, function(value, key) {
      str.push(`${key}: ${value.message || value}`);
    });
    return str.join(', ');
  }
}

module.exports = CastError;
