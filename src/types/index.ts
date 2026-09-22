export enum ExitCode {
  OK = 0,
  ERROR = 1,
  NO_CREDENTIALS = 2,
  AUTH_FAILED = 3,
  CONFIG_ERROR = 4,
}

export interface Credentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  sessionToken?: string;
  expiresAt?: Date;
}

export interface PortalInfo {
  isPortal: boolean;
  portalUrl?: string;
  loginUrl?: string;
  magic?: string;
  postArgs?: Record<string, string>;
}

export interface ConnectivityStatus {
  hasInternet: boolean;
  isCaptivePortal: boolean;
  isAuthenticated: boolean;
  portalInfo?: PortalInfo;
  checkedAt: Date;
}

export interface AppConfig {
  checkIntervalSeconds: number;
  connectivityTestUrl: string;
  portalDetectionUrl: string;
  maxRetries: number;
  backoffBaseMs: number;
  logLevel: string;
  logFile: string | null;
  daemonPidFile: string;
  portalBaseUrl: string;
  loginPath: string;
  keepalivePath: string;
  logoutPath: string;
  keepaliveIntervalChecks: number;
}

export interface SessionState {
  authenticated: boolean;
  lastAuthAt: Date | null;
  sessionToken: string | null;
  username: string | null;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';
