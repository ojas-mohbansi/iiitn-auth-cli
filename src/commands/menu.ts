import inquirer from 'inquirer';
import chalk from 'chalk';
import { top, bottom, centeredRow, hRule, sectionRow, menuItemRow, emptyRow } from '../utils/tui';
import { loginCommand } from './login';
import { logoutCommand } from './logout';
import { statusCommand } from './status';
import { connectCommand } from './connect';
import { daemonCommand } from './daemon';
import { configCommand } from './config';
import { enableAutostartCommand, disableAutostartCommand } from './autostart';
import { helpCommand } from './help';
import { exportLogsCommand } from './export-logs';
import { uninstallCommand } from './uninstall';
import { completionCommand } from './completion';
import { crispRCommand } from './crispr';
import { ExitCode } from '../types/index';

function printMenuHeader(): void {
  console.log(top());
  console.log(centeredRow(chalk.cyan.bold('M A I N   M E N U')));
  console.log(hRule());
  console.log(sectionRow('Authentication'));
  console.log(menuItemRow('login', 'Save credentials and authenticate'));
  console.log(menuItemRow('logout', 'Remove credentials and log out'));
  console.log(menuItemRow('connect', 'Force an immediate auth attempt'));
  console.log(menuItemRow('status', 'Show connectivity & session status'));
  console.log(hRule());
  console.log(sectionRow('Daemon'));
  console.log(menuItemRow('daemon', 'Run continuous monitor (blocks until stopped)'));
  console.log(menuItemRow('enable-autostart', 'Configure daemon to start at system boot'));
  console.log(menuItemRow('disable-autostart', 'Remove autostart configuration'));
  console.log(hRule());
  console.log(sectionRow('Connect & Resources'));
  console.log(menuItemRow('crispr', 'Open rCRISPR — IIITN CRISPR Club FTP site'));
  console.log(hRule());
  console.log(sectionRow('Configuration & Help'));
  console.log(menuItemRow('config', 'View or modify configuration values'));
  console.log(menuItemRow('export-logs', 'Export diagnostic report for bug reports'));
  console.log(menuItemRow('help', 'Show full README and documentation'));
  console.log(hRule());
  console.log(sectionRow('Maintenance'));
  console.log(menuItemRow('uninstall', 'Remove all credentials, config, and autostart'));
  console.log(menuItemRow('completion', 'Generate shell completion script'));
  console.log(hRule());
  console.log(emptyRow());
  console.log(bottom());
}

const CHOICES = [
  new inquirer.Separator(chalk.dim('─── Authentication ──────────────────────────')),
  { name: `${chalk.green.bold('login')}           Save credentials & authenticate`, value: 'login' },
  { name: `${chalk.green.bold('logout')}          Remove credentials & log out`, value: 'logout' },
  { name: `${chalk.green.bold('connect')}         Force immediate auth attempt`, value: 'connect' },
  { name: `${chalk.green.bold('status')}          Connectivity & session status`, value: 'status' },
  new inquirer.Separator(chalk.dim('─── Daemon ──────────────────────────────────')),
  { name: `${chalk.green.bold('daemon')}          Run continuous monitor`, value: 'daemon' },
  { name: `${chalk.green.bold('enable-autostart')} Start daemon at boot`, value: 'enable-autostart' },
  { name: `${chalk.green.bold('disable-autostart')} Remove autostart`, value: 'disable-autostart' },
  new inquirer.Separator(chalk.dim('─── Connect & Resources ─────────────────────')),
  { name: `${chalk.green.bold('crispr')}          Open rCRISPR FTP site in browser`, value: 'crispr' },
  new inquirer.Separator(chalk.dim('─── Config & Help ───────────────────────────')),
  { name: `${chalk.green.bold('config')}          View or modify configuration`, value: 'config' },
  { name: `${chalk.green.bold('export-logs')}     Export diagnostic report`, value: 'export-logs' },
  { name: `${chalk.green.bold('help')}            Show full README`, value: 'help' },
  new inquirer.Separator(chalk.dim('─── Maintenance ─────────────────────────────')),
  { name: `${chalk.green.bold('uninstall')}       Remove all data & autostart`, value: 'uninstall' },
  { name: `${chalk.green.bold('completion')}      Generate shell completion script`, value: 'completion' },
  new inquirer.Separator(chalk.dim('─────────────────────────────────────────────')),
  { name: chalk.red.bold('exit'), value: 'exit' },
];

export async function showMenu(): Promise<ExitCode> {
  printMenuHeader();

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message:
        chalk.cyan('Select a command') + chalk.dim(' (↑↓ arrow keys, Enter to confirm)'),
      choices: CHOICES,
      pageSize: 20,
    },
  ]);

  console.log('');

  switch (choice) {
    case 'login':             return await loginCommand({});
    case 'logout':            return await logoutCommand();
    case 'status':            return await statusCommand();
    case 'connect':           return await connectCommand();
    case 'daemon':            return await daemonCommand({});
    case 'enable-autostart':  return await enableAutostartCommand();
    case 'disable-autostart': return await disableAutostartCommand();
    case 'crispr':            return await crispRCommand();
    case 'config':            return await configCommand({});
    case 'export-logs':       return await exportLogsCommand({});
    case 'help':              return await helpCommand();
    case 'uninstall':         return await uninstallCommand();
    case 'completion':        return await completionCommand('bash');
    case 'exit':
      console.log(chalk.dim('  Goodbye.\n'));
      return ExitCode.OK;
    default:
      return ExitCode.OK;
  }
}
