import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { getConfig } from '../utils/config';
import { debug, info, warn } from '../utils/logger';
import { PortalInfo, ConnectivityStatus } from '../types/index';

wrapper(axios);

const PORTAL_PATTERNS = [
  /fortinet/i,
  /fortigate/i,
  /captive/i,
  /fgtauth/i,
  /keepalive/i,
  /\bmagic\b/,
];

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export function makeHttpClient(jar?: CookieJar): AxiosInstance {
  return axios.create({
    jar: jar ?? new CookieJar(),
    withCredentials: true,
    timeout: 10000,
    maxRedirects: 5,
    headers: { 'User-Agent': USER_AGENT },
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
}

function extractMagic(html: string): string | undefined {
  const m =
    html.match(/name=["']?magic["']?\s+value=["']([^"']+)["']/i) ||
    html.match(/["']magic["']\s*:\s*["']([^"']+)["']/i) ||
    html.match(/magic=([a-f0-9]+)/i);
  return m?.[1];
}

function extractPostArgs(html: string): Record<string, string> {
  const args: Record<string, string> = {};
  const re = /<input[^>]+name=["']([^"']+)["'][^>]+value=["']([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    args[m[1]] = m[2];
  }
  return args;
}

function isPortalPage(html: string, url: string): boolean {
  return PORTAL_PATTERNS.some(p => p.test(html) || p.test(url));
}

export async function detectPortal(): Promise<PortalInfo> {
  const cfg = getConfig();
  const client = makeHttpClient();

  try {
    debug(`Probing ${cfg.connectivityTestUrl} for captive portal...`);
    const resp = await client.get(cfg.connectivityTestUrl, { validateStatus: () => true });
    const finalUrl = (resp.request as any)?.res?.responseUrl ?? cfg.connectivityTestUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
    const status = resp.status;
    // istanbul ignore next
    const html = typeof resp.data === 'string' ? resp.data : '';

    if (status === 204 && !isPortalPage(html, finalUrl)) {
      // Secondary probe: cross-check with portalDetectionUrl
      try {
        debug(`Primary returned 204 — cross-checking with ${cfg.portalDetectionUrl}`);
        const secondary = await client.get(cfg.portalDetectionUrl, { validateStatus: () => true });
        const secondaryUrl = (secondary.request as any)?.res?.responseUrl ?? cfg.portalDetectionUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
        // istanbul ignore next
        const secondaryHtml = typeof secondary.data === 'string' ? secondary.data : '';
        if (isPortalPage(secondaryHtml, secondaryUrl)) {
          const magic = extractMagic(secondaryHtml);
          const postArgs = extractPostArgs(secondaryHtml);
          info(`Captive portal detected via secondary probe at ${secondaryUrl}`);
          return {
            isPortal: true,
            portalUrl: secondaryUrl,
            loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`,
            magic,
            postArgs,
          };
        }
      } catch {
        // Secondary probe failure is non-fatal — primary said 204, trust it
      }
      debug('No captive portal detected — internet is up');
      return { isPortal: false };
    }

    if (isPortalPage(html, finalUrl)) {
      const magic = extractMagic(html);
      const postArgs = extractPostArgs(html);
      info(`Captive portal detected at ${finalUrl}`);
      return {
        isPortal: true,
        portalUrl: finalUrl,
        loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`,
        magic,
        postArgs,
      };
    }

    // Primary returned non-204 but no portal indicators — secondary probe as fallback
    try {
      debug(`Primary returned ${status} with no portal — cross-checking with ${cfg.portalDetectionUrl}`);
      const secondary = await client.get(cfg.portalDetectionUrl, { validateStatus: () => true });
      const secondaryUrl = (secondary.request as any)?.res?.responseUrl ?? cfg.portalDetectionUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
      // istanbul ignore next
      const secondaryHtml = typeof secondary.data === 'string' ? secondary.data : '';
      if (isPortalPage(secondaryHtml, secondaryUrl)) {
        const magic = extractMagic(secondaryHtml);
        const postArgs = extractPostArgs(secondaryHtml);
        info(`Captive portal detected via secondary probe at ${secondaryUrl}`);
        return {
          isPortal: true,
          portalUrl: secondaryUrl,
          loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`,
          magic,
          postArgs,
        };
      }
    } catch {
      // Secondary probe failure is non-fatal
    }

    debug(`Received HTTP ${status} — no portal indicators found`);
    return { isPortal: false };
  } catch (e) {
    // istanbul ignore next
    warn(`Portal detection request failed: ${e instanceof Error ? e.message : e}`);
    return { isPortal: false };
  }
}

export async function checkConnectivity(): Promise<ConnectivityStatus> {
  const cfg = getConfig();
  const client = makeHttpClient();

  try {
    const resp = await client.get(cfg.connectivityTestUrl, {
      validateStatus: () => true,
      timeout: 8000,
    });
    const finalUrl = (resp.request as any)?.res?.responseUrl ?? cfg.connectivityTestUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
    // istanbul ignore next
    const html = typeof resp.data === 'string' ? resp.data : '';

    if (resp.status === 204) {
      // Secondary probe: verify no portal intercepts a different URL
      try {
        debug(`Primary returned 204 — secondary probe on ${cfg.portalDetectionUrl}`);
        const secondary = await client.get(cfg.portalDetectionUrl, {
          validateStatus: () => true,
          timeout: 8000,
        });
        const secondaryUrl = (secondary.request as any)?.res?.responseUrl ?? cfg.portalDetectionUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
        // istanbul ignore next
        const secondaryHtml = typeof secondary.data === 'string' ? secondary.data : '';
        if (isPortalPage(secondaryHtml, secondaryUrl)) {
          const magic = extractMagic(secondaryHtml);
          const postArgs = extractPostArgs(secondaryHtml);
          info(`Secondary probe detected captive portal at ${secondaryUrl}`);
          return {
            hasInternet: false,
            isCaptivePortal: true,
            isAuthenticated: false,
            portalInfo: {
              isPortal: true,
              portalUrl: secondaryUrl,
              loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`,
              magic,
              postArgs,
            },
            checkedAt: new Date(),
          };
        }
      } catch {
        // Secondary probe failure is non-fatal — primary said 204
      }
      return {
        hasInternet: true,
        isCaptivePortal: false,
        isAuthenticated: true,
        checkedAt: new Date(),
      };
    }

    if (isPortalPage(html, finalUrl)) {
      const magic = extractMagic(html);
      const postArgs = extractPostArgs(html);
      return {
        hasInternet: false,
        isCaptivePortal: true,
        isAuthenticated: false,
        portalInfo: {
          isPortal: true,
          portalUrl: finalUrl,
          loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`,
          magic,
          postArgs,
        },
        checkedAt: new Date(),
      };
    }

    return {
      hasInternet: false,
      isCaptivePortal: false,
      isAuthenticated: false,
      checkedAt: new Date(),
    };
  } catch {
    return {
      hasInternet: false,
      isCaptivePortal: false,
      isAuthenticated: false,
      checkedAt: new Date(),
    };
  }
}
