import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadCredentials } from '../core/credentials';
import { runConnectivityLoop } from '../core/connectivity';
import { getConfig } from '../utils/config';
import { createLogger, info, warn, error } from '../utils/logger';
import { ExitCode } from '../types/index';

export async function daemonCommand(_options: { foreground?: boolean }): Promise<ExitCode> {
  const cfg = getConfig();
  createLogger({ level: cfg.logLevel, logFile: cfg.logFile ?? undefined });

  const creds = await loadCredentials();
  if (!creds) {
    console.log(chalk.red('No credentials found. Run `iiitn-auth-cli login` first.'));
    return ExitCode.NO_CREDENTIALS;
  }

  writePid(cfg.daemonPidFile);
  info(`Daemon starting (PID ${process.pid}) — checking every ${cfg.checkIntervalSeconds}s`);
  console.log(chalk.cyan(`Daemon running as PID ${process.pid}. Press Ctrl+C to stop.`));

  const controller = new AbortController();

  const shutdown = (sig: string) => {
    info(`Received ${sig} — shutting down`);
    controller.abort();
    removePid(cfg.daemonPidFile);
    setTimeout(() => process.exit(0), 500);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await runConnectivityLoop({
    signal: controller.signal,
    onAuthenticated: (username: string) => {
      info(`Re-authenticated as ${username}`);
    },
    onDisconnected: () => {
      warn('Network appears offline — will retry');
    },
    onError: (err: Error) => {
      error(`Unhandled error in monitor: ${err.message}`);
    },
  });

  return ExitCode.OK;
}

function writePid(pidFile: string): void {
  try {
    const dir = path.dirname(pidFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(pidFile, String(process.pid), { encoding: 'utf8', mode: 0o600 });
  } catch {
    /* non-fatal */
  }
}

function removePid(pidFile: string): void {
  try {
    if (fs.existsSync(pidFile)) fs.rmSync(pidFile);
  } catch {
    /* ignore */
  }
}
