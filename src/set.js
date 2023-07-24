'use strict';

/*!
 * Simplified lodash.set to remove https://security.snyk.io/vuln/SNYK-JS-LODASHSET-1320032?_gl=1%2a2zj3r0%2a_ga%2aMTkwMjAxNzQxNC4xNjkwMjA0OTEz%2a_ga_X9SH3KP7B4%2aMTY5MDIwNDkxMi4xLjEuMTY5MDIwNDkxNy4wLjAuMA..
 * Source: https://youmightnotneed.com/lodash#set
 */

module.exports = function set(obj, path, value) {
  // Regex explained: https://regexr.com/58j0k
  const pathArray = Array.isArray(path) ? path : path.match(/([^[.\]])+/g)

  pathArray.reduce((acc, key, i) => {
    if (acc[key] === undefined) acc[key] = {}
    if (i === pathArray.length - 1) acc[key] = value
    return acc[key]
  }, obj)
}
