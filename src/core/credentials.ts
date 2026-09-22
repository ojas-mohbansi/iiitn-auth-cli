import { encrypt, decrypt } from '../utils/crypto';
import { debug, error } from '../utils/logger';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { Credentials } from '../types/index';

const SERVICE = 'iiitn-auth-cli';
const ACCOUNT = 'credentials';
const FALLBACK_FILE = path.join(os.homedir(), '.iiitn-auth-cli', '.creds');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let keytar: any = null;

async function tryLoadKeytar(): Promise<typeof keytar> {
  if (keytar !== null) return keytar;
  try {
    keytar = await import('keytar');
    return keytar;
  } catch {
    debug('keytar unavailable — falling back to encrypted file storage');
    return null;
  }
}

function ensureDir(): void {
  const dir = path.dirname(FALLBACK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

export async function saveCredentials(creds: Credentials): Promise<void> {
  const kt = await tryLoadKeytar();
  const payload = JSON.stringify({ username: creds.username, password: creds.password });

  if (kt) {
    try {
      await kt.setPassword(SERVICE, ACCOUNT, encrypt(payload));
      debug('Credentials stored in OS keychain');
      return;
    } catch (e) {
      debug(`Keychain write failed: ${e}. Falling back to file.`);
    }
  }

  ensureDir();
  fs.writeFileSync(FALLBACK_FILE, encrypt(payload), { encoding: 'utf8', mode: 0o600 });
  debug('Credentials stored in encrypted file');
}

export async function loadCredentials(): Promise<Credentials | null> {
  const kt = await tryLoadKeytar();

  if (kt) {
    try {
      const raw = await kt.getPassword(SERVICE, ACCOUNT);
      if (raw) {
        const parsed = JSON.parse(decrypt(raw)) as Credentials;
        debug('Credentials loaded from OS keychain');
        return parsed;
      }
    } catch (e) {
      debug(`Keychain read failed: ${e}. Trying file fallback.`);
    }
  }

  if (fs.existsSync(FALLBACK_FILE)) {
    try {
      const raw = fs.readFileSync(FALLBACK_FILE, 'utf8');
      const parsed = JSON.parse(decrypt(raw)) as Credentials;
      debug('Credentials loaded from encrypted file');
      return parsed;
    } catch (e) {
      error(`Failed to read credentials from file: ${e}`);
    }
  }

  return null;
}

export async function deleteCredentials(): Promise<boolean> {
  let deleted = false;
  const kt = await tryLoadKeytar();

  if (kt) {
    try {
      deleted = await kt.deletePassword(SERVICE, ACCOUNT);
    } catch {
      /* ignore */
    }
  }

  if (fs.existsSync(FALLBACK_FILE)) {
    fs.rmSync(FALLBACK_FILE, { force: true });
    deleted = true;
  }

  return deleted;
}

export async function hasCredentials(): Promise<boolean> {
  const creds = await loadCredentials();
  return creds !== null;
}
