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

/** Returns true when the error is an inquirer "user force-closed the prompt" signal. */
function isPromptCancelled(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  // inquirer v8 throws an Error with this message on SIGINT / Ctrl+C
  return e.message.toLowerCase().includes('force closed') ||
         e.message.toLowerCase().includes('user force closed');
}

export async function loginCommand(options: { force?: boolean }): Promise<ExitCode> {
  createLogger({ level: getConfig().logLevel });

  const existing = await loadCredentials();
  if (existing && !options.force) {
    console.log(chalk.yellow(`Already logged in as ${chalk.bold(existing.username)}.`));
    console.log(chalk.dim('Use --force to re-enter credentials.'));
    return ExitCode.OK;
  }

  console.log(chalk.cyan.bold('\n  IIITN Captive Portal — Login Setup\n'));

  let answers: { username: string; password: string };
  try {
    answers = await inquirer.prompt([
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
    ]) as { username: string; password: string };
  } catch (e) {
    if (isPromptCancelled(e)) {
      console.log(chalk.dim('\n  Login cancelled.\n'));
      return ExitCode.OK;
    }
    throw e;
  }

  const creds = {
    username: answers.username.trim(),
    password: answers.password.trim(),
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

  // No captive portal detected — already online. Ask the user whether to save anyway.
  if (!portalInfo.isPortal) {
    spinner.info('No captive portal detected — you appear to be online already.');

    let confirm: { saveAnyway: boolean };
    try {
      confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'saveAnyway',
          message: 'Save credentials without verifying against the portal?',
          default: false,
        },
      ]) as { saveAnyway: boolean };
    } catch (e) {
      if (isPromptCancelled(e)) {
        console.log(chalk.dim('\n  Login cancelled.\n'));
        return ExitCode.OK;
      }
      throw e;
    }

    if (!confirm.saveAnyway) {
      console.log(chalk.dim('\n  Credentials not saved.\n'));
      return ExitCode.OK;
    }

    await saveCredentials(creds);
    setAuthenticated(creds.username);
    console.log(chalk.green(`\n✔ Credentials saved for ${chalk.bold(creds.username)}`));
    console.log(chalk.dim('  (Verification skipped — no portal detected.)'));
    console.log(chalk.dim('  Run `iiitn-auth-cli daemon` to keep the session alive automatically.\n'));
    return ExitCode.OK;
  }

  spinner.text = 'Portal detected — authenticating…';

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
