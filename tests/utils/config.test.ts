import { getConfig, setConfigValue, resetConfig, getSanitizedConfig } from '../../src/utils/config';

describe('config', () => {
  afterEach(() => {
    resetConfig();
  });

  it('returns default checkIntervalSeconds of 30', () => {
    expect(getConfig().checkIntervalSeconds).toBe(30);
  });

  it('returns default maxRetries of 5', () => {
    expect(getConfig().maxRetries).toBe(5);
  });

  it('setConfigValue updates a key', () => {
    setConfigValue('checkIntervalSeconds', 60);
    expect(getConfig().checkIntervalSeconds).toBe(60);
  });

  it('resetConfig restores defaults', () => {
    setConfigValue('checkIntervalSeconds', 999);
    resetConfig();
    expect(getConfig().checkIntervalSeconds).toBe(30);
  });

  it('getSanitizedConfig returns a copy', () => {
    const a = getSanitizedConfig();
    const b = getSanitizedConfig();
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // different references
  });

  it('default portalBaseUrl is set', () => {
    expect(getConfig().portalBaseUrl).toBe('https://172.16.0.30:1003');
  });

  it('default logFile is null', () => {
    expect(getConfig().logFile).toBeNull();
  });
});
