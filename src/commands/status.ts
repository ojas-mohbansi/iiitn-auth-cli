import chalk from 'chalk';
import ora from 'ora';
import { top, bottom, centeredRow, hRule, sectionRow, labelRow, emptyRow } from '../utils/tui';
import { checkConnectivity } from '../core/portal';
import { hasCredentials, loadCredentials } from '../core/credentials';
import { getSession } from '../core/session';
import { getConfig } from '../utils/config';
import { createLogger } from '../utils/logger';
import { ExitCode } from '../types/index';

function yesNo(val: boolean): string {
  return val ? chalk.green.bold('✔  Online') : chalk.red.bold('✘  Offline');
}

function boolLabel(val: boolean, yes = 'Yes', no = 'No'): string {
  return val ? chalk.green(`✔  ${yes}`) : chalk.red(`✘  ${no}`);
}

function portalStatus(isCaptive: boolean): string {
  return isCaptive ? chalk.yellow.bold('⚠  Detected') : chalk.green('✔  None detected');
}

export async function statusCommand(): Promise<ExitCode> {
  createLogger({ level: getConfig().logLevel, silent: true });

  const spinner = ora({ text: chalk.dim(' Checking status…'), prefixText: '' }).start();

  const [connectivity, credsStored, creds, session] = await Promise.all([
    checkConnectivity(),
    hasCredentials(),
    loadCredentials(),
    Promise.resolve(getSession()),
  ]);

  spinner.stop();

  const lastAuth = session.lastAuthAt
    ? chalk.dim(new Date(session.lastAuthAt).toLocaleString())
    : chalk.dim('Never');

  const cfg = getConfig();

  console.log('\n' + top());
  console.log(centeredRow(chalk.cyan.bold('S T A T U S')));
  console.log(hRule());
  console.log(sectionRow('Connectivity'));
  console.log(labelRow('Internet', yesNo(connectivity.hasInternet)));
  console.log(labelRow('Captive portal', portalStatus(connectivity.isCaptivePortal)));
  console.log(labelRow('Authenticated', boolLabel(connectivity.isAuthenticated)));
  console.log(hRule());
  console.log(sectionRow('Credentials'));
  console.log(labelRow('Stored', boolLabel(credsStored)));
  console.log(labelRow('Username', creds ? chalk.bold(creds.username) : chalk.dim('—')));
  console.log(labelRow('Last auth', lastAuth));
  console.log(hRule());
  console.log(sectionRow('Configuration'));
  console.log(labelRow('Portal URL', chalk.dim(cfg.portalBaseUrl)));
  console.log(labelRow('Check interval', chalk.yellow(`${cfg.checkIntervalSeconds}s`)));
  console.log(labelRow('Log level', chalk.dim(cfg.logLevel)));

  if (connectivity.isCaptivePortal && !connectivity.isAuthenticated) {
    console.log(hRule());
    console.log(emptyRow());
    console.log(
      centeredRow(
        chalk.yellow.bold('⚠  Portal active — run ') +
          chalk.cyan('connect') +
          chalk.yellow.bold(' to authenticate'),
      ),
    );
    console.log(emptyRow());
  }

  console.log(bottom());
  console.log('');

  return ExitCode.OK;
}
