#!/usr/bin/env node
/**
 * Postinstall guidance script.
 *
 * - Local install (no -g): tells user to use npx or install globally.
 * - Global install on Windows: reminds user to verify %APPDATA%\npm is on PATH.
 */

const isGlobal  = process.env.npm_config_global === 'true';
const isWindows = process.platform === 'win32';

const W = 64;
const line  = '─'.repeat(W);
const top   = '┌' + line + '┐';
const bot   = '└' + line + '┘';

function row(text) {
  const pad = Math.max(0, W - text.length);
  return '│ ' + text + ' '.repeat(pad - 1) + '│';
}

function empty() {
  return '│' + ' '.repeat(W) + '│';
}

if (!isGlobal) {
  console.log('');
  console.log(top);
  console.log(row('  iiitn-auth-cli — installed locally'));
  console.log(empty());
  console.log(row('  To run without a global install, use:'));
  console.log(row('    npx iiitn-auth-cli'));
  console.log(empty());
  console.log(row('  Or install globally so the command is always available:'));
  console.log(row('    npm install -g iiitn-auth-cli'));
  console.log(bot);
  console.log('');
} else if (isWindows) {
  console.log('');
  console.log(top);
  console.log(row('  iiitn-auth-cli — installed globally'));
  console.log(empty());
  console.log(row('  Windows tip: if "iiitn-auth-cli" is not recognised,'));
  console.log(row('  your npm global bin folder may not be on PATH.'));
  console.log(empty());
  console.log(row('  To fix, run this in PowerShell (once):'));
  console.log(row('    [Environment]::SetEnvironmentVariable('));
  console.log(row('      "PATH",'));
  console.log(row('      $env:PATH + ";$env:APPDATA\\npm",'));
  console.log(row('      "User"'));
  console.log(row('    )'));
  console.log(empty());
  console.log(row('  Then open a new terminal window and try again.'));
  console.log(bot);
  console.log('');
}
