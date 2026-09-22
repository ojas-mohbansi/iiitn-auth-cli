import chalk from 'chalk';
import { getConfig, setConfigValue, resetConfig, getConfigPath, getSanitizedConfig } from '../utils/config';
import { ExitCode, AppConfig } from '../types/index';

export async function configCommand(options: {
  set?: string;
  reset?: boolean;
  path?: boolean;
}): Promise<ExitCode> {
  if (options.path) {
    console.log(getConfigPath());
    return ExitCode.OK;
  }

  if (options.reset) {
    resetConfig();
    console.log(chalk.green('Configuration reset to defaults.'));
    return ExitCode.OK;
  }

  if (options.set) {
    const [key, ...rest] = options.set.split('=');
    const value = rest.join('=');

    if (!key || value === undefined) {
      console.error(chalk.red('Usage: --set key=value'));
      return ExitCode.CONFIG_ERROR;
    }

    const cfg = getConfig();
    if (!(key in cfg)) {
      console.error(chalk.red(`Unknown config key: ${key}`));
      console.log(chalk.dim(`Valid keys: ${Object.keys(cfg).join(', ')}`));
      return ExitCode.CONFIG_ERROR;
    }

    const existing = cfg[key as keyof AppConfig];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any = value;
    if (typeof existing === 'number') parsed = Number(value);
    if (typeof existing === 'boolean') parsed = value === 'true';
    if (value === 'null') parsed = null;

    setConfigValue(key as keyof AppConfig, parsed);
    console.log(chalk.green(`Set ${chalk.bold(key)} = ${JSON.stringify(parsed)}`));
    return ExitCode.OK;
  }

  const cfg = getSanitizedConfig();
  console.log(chalk.cyan.bold('\n  IIITN Auth — Configuration\n'));
  console.log(chalk.dim(`  Config file: ${getConfigPath()}\n`));

  const maxKey = Math.max(...Object.keys(cfg).map(k => k.length));
  for (const [key, val] of Object.entries(cfg)) {
    console.log(`  ${chalk.bold(key.padEnd(maxKey + 2))} ${chalk.dim('=')} ${formatValue(val)}`);
  }
  console.log('');

  return ExitCode.OK;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatValue(val: any): string {
  if (val === null) return chalk.dim('null');
  if (typeof val === 'string') return chalk.green(`"${val}"`);
  if (typeof val === 'number') return chalk.yellow(String(val));
  if (typeof val === 'boolean') return val ? chalk.green('true') : chalk.red('false');
  return chalk.white(JSON.stringify(val));
}
