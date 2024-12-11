/**
 * @file Download file from tar file or manifest url, called by orchestrator.js
 */

'use strict';

import Fs from 'fs';
import sua from 'superagent';
import pkg from 'immutable';
import Promise from 'promise';
import Url from 'url';
import { mkdirp } from 'mkdirp';
import { dirname } from 'path';
import { fileTypeFromBuffer } from 'file-type';
import tar from 'tar-stream';

const { List } = pkg;

/**
 * @exports lib/document-downloader
 */

const DocumentDownloader = {};

DocumentDownloader.fetch = url =>
  new Promise((resolve, reject) => {
    sua
      .get(url)
      .set('User-Agent', 'W3C/Echidna')
      .end((err, res) => {
        if (err) {
          reject(
            new Error(
              `Fetching ${url} triggered a network error: ${err.message}`,
            ),
          );
        } else if (res.statusCode !== 200) {
          reject(
            new Error(
              `Fetching ${url} triggered an HTTP error: code ${res.statusCode}`,
            ),
          );
        } else resolve(res.body);
      });
  });

DocumentDownloader.fetchAll = urls =>
  Promise.all(urls.toArray().map(DocumentDownloader.fetch)).then(List);

DocumentDownloader.install = (dest, content) => {
  const path = dirname(dest);

  mkdirp.sync(path);
  return Promise.denodeify(Fs.writeFile)(dest, content);
};

DocumentDownloader.installAll = destsContents =>
  // `e` is a tuple of [dest, content]
  Promise.all(
    destsContents.toArray().map(e => DocumentDownloader.install(e[0], e[1])),
  );

/**
 * Checks if a given filename is allowed to be published by the system.
 *
 * @param {string} filename - The filename to check against
 * @returns {boolean} `true` if the filename is allowed, `false` otherwise
 */
DocumentDownloader.isAllowed = function isAllowed(filename) {
  if (filename.toLowerCase().indexOf('.htaccess') !== -1) return false;
  if (filename.toLowerCase().indexOf('.php') !== -1) return false;
  if (filename.indexOf('CVS') !== -1) return false;
  if (filename.indexOf('../') !== -1) return false;
  if (filename.indexOf('://') !== -1) return false;
  return true;
};

DocumentDownloader.fetchAndInstall = (url, dest) => {
  const _ = DocumentDownloader; // Class name shortener
  const mkdir = Promise.denodeify(Fs.mkdir);

  return new Promise(resolve => {
    Fs.access(dest, Fs.constants.F_OK, error => {
      resolve(!error);
    });
  })
    .then(pathExists => (!pathExists ? mkdir(dest) : null))
    .then(() =>
      _.fetch(url).then(content =>
        fileTypeFromBuffer(content).then(type => {
          if (type && type.mime !== 'application/x-tar') {
            throw new TypeError('Only tar, html and manifest are supported.');
          } else if (type && type.mime === 'application/x-tar') {
            return new Promise((resolve, reject) => {
              const extract = tar.extract();
              let hasOverview = false;

              extract.on('entry', (header, stream, callback) => {
                stream.on('data', data => {
                  if (_.isAllowed(header.name)) {
                    if (header.name === 'Overview.html') {
                      hasOverview = true;
                    }
                    const path = dirname(`${dest}/${header.name}`);

                    mkdirp.sync(path);
                    Fs.writeFileSync(`${dest}/${header.name}`, data);
                  }
                });
                stream.on('end', () => {
                  callback();
                });
              });
              extract.on('finish', () =>
                hasOverview
                  ? resolve()
                  : reject(new Error('No Overview.html in the tarball.')),
              );
              extract.end(content);
            });
          } else {
            const contentUtf8 = content.toString('utf8');

            // html files link <!DOCTYPE html> starts with '<'
            if (contentUtf8.trim().charAt(0) !== '<') {
              const filenames = _.getFilenames(contentUtf8).filter(_.isAllowed);

              const dests = filenames
                .set(0, 'Overview.html')
                .map(filename => `${dest}/${filename}`);

              const urls = filenames.map(filename => {
                // If an entry in the manifest had a space in it,
                // we assume it needs to be built from the spec-generator.
                // See https://github.com/w3c/spec-generator
                const specGeneratorComp = filename.split(' ');
                const absUrl = new Url.URL(specGeneratorComp[0], url);

                if (specGeneratorComp.length === 2) {
                  return `${global.SPEC_GENERATOR}?type=${encodeURIComponent(
                    specGeneratorComp[1],
                  )}&url=${encodeURIComponent(absUrl)}`;
                }
                return absUrl;
              });

              return _.fetchAll(urls).then(contents =>
                // dests.zip(contents) -> [['Overview.html', '<!DOCTYPE>...'], ...]
                _.installAll(dests.zip(contents)),
              );
            }
            return _.install(`${dest}/Overview.html`, content);
          }
        }),
      ),
    );
};

DocumentDownloader.getFilenames = function getFilenames(manifest) {
  return manifest.split('\n').reduce((acc, line) => {
    const filename = line.split('#')[0].trim();

    if (filename !== '') return acc.push(filename);
    return acc;
  }, new List());
};

export default DocumentDownloader;
