import ora from 'ora';
import chalk from 'chalk';
import { loadCredentials, deleteCredentials } from '../core/credentials';
import { clearSession } from '../core/session';
import { performLogout } from '../core/auth';
import { getConfig } from '../utils/config';
import { createLogger } from '../utils/logger';
import { ExitCode } from '../types/index';

export async function logoutCommand(): Promise<ExitCode> {
  createLogger({ level: getConfig().logLevel });

  const creds = await loadCredentials();
  if (!creds) {
    console.log(chalk.yellow('No credentials stored — nothing to log out from.'));
    return ExitCode.OK;
  }

  const spinner = ora('Logging out from portal…').start();

  try {
    const cfg = getConfig();
    await performLogout(cfg.portalBaseUrl);
    spinner.succeed('Logged out from portal');
  } catch {
    spinner.warn('Could not reach portal to log out (credentials will still be removed)');
  }

  await deleteCredentials();
  clearSession();

  console.log(chalk.green(`\n✔ Credentials removed for ${chalk.bold(creds.username)}`));
  return ExitCode.OK;
}
