#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { statusCommand } from './commands/status';
import { connectCommand } from './commands/connect';
import { daemonCommand } from './commands/daemon';
import { configCommand } from './commands/config';
import { enableAutostartCommand, disableAutostartCommand } from './commands/autostart';
import { helpCommand } from './commands/help';
import { exportLogsCommand } from './commands/export-logs';
import { showMenu } from './commands/menu';
import { uninstallCommand } from './commands/uninstall';
import { completionCommand } from './commands/completion';
import { printBanner } from './utils/banner';
import { checkForUpdate } from './utils/update-check';
import { ExitCode } from './types/index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('iiitn-auth-cli')
  .description(chalk.cyan('Automatic authenticator for the IIITN Fortinet captive portal'))
  .version(pkg.version, '-v, --version')
  .action(async () => {
    await checkForUpdate(pkg.version);
    printBanner(pkg.version);
    const code = await showMenu();
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('login')
  .description('Save credentials and verify authentication')
  .option('-f, --force', 'Re-enter credentials even if already saved')
  .action(async (opts: { force?: boolean }) => {
    const code = await loginCommand({ force: opts.force });
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('logout')
  .description('Remove saved credentials and log out from portal')
  .action(async () => {
    const code = await logoutCommand();
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('status')
  .description('Show current authentication and connectivity status')
  .action(async () => {
    const code = await statusCommand();
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('connect')
  .description('Force an immediate authentication attempt')
  .action(async () => {
    const code = await connectCommand();
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('daemon')
  .description('Run continuously and auto-reconnect when session expires')
  .option('-f, --foreground', 'Run in foreground (default)')
  .action(async (opts: { foreground?: boolean }) => {
    const code = await daemonCommand({ foreground: opts.foreground });
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('enable-autostart')
  .description('Configure the daemon to start at system boot (systemd / launchd / Task Scheduler)')
  .action(async () => {
    const code = await enableAutostartCommand();
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('disable-autostart')
  .description('Remove the autostart configuration')
  .action(async () => {
    const code = await disableAutostartCommand();
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('config')
  .description('View or modify configuration')
  .option('--set <key=value>', 'Set a config value')
  .option('--reset', 'Reset all settings to defaults')
  .option('--path', 'Print the path to the config file')
  .action(async (opts: { set?: string; reset?: boolean; path?: boolean }) => {
    const code = await configCommand({ set: opts.set, reset: opts.reset, path: opts.path });
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('help', { hidden: false })
  .description('Show the full README and documentation in the terminal')
  .action(async () => {
    const code = await helpCommand();
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('export-logs')
  .description('Bundle logs, config, and system info into a shareable report file')
  .option(
    '-o, --output <path>',
    'Custom output file path (default: ~/Desktop/iiitn-auth-cli-report-<timestamp>.txt)',
  )
  .action(async (opts: { output?: string }) => {
    const code = await exportLogsCommand({ output: opts.output });
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('uninstall')
  .description('Remove all credentials, config, autostart entries, and data directory')
  .action(async () => {
    const code = await uninstallCommand();
    process.exit(code ?? ExitCode.OK);
  });

program
  .command('completion')
  .description('Generate shell completion script')
  .argument('<shell>', 'Shell type: bash, zsh, or fish')
  .action(async (shell: string) => {
    const code = await completionCommand(shell);
    process.exit(code ?? ExitCode.OK);
  });

program.addHelpText(
  'after',
  `
${chalk.dim('Examples:')}
  ${chalk.cyan('iiitn-auth-cli')}                                   Open interactive menu
  ${chalk.cyan('iiitn-auth-cli login')}                             Save credentials and authenticate
  ${chalk.cyan('iiitn-auth-cli status')}                            Check current connection state
  ${chalk.cyan('iiitn-auth-cli connect')}                           Manually trigger authentication
  ${chalk.cyan('iiitn-auth-cli daemon')}                            Start monitoring daemon
  ${chalk.cyan('iiitn-auth-cli enable-autostart')}                  Enable autostart at boot
  ${chalk.cyan('iiitn-auth-cli config --set checkIntervalSeconds=60')}  Tune check frequency
  ${chalk.cyan('iiitn-auth-cli help')}                              Show full README
  ${chalk.cyan('iiitn-auth-cli uninstall')}                         Remove all data and autostart
  ${chalk.cyan('iiitn-auth-cli completion bash')}                   Generate bash completion script
`,
);

if (process.argv.length > 2) {
  checkForUpdate(pkg.version).catch(() => {});
}

program.parseAsync(process.argv).catch(() => process.exit(ExitCode.ERROR));
