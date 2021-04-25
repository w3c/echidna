'use strict';

const fs = require('fs');
const { substitutions } = require('./utils');
const { getMetadata } = require('./utils');
const { endsWith } = require('./utils');

/**
 * @exports test/lib/htmlTemplate
 */

function htmlTemplate(serverPath, fileSystemPath) {
  // Will apply all the substitutions in the parameter s
  // including the substitutions contained in metadata
  // Return the string after replacement

  function applyTemplate(s, metadata) {
    const str = s.toString();

    function replace(oldstart) {
      if (oldstart > str.length) return '';

      const start = str.indexOf('{{', oldstart);
      const end = str.indexOf('}}', oldstart);

      if (start === -1 || end === -1 || end <= start + 1) {
        return str.substring(oldstart);
      }

      const name = str.substring(start + 2, end).trim();
      let replacement = '';

      if (substitutions[name] !== undefined) {
        replacement += substitutions[name];
      } else if (metadata[name] !== undefined) {
        replacement += metadata[name];
      } else
        throw new Error('htmltemplate.js: %s not a valid substitution', name);

      return str.substring(oldstart, start) + replacement + replace(end + 2);
    }

    return replace(0);
  }

  return function (req, res, next) {
    let path = req.url;

    if (path.indexOf(serverPath) !== 0) return next();
    if (endsWith(path, '/')) path += 'index.html';
    if (!endsWith(path, '.html')) return next();

    const filepath = fileSystemPath + path.substring(serverPath.length);
    let content = null;
    let metadata = null;

    try {
      // Load the file
      content = fs.readFileSync(filepath, { options: 'utf-8' });
      // Load the metadata associated with the file (if any)
      const dirpath = filepath.substring(0, filepath.lastIndexOf('/'));
      const name = dirpath.substring(dirpath.lastIndexOf('/') + 1);

      metadata = getMetadata(name);
    } catch (e) {
      return next();
    }

    res.send(applyTemplate(content, metadata));
  };
}

module.exports = htmlTemplate;
