import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { deleteCredentials } from '../core/credentials';
import { clearSession } from '../core/session';
import { resetConfig } from '../utils/config';
import { disableAutostartCommand } from './autostart';
import { ExitCode } from '../types/index';

export async function uninstallCommand(): Promise<ExitCode> {
  console.log(chalk.yellow.bold('\n  ⚠  IIITN Auth CLI — Uninstall\n'));
  console.log(chalk.dim('  This will remove all credentials, configuration, autostart entries,'));
  console.log(chalk.dim(`  and the ~/.iiitn-auth-cli/ data directory.\n`));

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'This will remove all credentials, config, and autostart. Continue?',
      default: false,
    },
  ]);

  if (!confirmed) {
    console.log(chalk.dim('\n  Uninstall cancelled.\n'));
    return ExitCode.OK;
  }

  const steps: string[] = [];

  // 1. Disable autostart (best-effort)
  try {
    await disableAutostartCommand();
    steps.push('Autostart entry removed');
  } catch {
    steps.push('Autostart removal skipped (not configured or unsupported)');
  }

  // 2. Delete credentials
  await deleteCredentials();
  steps.push('Credentials deleted');

  // 3. Clear session
  clearSession();
  steps.push('Session cleared');

  // 4. Reset config
  resetConfig();
  steps.push('Configuration reset to defaults');

  // 5. Remove data directory
  const dataDir = path.join(os.homedir(), '.iiitn-auth-cli');
  fs.rmSync(dataDir, { recursive: true, force: true });
  steps.push(`Data directory removed (${dataDir})`);

  console.log(chalk.green('\n  ✔ Uninstall complete:\n'));
  for (const step of steps) {
    console.log(chalk.green(`    • ${step}`));
  }
  console.log('');

  return ExitCode.OK;
}
