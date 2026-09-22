import ora from 'ora';
import chalk from 'chalk';
import { loadCredentials } from '../core/credentials';
import { detectPortal } from '../core/portal';
import { performLogin } from '../core/auth';
import { setAuthenticated } from '../core/session';
import { getConfig } from '../utils/config';
import { withRetry } from '../utils/backoff';
import { createLogger } from '../utils/logger';
import { ExitCode } from '../types/index';

export async function connectCommand(): Promise<ExitCode> {
  const cfg = getConfig();
  createLogger({ level: cfg.logLevel });

  const creds = await loadCredentials();
  if (!creds) {
    console.log(chalk.red('No credentials found. Run `iiitn-auth-cli login` first.'));
    return ExitCode.NO_CREDENTIALS;
  }

  const spinner = ora('Detecting portal…').start();

  let portalInfo;
  try {
    portalInfo = await detectPortal();
  } catch (e) {
    spinner.fail(`Portal detection error: ${(e as Error).message}`);
    return ExitCode.ERROR;
  }

  if (!portalInfo.isPortal) {
    spinner.info('No captive portal detected — you may already be online.');
    spinner.start('Attempting authentication anyway…');
    portalInfo = {
      isPortal: true,
      loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`,
    };
  } else {
    // istanbul ignore next
    spinner.text = `Portal found at ${portalInfo.portalUrl ?? portalInfo.loginUrl} — connecting…`;
  }

  const result = await withRetry(
    async () => {
      const r = await performLogin(creds, portalInfo);
      if (!r.success) throw new Error(r.message);
      return r;
    },
    { maxAttempts: cfg.maxRetries, baseMs: cfg.backoffBaseMs },
    'connect',
  ).catch((e: Error) => ({ success: false, message: e.message }));

  if (result.success) {
    spinner.succeed(`Connected as ${chalk.bold(creds.username)}`);
    setAuthenticated(creds.username);
    return ExitCode.OK;
  } else {
    spinner.fail(`Connection failed: ${result.message}`);
    return ExitCode.AUTH_FAILED;
  }
}
