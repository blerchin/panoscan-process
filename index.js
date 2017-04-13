'use strict';

const fs = require('fs');
const assert = require('assert');
const jpeg = require('jpeg-js');

const CHUNK_SIZE = 1024;
const OUT_FMT = 'TIFF';
const OUT_SIZE = 4096;

const ppmIn = process.argv[2];
const ppm = fs.createReadStream(ppmIn);
const out = process.argv[3];

let numOut = 0;
let srcWidth = 0;
let bufs = [];

ppm.on('readable', function() {
  let chunk;
  if (!srcWidth) {
    chunk = ppm.read(CHUNK_SIZE);
    let headLen = readHeader(chunk);
    chunk = Buffer.from(chunk.toString().slice(headLen));
    ppm.unshift(chunk)
  }
  while (null !== (chunk = ppm.read(srcWidth * 3))) {
    const alphaChunk = new Buffer(srcWidth * 4);
    for (let i = 0; i < srcWidth; i++) {
      alphaChunk[i * 4] = chunk[i * 3];
      alphaChunk[i * 4 + 1] = chunk[i * 3 + 1];
      alphaChunk[i * 4 + 2] = chunk[i * 3 + 2];
      alphaChunk[i * 4 + 3] = 0xFF;
    }
    bufs.push(alphaChunk);
    if (bufs.length === OUT_SIZE) {
      writeFile();
    }
  }
});

function writeFile() {
  const raster = Buffer.concat(bufs);
  const img = jpeg.encode({
    data: raster,
    height: OUT_SIZE,
    width: srcWidth
  });
  fs.writeFileSync(out + '--' + numOut + '.jpg', img.data);
  bufs = [];
  numOut++;
}



function readHeader(buf) {
  let lines = buf.toString('utf-8').split('\n');
  let line = 0;
  let chars = 0;
  function next() {
    chars += lines[line].length + 1;
    line++;
  }
  while (chars < buf.length && line < 6) {
    if (lines[line][0] === '#') {
      next();
    } else if (lines[line] === 'P6') {
      next();
    } else if (!srcWidth) {
      srcWidth = parseInt(lines[line].split(' ')[0]);
      next();
    } else {
      assert.equal(lines[line], '65535')
      next();
    }
  }
  assert.notEqual(srcWidth, 0);
  return chars;
}