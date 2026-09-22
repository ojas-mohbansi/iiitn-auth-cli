#!/usr/bin/env node
/**
 * Post-build script: copies README.md into build/ so that the packaged
 * `help` command can resolve it at runtime via __dirname.
 */

const fs   = require('fs');
const path = require('path');

const src  = path.resolve(__dirname, '..', 'README.md');
const dest = path.resolve(__dirname, '..', 'build', 'README.md');

if (!fs.existsSync(src)) {
  console.error('copy-readme: README.md not found at', src);
  process.exit(1);
}

const buildDir = path.dirname(dest);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('copy-readme: copied README.md →', dest);
