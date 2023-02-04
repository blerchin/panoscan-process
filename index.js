'use strict';

const fs = require('fs');
const readline = require('readline');
const assert = require('assert');
const jpeg = require('jpeg-js');

const CHUNK_SIZE = 1024;
const OUT_SIZE = 8192;

const ppmIn = process.argv[2]; const ppm = fs.createReadStream(ppmIn);
const out = process.argv[3];

let numOut = 0;
let srcWidth = 0;
let bufs = [];

ppm.on('readable', function() {
  let chunk;
  if(!srcWidth) {
    readHeader(ppm);
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
  //writeFile();
});

function writeFile() {
  console.log("writing " + bufs.length + " lines")
  const raster = Buffer.concat(bufs);
  const img = jpeg.encode({
    data: raster,
    height: OUT_SIZE,
    width: bufs.length 
  });
  fs.writeFileSync(out + '--' + numOut + '.jpg', img.data);
  bufs = [];
  numOut++;
  console.log("wrote lines");
}



function readHeader(stream) {
  let line = "";
  let max = false;
  while (!max) {
    line = ""
    let char;
    while(char != '\n') {
      char = stream.read(1).toString();
      line += char;
    }
    if (line[0] === '#') {
      continue;
    } else if (line === 'P6') {
      continue;
    } else if (!srcWidth) {
      srcWidth = parseInt(line.split(' ')[0]);
      continue;
    } else if (line.includes('65535')) {
      max = true;
    }
  }
  assert.notEqual(srcWidth, 0);
  assert.equal(max, true);
  console.log('width: ', srcWidth);
}
