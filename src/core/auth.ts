import { URLSearchParams } from 'url';
import { CookieJar } from 'tough-cookie';
import https from 'https';
import axios from 'axios';
import { makeHttpClient } from './portal';
import { getConfig } from '../utils/config';
import { debug, info, warn, error } from '../utils/logger';
import { Credentials, AuthResult, PortalInfo } from '../types/index';

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export async function performLogin(creds: Credentials, portal: PortalInfo): Promise<AuthResult> {
  const cfg = getConfig();
  const jar = new CookieJar();
  const client = makeHttpClient(jar);

  try {
    const loginUrl = portal.loginUrl ?? `${cfg.portalBaseUrl}${cfg.loginPath}`;

    if (portal.portalUrl && portal.portalUrl !== loginUrl) {
      debug(`Fetching portal page to establish session: ${portal.portalUrl}`);
      await client.get(portal.portalUrl, { validateStatus: () => true }).catch(() => {});
    }

    const magic =
      portal.magic ??
      (await fetchMagic(client, loginUrl));

    const postData = new URLSearchParams();
    postData.set('username', creds.username);
    postData.set('password', creds.password);
    if (magic) postData.set('magic', magic);
    if (portal.postArgs) {
      for (const [k, v] of Object.entries(portal.postArgs)) {
        if (k !== 'username' && k !== 'password') {
          postData.set(k, v);
        }
      }
    }

    debug(`POSTing credentials to ${loginUrl}`);
    const resp = await client.post(loginUrl, postData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        Referer: portal.portalUrl ?? loginUrl,
      },
      validateStatus: () => true,
      maxRedirects: 10,
    });

    const responseText = typeof resp.data === 'string' ? resp.data : '';
    const finalUrl = (resp.request as any)?.res?.responseUrl ?? loginUrl; // eslint-disable-line @typescript-eslint/no-explicit-any
    debug(`Login response HTTP ${resp.status}, final URL: ${finalUrl}`);

    if (isAuthSuccess(resp.status, responseText, finalUrl)) {
      info(`Successfully authenticated as ${creds.username}`);
      return { success: true, message: 'Authentication successful' };
    }

    if (isAuthFailure(responseText)) {
      warn('Authentication failed — invalid credentials or session rejected');
      return { success: false, message: 'Invalid credentials or login rejected by portal' };
    }

    warn(`Unexpected login response (HTTP ${resp.status})`);
    return {
      success: false,
      message: `Unexpected response from portal (HTTP ${resp.status})`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    error(`Login request error: ${msg}`);
    return { success: false, message: `Network error: ${msg}` };
  }
}

async function fetchMagic(
  client: ReturnType<typeof makeHttpClient>,
  loginUrl: string,
): Promise<string | undefined> {
  try {
    const resp = await client.get(loginUrl, { validateStatus: () => true });
    const html = typeof resp.data === 'string' ? resp.data : '';
    const m =
      html.match(/name=["']?magic["']?\s+value=["']([^"']+)["']/i) ||
      html.match(/magic=([a-f0-9]+)/i);
    return m?.[1];
  } catch {
    return undefined;
  }
}

function isAuthSuccess(status: number, body: string, url: string): boolean {
  if (status === 200 || status === 302) {
    const successIndicators = [
      /authenticated/i,
      /logged.?in/i,
      /success/i,
      /welcome/i,
      /keepalive/i,
      /logout/i,
    ];
    if (successIndicators.some(p => p.test(body) || p.test(url))) return true;

    const failureIndicators = [/invalid/i, /incorrect/i, /failed/i, /error/i, /username/i];
    if (!failureIndicators.some(p => p.test(body))) return true;
  }
  return false;
}

function isAuthFailure(body: string): boolean {
  const patterns = [
    /invalid.{0,30}password/i,
    /invalid.{0,30}username/i,
    /authentication.{0,20}failed/i,
    /login.{0,20}failed/i,
    /incorrect.{0,30}credentials/i,
  ];
  return patterns.some(p => p.test(body));
}

export async function performKeepalive(portalBaseUrl: string): Promise<boolean> {
  const cfg = getConfig();
  const keepaliveUrl = `${portalBaseUrl}${cfg.keepalivePath}`;
  try {
    const resp = await axios.get(keepaliveUrl, {
      timeout: 8000,
      validateStatus: () => true,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    return resp.status < 400;
  } catch {
    return false;
  }
}

export async function performLogout(portalBaseUrl: string): Promise<boolean> {
  const cfg = getConfig();
  const logoutUrl = `${portalBaseUrl}${cfg.logoutPath}`;
  try {
    const resp = await axios.get(logoutUrl, {
      timeout: 8000,
      validateStatus: () => true,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    return resp.status < 400;
  } catch {
    return false;
  }
}
