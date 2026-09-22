import Conf from 'conf';
import os from 'os';
import path from 'path';
import { AppConfig } from '../types/index';

const DEFAULTS: AppConfig = {
  checkIntervalSeconds: 30,
  connectivityTestUrl: 'http://connectivitycheck.gstatic.com/generate_204',
  portalDetectionUrl: 'http://example.com',
  maxRetries: 5,
  backoffBaseMs: 2000,
  logLevel: 'info',
  logFile: null,
  daemonPidFile: path.join(os.homedir(), '.iiitn-auth-cli', 'daemon.pid'),
  portalBaseUrl: 'https://172.16.0.30:1003',
  loginPath: '/fgtauth',
  keepalivePath: '/keepalive',
  logoutPath: '/logout',
  keepaliveIntervalChecks: 10,
};

const store = new Conf<AppConfig>({
  projectName: 'iiitn-auth-cli',
  defaults: DEFAULTS,
  schema: {
    checkIntervalSeconds: { type: 'number', minimum: 5, default: 30 },
    connectivityTestUrl: { type: 'string', default: DEFAULTS.connectivityTestUrl },
    portalDetectionUrl: { type: 'string', default: DEFAULTS.portalDetectionUrl },
    maxRetries: { type: 'number', minimum: 1, default: 5 },
    backoffBaseMs: { type: 'number', minimum: 100, default: 2000 },
    logLevel: { type: 'string', default: 'info' },
    logFile: { type: ['string', 'null'], default: null },
    daemonPidFile: { type: 'string', default: DEFAULTS.daemonPidFile },
    portalBaseUrl: { type: 'string', default: DEFAULTS.portalBaseUrl },
    loginPath: { type: 'string', default: '/fgtauth' },
    keepalivePath: { type: 'string', default: '/keepalive' },
    logoutPath: { type: 'string', default: '/logout' },
    keepaliveIntervalChecks: { type: 'number', minimum: 1, default: 10 },
  } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
});

export function getConfig(): AppConfig {
  return store.store;
}

export function setConfigValue<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  store.set(key, value);
}

export function resetConfig(): void {
  store.clear();
}

export function getConfigPath(): string {
  return store.path;
}

export function getSanitizedConfig(): AppConfig {
  return { ...store.store };
}
