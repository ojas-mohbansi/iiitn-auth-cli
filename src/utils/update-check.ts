import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CACHE_FILE = path.join(os.homedir(), '.iiitn-auth-cli', 'update-check.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

interface UpdateCache {
  checkedAt: number;
  latestVersion: string;
}

function readCache(): UpdateCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(raw) as UpdateCache;
  } catch {
    return null;
  }
}

function writeCache(latestVersion: string): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ checkedAt: Date.now(), latestVersion }),
      { encoding: 'utf8', mode: 0o600 },
    );
  } catch {
    /* non-fatal */
  }
}

function fetchLatestVersion(packageName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${packageName}/latest`;
    const req = https.get(url, { timeout: FETCH_TIMEOUT_MS }, res => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        try {
          const json = JSON.parse(data) as { version?: string };
          if (json.version) resolve(json.version);
          else reject(new Error('No version in response'));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [lMaj, lMin, lPat] = parse(latest);
  const [cMaj, cMin, cPat] = parse(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

export async function checkForUpdate(currentVersion: string): Promise<void> {
  try {
    const cache = readCache();
    const now = Date.now();
    let latest: string;

    if (cache && now - cache.checkedAt < CACHE_TTL_MS) {
      latest = cache.latestVersion;
    } else {
      latest = await fetchLatestVersion('iiitn-auth-cli');
      writeCache(latest);
    }

    if (isNewer(latest, currentVersion)) {
      console.log(
        '\n  ' +
          chalk.bgYellow.black(' UPDATE AVAILABLE ') +
          '  ' +
          chalk.dim(`v${currentVersion}`) +
          ' → ' +
          chalk.green.bold(`v${latest}`) +
          '\n' +
          chalk.dim(`  Run: npm install -g iiitn-auth-cli\n`),
      );
    }
  } catch {
    /* silently ignore — no network, registry down, etc. */
  }
}
