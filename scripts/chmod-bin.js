#!/usr/bin/env node
/**
 * Post-build script: sets the executable bit on the CLI entry point.
 * This is a no-op on Windows but required for Linux/macOS so that
 * `npx iiitn-auth-cli` and global installs work without `node` prefix.
 */

const fs = require('fs');
const path = require('path');

const bin = path.resolve(__dirname, '..', 'build', 'index.js');

if (!fs.existsSync(bin)) {
  console.error(`chmod-bin: build/index.js not found at ${bin}`);
  process.exit(1);
}

// chmod +x (mode 0755) — ignored silently on Windows
try {
  fs.chmodSync(bin, 0o755);
  console.log(`chmod-bin: set executable bit on ${bin}`);
} catch (err) {
  // Non-fatal on platforms that don't support chmod (e.g. Windows native)
  if (err.code !== 'ENOTSUP') {
    console.warn(`chmod-bin: warning — ${err.message}`);
  }
}
