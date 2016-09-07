'use strict';

exports.shouldSkipPath = function(projection, path) {
  if (projection.$inclusive) {
    return projection[path] != null;
  } else {
    return projection[path] == null;
  }
}
