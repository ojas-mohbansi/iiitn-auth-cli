import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { loadCredentials, saveCredentials } from '../core/credentials';
import { detectPortal } from '../core/portal';
import { performLogin } from '../core/auth';
import { setAuthenticated } from '../core/session';
import { createLogger } from '../utils/logger';
import { getConfig } from '../utils/config';
import { ExitCode } from '../types/index';

export async function loginCommand(options: { force?: boolean }): Promise<ExitCode> {
  createLogger({ level: getConfig().logLevel });

  const existing = await loadCredentials();
  if (existing && !options.force) {
    console.log(chalk.yellow(`Already logged in as ${chalk.bold(existing.username)}.`));
    console.log(chalk.dim('Use --force to re-enter credentials.'));
    return ExitCode.OK;
  }

  console.log(chalk.cyan.bold('\n  IIITN Captive Portal — Login Setup\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'IIITN Username:',
      validate: (v: string) => v.trim().length > 0 || 'Username is required',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
      validate: (v: string) => v.trim().length > 0 || 'Password is required',
    },
  ]);

  const creds = {
    username: (answers.username as string).trim(),
    password: (answers.password as string).trim(),
  };

  const spinner = ora('Detecting portal…').start();

  let portalInfo;
  try {
    portalInfo = await detectPortal();
  } catch (e) {
    spinner.fail('Portal detection failed');
    console.error(chalk.red((e as Error).message));
    return ExitCode.ERROR;
  }

  if (!portalInfo.isPortal) {
    spinner.info('No captive portal detected — you may already be connected.');
    spinner.start('Saving credentials and verifying against portal anyway…');
    portalInfo = {
      isPortal: true,
      loginUrl: `${getConfig().portalBaseUrl}${getConfig().loginPath}`,
    };
  } else {
    spinner.text = 'Portal detected — authenticating…';
  }

  const result = await performLogin(creds, portalInfo);

  if (!result.success) {
    spinner.fail(`Authentication failed: ${result.message}`);
    console.log(chalk.red('Credentials were NOT saved.'));
    return ExitCode.AUTH_FAILED;
  }

  spinner.succeed('Authentication successful!');
  await saveCredentials(creds);
  setAuthenticated(creds.username);

  console.log(chalk.green(`\n✔ Credentials saved for ${chalk.bold(creds.username)}`));
  console.log(chalk.dim('Run `iiitn-auth-cli daemon` to keep the session alive automatically.'));

  return ExitCode.OK;
}
