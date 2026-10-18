#!/usr/bin/env node

/**
 * iiitn-auth-cli — CLI entry point
 * Handles --setup, --start, --status, --logout, --log
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const readline = require('readline');
const { login, checkKeepalive, exponentialBackoff } = require('./auth');

// ─── Paths ────────────────────────────────────────────────────────────────────
const CONFIG_DIR  = path.join(os.homedir(), '.authbahn');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const LOG_FILE    = path.join(CONFIG_DIR, 'authbahn.log');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function log(msg) {
  const ts   = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  process.stdout.write(line);
  ensureConfigDir();
  fs.appendFileSync(LOG_FILE, line);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(cfg) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function decodePassword(cfg) {
  return cfg.encrypted
    ? Buffer.from(cfg.password, 'base64').toString('utf8')
    : cfg.password;
}

function prompt(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer); });
  });
}

function promptHidden(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    const rl = readline.createInterface({ input: process.stdin, output: null, terminal: false });
    // If stdin is a TTY, hide input
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    let input = '';
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', function handler(char) {
      // non-TTY fallback — just read a line
      process.stdin.removeListener('data', handler);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdout.write('\n');
      rl.close();
      resolve(char.replace(/[\r\n]/, ''));
    });
    rl.on('line', line => {
      rl.close();
      process.stdout.write('\n');
      resolve(line);
    });
  });
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdSetup() {
  console.log('=== iiitn-auth-cli Setup ===\n');
  const username  = await prompt('Username: ');
  const password  = await prompt('Password: ');
  const encAnswer = await prompt('Encrypt password storage? (base64 obfuscation) [y/N]: ');
  const encrypt   = encAnswer.trim().toLowerCase() === 'y';

  const cfg = {
    username: username.trim(),
    password: encrypt
      ? Buffer.from(password).toString('base64')
      : password,
    encrypted: encrypt,
  };

  saveConfig(cfg);
  console.log(`\nConfig saved to ${CONFIG_FILE}`);
  console.log('Run "iiitn-auth-cli --start" to begin the auth loop.');
}

async function cmdStart() {
  const cfg = loadConfig();
  if (!cfg || !cfg.username || !cfg.password) {
    console.error('No credentials found. Run "iiitn-auth-cli --setup" first.');
    process.exit(1);
  }

  const username = cfg.username;
  const password = decodePassword(cfg);

  log('Starting iiitn-auth-cli daemon');

  // Initial login
  let attempt = 0;
  const MAX_RETRIES = 5;

  async function authenticate() {
    while (attempt < MAX_RETRIES) {
      try {
        log(`Login attempt ${attempt + 1} for user "${username}"`);
        await login(username, password);
        log('Login successful');
        attempt = 0;
        return true;
      } catch (err) {
        attempt++;
        log(`Login failed: ${err.message}`);
        if (attempt >= MAX_RETRIES) {
          log('Max retries reached. Giving up.');
          return false;
        }
        const delay = exponentialBackoff(attempt - 1);
        log(`Retrying in ${delay}s...`);
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }
    return false;
  }

  const ok = await authenticate();
  if (!ok) process.exit(1);

  // Keepalive loop
  log('Entering keepalive loop (every 60s)');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise(r => setTimeout(r, 60_000));
    const alive = await checkKeepalive();
    if (alive) {
      log('Keepalive OK');
    } else {
      log('Keepalive failed — re-authenticating');
      attempt = 0;
      const reauth = await authenticate();
      if (!reauth) {
        log('Re-authentication failed. Exiting.');
        process.exit(1);
      }
    }
  }
}

async function cmdStatus() {
  const cfg = loadConfig();
  if (!cfg) {
    console.log('Status: NOT configured (run --setup first)');
    return;
  }
  console.log(`Username  : ${cfg.username}`);
  console.log(`Password  : ${cfg.encrypted ? '[base64-encoded]' : '[plain]'}`);
  process.stdout.write('Keepalive : checking... ');
  const alive = await checkKeepalive();
  console.log(alive ? 'CONNECTED' : 'DISCONNECTED');
}

async function cmdLogout() {
  // The auth server logout is just hitting the logout endpoint.
  // We replicate the extension: replace "keepalive" with "logout" in the keepalive URL.
  const LOGOUT_URL = 'https://192.168.55.253:1003/logout';
  const axios = require('axios');
  try {
    await axios.get(LOGOUT_URL, { timeout: 10000 });
    log('Logout request sent');
    console.log('Logged out.');
  } catch (err) {
    console.log(`Logout request failed (server may already have dropped session): ${err.message}`);
  }
}

function cmdLog() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log(`No log file found at ${LOG_FILE}`);
    return;
  }
  // Tail last 50 lines
  const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n');
  const tail  = lines.slice(-51).join('\n');
  console.log(tail);
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────
const arg = process.argv[2];

switch (arg) {
  case '--setup':  cmdSetup().catch(e => { console.error(e.message); process.exit(1); }); break;
  case '--start':  cmdStart().catch(e => { console.error(e.message); process.exit(1); }); break;
  case '--status': cmdStatus().catch(e => { console.error(e.message); process.exit(1); }); break;
  case '--logout': cmdLogout().catch(e => { console.error(e.message); process.exit(1); }); break;
  case '--log':    cmdLog(); break;
  default:
    console.log('Usage: iiitn-auth-cli [--setup|--start|--status|--logout|--log]');
    console.log('');
    console.log('  --setup    Interactive credential setup');
    console.log('  --start    Start the authentication + keepalive loop');
    console.log('  --status   Show current connection status');
    console.log('  --logout   Send logout request to the auth server');
    console.log('  --log      Tail the last 50 lines of the log file');
    process.exit(arg ? 1 : 0);
}
