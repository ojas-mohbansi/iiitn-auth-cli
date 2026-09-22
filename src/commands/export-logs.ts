import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, getConfigPath } from '../utils/config';
import { top, bottom, centeredRow, hRule, labelRow } from '../utils/tui';
import { ExitCode } from '../types/index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json') as { version: string };

function section(title: string, content: string): string {
  const bar = '='.repeat(64);
  return `\n${bar}\n  ${title}\n${bar}\n${content}\n`;
}

function resolveLogFile(logFile: string | null): string | null {
  if (!logFile) return null;
  return logFile.startsWith('~') ? path.join(os.homedir(), logFile.slice(1)) : logFile;
}

function systemInfo(): string {
  return [
    `Timestamp    : ${new Date().toISOString()}`,
    `CLI version  : v${pkg.version}`,
    `Node version : ${process.version}`,
    `Platform     : ${process.platform} (${os.release()})`,
    `Arch         : ${os.arch()}`,
    `Hostname     : ${os.hostname()}`,
    `Username     : ${os.userInfo().username}`,
    `Home dir     : ${os.homedir()}`,
  ].join('\n');
}

function sanitizeConfig(cfg: object): string {
  return JSON.stringify({ ...cfg }, null, 2);
}

export async function exportLogsCommand(opts: { output?: string }): Promise<ExitCode> {
  const spinner = ora('Gathering diagnostic information…').start();
  const cfg = getConfig();
  const logFilePath = resolveLogFile(cfg.logFile ?? null);

  let logContents = '';
  let logStatus = '';

  if (!logFilePath) {
    logStatus =
      'No log file configured. Run `iiitn-auth-cli config --set logFile=~/iiitn-auth-cli/iiitn.log` to enable file logging.';
  } else if (!fs.existsSync(logFilePath)) {
    logStatus = `Log file path is configured (${logFilePath}) but the file does not exist yet. Start the daemon or run a connect to generate logs.`;
  } else {
    try {
      const stat = fs.statSync(logFilePath);
      const maxBytes = 2 * 1024 * 1024;
      if (stat.size > maxBytes) {
        const fd = fs.openSync(logFilePath, 'r');
        const buf = Buffer.alloc(maxBytes);
        fs.readSync(fd, buf, 0, maxBytes, stat.size - maxBytes);
        fs.closeSync(fd);
        logContents =
          `[...truncated to last 2 MB of ${(stat.size / 1024 / 1024).toFixed(1)} MB file...]\n\n` +
          buf.toString('utf8');
      } else {
        logContents = fs.readFileSync(logFilePath, 'utf8');
      }
      logStatus = `Source: ${logFilePath}  (${(stat.size / 1024).toFixed(1)} KB)`;
    } catch (e) {
      logStatus = `Could not read log file: ${(e as Error).message}`;
    }
  }

  const report = [
    '╔══════════════════════════════════════════════════════════════╗',
    `║          IIITN AuthBahn CLI — Diagnostic Report              ║`,
    `║          Generated: ${new Date().toISOString().padEnd(41)}║`,
    '╚══════════════════════════════════════════════════════════════╝',
    section('SYSTEM INFORMATION', systemInfo()),
    section('CONFIGURATION', sanitizeConfig(cfg)),
    section('CONFIGURATION FILE PATH', getConfigPath()),
    section('LOG FILE', logStatus + (logContents ? `\n\n${logContents}` : '')),
  ].join('');

  const desktop = path.join(os.homedir(), 'Desktop');
  const defaultDir = fs.existsSync(desktop) ? desktop : os.homedir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const defaultOut = path.join(defaultDir, `iiitn-auth-cli-report-${stamp}.txt`);
  const outPath = opts.output ? path.resolve(opts.output) : defaultOut;

  try {
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, report, 'utf8');
  } catch (e) {
    spinner.fail(chalk.red(`Failed to write report: ${(e as Error).message}`));
    return ExitCode.ERROR;
  }

  spinner.stop();
  console.log(top());
  console.log(centeredRow(chalk.cyan.bold('Report Exported')));
  console.log(hRule());
  console.log(labelRow('File', chalk.white(outPath)));
  console.log(labelRow('Size', chalk.dim(`${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`)));
  console.log(labelRow('Includes', chalk.dim('System info, config, log file')));
  console.log(
    labelRow('Log file', logFilePath ? chalk.dim(logFilePath) : chalk.yellow('not configured')),
  );
  console.log(bottom());
  console.log('');
  console.log(chalk.dim('Share this file when reporting a bug or requesting support.'));
  console.log('');

  return ExitCode.OK;
}
