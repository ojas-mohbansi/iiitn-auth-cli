import { printReadme } from '../utils/readme';
import { ExitCode } from '../types/index';

export async function helpCommand(): Promise<ExitCode> {
  printReadme();
  return ExitCode.OK;
}
