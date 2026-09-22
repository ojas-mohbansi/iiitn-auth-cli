import chalk from 'chalk';
import open = require('open');
import { ExitCode } from '../types/index';

const CRISPR_URL = 'https://crispr.iiitn.ac.in/';

export async function crispRCommand(): Promise<ExitCode> {
  console.log(chalk.cyan('\n  rCRISPR — IIITN CRISPR Club FTP Site\n'));
  console.log(chalk.dim(`  Opening ${CRISPR_URL} in your browser…`));
  try {
    await open(CRISPR_URL);
    console.log(chalk.green('  ✔ Browser launched. Happy exploring!\n'));
    return ExitCode.OK;
  } catch (e) {
    console.log(chalk.red(`  ✘ Could not open browser: ${(e as Error).message}`));
    console.log(chalk.dim(`  Visit manually: ${CRISPR_URL}\n`));
    return ExitCode.ERROR;
  }
}
