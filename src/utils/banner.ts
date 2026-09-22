import chalk from 'chalk';
import { top, bottom, centeredRow, hRule, labelRow } from './tui';

const IIITN_ART = [
  ' █████ █████ █████ ███████████ ██████   █████',
  '░░███ ░░███ ░░███ ░█░░░███░░░█░░██████ ░░███ ',
  ' ░███  ░███  ░███ ░   ░███  ░  ░███░███ ░███ ',
  ' ░███  ░███  ░███     ░███     ░███░░███░███ ',
  ' ░███  ░███  ░███     ░███     ░███ ░░██████ ',
  ' ░███  ░███  ░███     ░███     ░███  ░░█████ ',
  ' █████ █████ █████    █████    █████  ░░█████',
  '░░░░░ ░░░░░ ░░░░░    ░░░░░    ░░░░░    ░░░░░ ',
];

export function printBanner(version: string): void {
  console.log('');
  for (const line of IIITN_ART) {
    console.log(chalk.cyan(line));
  }
  console.log('');
  console.log(top());
  console.log(centeredRow(chalk.cyan.bold('AuthBahn CLI  ') + chalk.yellow(`v${version}`)));
  console.log(centeredRow(chalk.dim('Fortinet Captive Portal Authenticator')));
  console.log(hRule());
  console.log(labelRow('Made by', chalk.white.bold('Ojas S.K Mohbansi')));
  console.log(labelRow('Portal', chalk.dim('Fortinet / FortiGate (HTTPS)')));
  console.log(labelRow('Credential storage', chalk.dim('OS Keychain + AES-256-GCM fallback')));
  console.log(labelRow('Platform', chalk.dim('Linux  ·  macOS  ·  Windows')));
  console.log(bottom());
  console.log('');
}

