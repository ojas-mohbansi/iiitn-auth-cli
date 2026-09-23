import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http';
import { getConfig } from '../utils/config';
import { debug, info, warn } from '../utils/logger';
import { PortalInfo, ConnectivityStatus } from '../types/index';

wrapper(axios);

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const PORTAL_PATTERNS = [
  /fortinet/i,
  /fortigate/i,
  /captive/i,
  /fgtauth/i,
  /keepalive/i,
  /\bmagic\b/,
];

/**
 * Creates an axios instance that handles both cookies AND self-signed TLS certs.
 * We bypass axios-cookiejar-support's wrapper and use http-cookie-agent directly,
 * which lets us set rejectUnauthorized: false on the same agent.
 */
export function makeHttpClient(jar?: CookieJar): AxiosInstance {
  const cookieJar = jar ?? new CookieJar();
  return axios.create({
    timeout: 10000,
    maxRedirects: 5,
    headers: { 'User-Agent': USER_AGENT },
    httpAgent:  new HttpCookieAgent({ cookies: { jar: cookieJar } }),
    httpsAgent: new HttpsCookieAgent({ cookies: { jar: cookieJar }, rejectUnauthorized: false }),
  });
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

/**
 * Extracts a portal redirect URL from an axios TLS/cert error.
 * When Fortinet intercepts a probe it redirects to https://172.16.x.x:1003/fgtauth?...
 * Axios throws a cert error but the target URL is available on the error object.
 */
function extractRedirectUrl(e: unknown): string | undefined {
  if (!(e instanceof Error)) return undefined;
  const err = e as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const url: string | undefined =
    err?.config?.url ||
    err?.request?._currentUrl ||
    err?.request?.path;

  if (!url) return undefined;

  if (
    url.includes('fgtauth') ||
    url.includes('fortinet') ||
    url.includes('fortigate') ||
    url.includes('captive') ||
    /https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url)
  ) {
    return url;
  }

  return undefined;
}

export async function detectPortal(): Promise<PortalInfo> {
  const cfg = getConfig();
  const client = makeHttpClient();

  try {
    debug(`Probing ${cfg.connectivityTestUrl} for captive portal...`);

    let resp: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let redirectedToPortal: string | undefined;

    try {
      resp = await client.get(cfg.connectivityTestUrl, { validateStatus: () => true });
    } catch (e) {
      redirectedToPortal = extractRedirectUrl(e);
      if (!redirectedToPortal) {
        warn(`Portal probe request failed: ${e instanceof Error ? e.message : e}`);
        return { isPortal: false };
      }
      debug(`Portal redirect detected via cert error → ${redirectedToPortal}`);
    }

    if (redirectedToPortal) {
      info(`Captive portal detected via redirect at ${redirectedToPortal}`);
      return {
        isPortal: true,
        portalUrl: redirectedToPortal,
        loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`,
      };
    }

    const finalUrl: string = (resp.request as any)?.res?.responseUrl ?? cfg.connectivityTestUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
    const status: number = resp.status;
    const html: string = typeof resp.data === 'string' ? resp.data : '';

    if (status === 204 && !isPortalPage(html, finalUrl)) {
      try {
        debug(`Primary returned 204 — cross-checking with ${cfg.portalDetectionUrl}`);
        const secondary = await client.get(cfg.portalDetectionUrl, { validateStatus: () => true });
        const secondaryUrl = (secondary.request as any)?.res?.responseUrl ?? cfg.portalDetectionUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
        const secondaryHtml = typeof secondary.data === 'string' ? secondary.data : '';
        if (isPortalPage(secondaryHtml, secondaryUrl)) {
          const magic = extractMagic(secondaryHtml);
          const postArgs = extractPostArgs(secondaryHtml);
          info(`Captive portal detected via secondary probe at ${secondaryUrl}`);
          return { isPortal: true, portalUrl: secondaryUrl, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`, magic, postArgs };
        }
      } catch (e) {
        const redirectUrl = extractRedirectUrl(e);
        if (redirectUrl) {
          info(`Captive portal detected via secondary redirect at ${redirectUrl}`);
          return { isPortal: true, portalUrl: redirectUrl, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}` };
        }
      }
      debug('No captive portal detected — internet is up');
      return { isPortal: false };
    }

    if (isPortalPage(html, finalUrl)) {
      const magic = extractMagic(html);
      const postArgs = extractPostArgs(html);
      info(`Captive portal detected at ${finalUrl}`);
      return { isPortal: true, portalUrl: finalUrl, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`, magic, postArgs };
    }

    try {
      debug(`Primary returned ${status} — cross-checking with ${cfg.portalDetectionUrl}`);
      const secondary = await client.get(cfg.portalDetectionUrl, { validateStatus: () => true });
      const secondaryUrl = (secondary.request as any)?.res?.responseUrl ?? cfg.portalDetectionUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
      const secondaryHtml = typeof secondary.data === 'string' ? secondary.data : '';
      if (isPortalPage(secondaryHtml, secondaryUrl)) {
        const magic = extractMagic(secondaryHtml);
        const postArgs = extractPostArgs(secondaryHtml);
        info(`Captive portal detected via secondary probe at ${secondaryUrl}`);
        return { isPortal: true, portalUrl: secondaryUrl, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`, magic, postArgs };
      }
    } catch (e) {
      const redirectUrl = extractRedirectUrl(e);
      if (redirectUrl) {
        info(`Captive portal detected via secondary redirect at ${redirectUrl}`);
        return { isPortal: true, portalUrl: redirectUrl, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}` };
      }
    }

    debug(`Received HTTP ${status} — no portal indicators found`);
    return { isPortal: false };

  } catch (e) {
    const redirectUrl = extractRedirectUrl(e);
    if (redirectUrl) {
      info(`Captive portal detected via outer redirect at ${redirectUrl}`);
      return { isPortal: true, portalUrl: redirectUrl, loginUrl: `${getConfig().portalBaseUrl}${getConfig().loginPath}` };
    }
    warn(`Portal detection request failed: ${e instanceof Error ? e.message : e}`);
    return { isPortal: false };
  }
}

export async function checkConnectivity(): Promise<ConnectivityStatus> {
  const cfg = getConfig();
  const client = makeHttpClient();

  try {
    let resp: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let redirectedToPortal: string | undefined;

    try {
      resp = await client.get(cfg.connectivityTestUrl, { validateStatus: () => true, timeout: 8000 });
    } catch (e) {
      redirectedToPortal = extractRedirectUrl(e);
      if (!redirectedToPortal) {
        return { hasInternet: false, isCaptivePortal: false, isAuthenticated: false, checkedAt: new Date() };
      }
    }

    if (redirectedToPortal) {
      info(`Connectivity check: portal redirect → ${redirectedToPortal}`);
      return {
        hasInternet: false, isCaptivePortal: true, isAuthenticated: false,
        portalInfo: { isPortal: true, portalUrl: redirectedToPortal, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}` },
        checkedAt: new Date(),
      };
    }

    const finalUrl: string = (resp.request as any)?.res?.responseUrl ?? cfg.connectivityTestUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
    const html: string = typeof resp.data === 'string' ? resp.data : '';

    if (resp.status === 204) {
      try {
        debug(`Primary returned 204 — secondary probe on ${cfg.portalDetectionUrl}`);
        const secondary = await client.get(cfg.portalDetectionUrl, { validateStatus: () => true, timeout: 8000 });
        const secondaryUrl = (secondary.request as any)?.res?.responseUrl ?? cfg.portalDetectionUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
        const secondaryHtml = typeof secondary.data === 'string' ? secondary.data : '';
        if (isPortalPage(secondaryHtml, secondaryUrl)) {
          const magic = extractMagic(secondaryHtml);
          const postArgs = extractPostArgs(secondaryHtml);
          info(`Secondary probe detected captive portal at ${secondaryUrl}`);
          return {
            hasInternet: false, isCaptivePortal: true, isAuthenticated: false,
            portalInfo: { isPortal: true, portalUrl: secondaryUrl, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`, magic, postArgs },
            checkedAt: new Date(),
          };
        }
      } catch (e) {
        const redirectUrl = extractRedirectUrl(e);
        if (redirectUrl) {
          return {
            hasInternet: false, isCaptivePortal: true, isAuthenticated: false,
            portalInfo: { isPortal: true, portalUrl: redirectUrl, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}` },
            checkedAt: new Date(),
          };
        }
      }
      return { hasInternet: true, isCaptivePortal: false, isAuthenticated: true, checkedAt: new Date() };
    }

    if (isPortalPage(html, finalUrl)) {
      const magic = extractMagic(html);
      const postArgs = extractPostArgs(html);
      return {
        hasInternet: false, isCaptivePortal: true, isAuthenticated: false,
        portalInfo: { isPortal: true, portalUrl: finalUrl, loginUrl: `${cfg.portalBaseUrl}${cfg.loginPath}`, magic, postArgs },
        checkedAt: new Date(),
      };
    }

    return { hasInternet: false, isCaptivePortal: false, isAuthenticated: false, checkedAt: new Date() };

  } catch (e) {
    const redirectUrl = extractRedirectUrl(e);
    if (redirectUrl) {
      return {
        hasInternet: false, isCaptivePortal: true, isAuthenticated: false,
        portalInfo: { isPortal: true, portalUrl: redirectUrl, loginUrl: `${getConfig().portalBaseUrl}${getConfig().loginPath}` },
        checkedAt: new Date(),
      };
    }
    return { hasInternet: false, isCaptivePortal: false, isAuthenticated: false, checkedAt: new Date() };
  }
}
