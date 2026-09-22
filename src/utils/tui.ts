import chalk from 'chalk';

export const W = 62;

const B = {
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═', v: '║',
  ml: '╠', mr: '╣',
};

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

export function hRule(width = W): string {
  return chalk.cyan(B.ml + B.h.repeat(width - 2) + B.mr);
}

export function top(width = W): string {
  return chalk.cyan(B.tl + B.h.repeat(width - 2) + B.tr);
}

export function bottom(width = W): string {
  return chalk.cyan(B.bl + B.h.repeat(width - 2) + B.br);
}

export function row(left: string, right: string, width = W): string {
  const raw = stripAnsi(left) + stripAnsi(right);
  const pad = Math.max(0, width - 4 - raw.length);
  return chalk.cyan(B.v) + ' ' + left + right + ' '.repeat(pad) + ' ' + chalk.cyan(B.v);
}

export function emptyRow(width = W): string {
  return chalk.cyan(B.v) + ' '.repeat(width - 2) + chalk.cyan(B.v);
}

export function centeredRow(text: string, width = W): string {
  const rawLen = stripAnsi(text).length;
  const totalPad = Math.max(0, width - 2 - rawLen);
  const left = Math.floor(totalPad / 2);
  const right = totalPad - left;
  return chalk.cyan(B.v) + ' '.repeat(left) + text + ' '.repeat(right) + chalk.cyan(B.v);
}

export function sectionRow(title: string, width = W): string {
  const label = chalk.cyan.bold(` ${title} `);
  const rawLen = stripAnsi(label).length;
  const remaining = width - 2 - rawLen;
  const left = 1;
  const right = Math.max(0, remaining - left);
  return (
    chalk.cyan(B.ml) +
    chalk.cyan(B.h.repeat(left)) +
    label +
    chalk.cyan(B.h.repeat(right)) +
    chalk.cyan(B.mr)
  );
}

export function labelRow(label: string, value: string, labelWidth = 26, width = W): string {
  const l = chalk.dim(label.padEnd(labelWidth));
  const rawTotal = stripAnsi(l) + stripAnsi(value);
  const pad = Math.max(0, width - 4 - rawTotal.length);
  return chalk.cyan(B.v) + ' ' + l + value + ' '.repeat(pad) + ' ' + chalk.cyan(B.v);
}

export function menuItemRow(key: string, desc: string, keyWidth = 20, width = W): string {
  const k = chalk.green.bold(('› ' + key).padEnd(keyWidth));
  const rawTotal = stripAnsi(k) + desc;
  const pad = Math.max(0, width - 4 - rawTotal.length);
  return chalk.cyan(B.v) + ' ' + k + chalk.dim(desc) + ' '.repeat(pad) + ' ' + chalk.cyan(B.v);
}

export function box(lines: string[]): void {
  console.log(top());
  for (const line of lines) console.log(line);
  console.log(bottom());
}
