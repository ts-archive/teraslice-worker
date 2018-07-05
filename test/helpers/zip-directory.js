'use strict';

const path = require('path');
const shortid = require('shortid');
const random = require('lodash/random');
const BufferStreams = require('bufferstreams');
const archiver = require('archiver');

function zipDirectory(dir) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.append(JSON.stringify({
            name: path.basename(dir),
            version: `${random(0, 100)}.${random(0, 100)}.${random(0, 100)}`,
            someProp: shortid.generate()
        }, null, 4), { name: 'asset.json' });
        archive.pipe(new BufferStreams((err, buf) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(buf);
        }));
        archive.directory(dir, 'asset').finalize();
    });
}

module.exports = zipDirectory;