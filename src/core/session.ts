import Conf from 'conf';
import { SessionState } from '../types/index';

const sessionStore = new Conf<{
  authenticated: boolean;
  lastAuthAt: Date | null;
  sessionToken: string | null;
  username: string | null;
}>({
  projectName: 'iiitn-auth-cli',
  configName: 'session',
  defaults: {
    authenticated: false,
    lastAuthAt: null,
    sessionToken: null,
    username: null,
  },
});

export function getSession(): SessionState {
  return {
    authenticated: sessionStore.get('authenticated'),
    lastAuthAt: sessionStore.get('lastAuthAt'),
    sessionToken: sessionStore.get('sessionToken'),
    username: sessionStore.get('username'),
  };
}

export function setAuthenticated(username: string): void {
  sessionStore.set('authenticated', true);
  sessionStore.set('lastAuthAt', new Date());
  sessionStore.set('username', username);
}

export function clearSession(): void {
  sessionStore.clear();
}

export function isSessionFresh(maxAgeMinutes = 30): boolean {
  const session = getSession();
  if (!session.authenticated || !session.lastAuthAt) return false;
  const ageMs = Date.now() - new Date(session.lastAuthAt).getTime();
  return ageMs < maxAgeMinutes * 60 * 1000;
}
