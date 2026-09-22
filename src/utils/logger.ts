import winston from 'winston';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { combine, timestamp, printf } = winston.format;

const levelColors: Record<string, (s: string) => string> = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyan,
  verbose: chalk.gray,
  debug: chalk.magenta,
};

const consoleFormat = printf(({ level, message, timestamp: ts }) => {
  const colorFn = levelColors[level] ?? ((s: string) => s);
  const prefix = colorFn(`[${level.toUpperCase().padEnd(7)}]`);
  return `${chalk.dim(ts as string)} ${prefix} ${message}`;
});

let logger: winston.Logger | null = null;

export function createLogger(opts: {
  level?: string;
  logFile?: string | null;
  silent?: boolean;
}): winston.Logger {
  const { level = 'info', logFile = null, silent = false } = opts;
  const transports: winston.transport[] = [];

  if (!silent) {
    transports.push(
      new winston.transports.Console({
        format: combine(timestamp({ format: 'HH:mm:ss' }), consoleFormat),
      }),
    );
  }

  if (logFile) {
    const resolvedLog = logFile.startsWith('~')
      ? path.join(os.homedir(), logFile.slice(1))
      : logFile;
    const logDir = path.dirname(resolvedLog);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    }
    transports.push(
      new winston.transports.File({
        filename: resolvedLog,
        format: combine(timestamp(), winston.format.json()),
      }),
    );
  }

  logger = winston.createLogger({ level, transports, silent });
  return logger;
}

export function getLogger(): winston.Logger {
  if (!logger) {
    logger = createLogger({ level: 'info' });
  }
  return logger;
}

export function log(level: string, message: string): void {
  getLogger().log(level, message);
}

export const info = (msg: string): winston.Logger => getLogger().info(msg);
export const warn = (msg: string): winston.Logger => getLogger().warn(msg);
export const error = (msg: string): winston.Logger => getLogger().error(msg);
export const debug = (msg: string): winston.Logger => getLogger().debug(msg);
export const verbose = (msg: string): winston.Logger => getLogger().verbose(msg);
