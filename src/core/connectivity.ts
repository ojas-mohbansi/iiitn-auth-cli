import { checkConnectivity } from './portal';
import { loadCredentials } from './credentials';
import { performLogin, performKeepalive } from './auth';
import { setAuthenticated } from './session';
import { getConfig } from '../utils/config';
import { withRetry } from '../utils/backoff';
import { info, warn, error, debug } from '../utils/logger';
import { ConnectivityStatus, PortalInfo } from '../types/index';

export interface MonitorOptions {
  onAuthenticated?: (username: string) => void;
  onDisconnected?: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function runConnectivityLoop(opts: MonitorOptions = {}): Promise<void> {
  const cfg = getConfig();
  const { signal } = opts;

  info('Connectivity monitor started');
  let checkCount = 0;

  while (!signal?.aborted) {
    try {
      const status = await checkConnectivity();
      await handleStatus(status, opts);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      error(`Monitor cycle error: ${err.message}`);
      opts.onError?.(err);
    }

    checkCount++;

    // Fire keepalive every N checks
    if (checkCount > 0 && checkCount % cfg.keepaliveIntervalChecks === 0) {
      const alive = await performKeepalive(cfg.portalBaseUrl);
      info(`Keepalive ping at check #${checkCount}: ${alive ? 'OK' : 'failed'}`);
    }

    if (signal?.aborted) break;
    debug(`Next check in ${cfg.checkIntervalSeconds}s`);
    await interruptibleSleep(cfg.checkIntervalSeconds * 1000, signal);
  }

  info('Connectivity monitor stopped');
}

async function handleStatus(status: ConnectivityStatus, opts: MonitorOptions): Promise<void> {
  const cfg = getConfig();

  if (status.hasInternet && status.isAuthenticated) {
    debug('Internet up — authenticated');
    return;
  }

  if (!status.isCaptivePortal && !status.hasInternet) {
    warn('No internet and no captive portal detected — possibly offline');
    opts.onDisconnected?.();
    return;
  }

  if (status.isCaptivePortal) {
    info('Captive portal detected — attempting re-authentication…');
    const creds = await loadCredentials();
    if (!creds) {
      error('No stored credentials — run `iiitn-auth-cli login` first');
      return;
    }

    const portalInfo = status.portalInfo as PortalInfo;
    let loginSuccess = false;
    let loginMessage = '';

    try {
      await withRetry(
        async () => {
          const r = await performLogin(creds, portalInfo);
          if (!r.success) throw new Error(r.message);
          return r;
        },
        { maxAttempts: cfg.maxRetries, baseMs: cfg.backoffBaseMs },
        'auto-login',
      );
      loginSuccess = true;
    } catch (e) {
      loginMessage = e instanceof Error ? e.message : String(e);
    }

    if (loginSuccess) {
      setAuthenticated(creds.username);
      opts.onAuthenticated?.(creds.username);
    } else {
      warn(`Auto-login failed: ${loginMessage}`);
    }
  }
}

function interruptibleSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
