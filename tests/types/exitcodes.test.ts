import { ExitCode } from '../../src/types/index';

describe('ExitCode', () => {
  it('has the expected numeric values', () => {
    expect(ExitCode.OK).toBe(0);
    expect(ExitCode.ERROR).toBe(1);
    expect(ExitCode.NO_CREDENTIALS).toBe(2);
    expect(ExitCode.AUTH_FAILED).toBe(3);
    expect(ExitCode.CONFIG_ERROR).toBe(4);
  });
});
