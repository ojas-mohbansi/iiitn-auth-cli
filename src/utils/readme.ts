import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, (_, t: string) => chalk.bold(t))
    .replace(/`([^`]+)`/g, (_, t: string) => chalk.yellow(t));
}

export function printReadme(): void {
  const readmePath = path.resolve(__dirname, '../README.md');
  if (!fs.existsSync(readmePath)) {
    console.log(chalk.red('README.md not found.'));
    return;
  }

  const lines = fs.readFileSync(readmePath, 'utf8').split('\n');
  let inCodeBlock = false;
  let inTable = false;
  const divider = chalk.dim('─'.repeat(60));

  console.log('');

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        console.log(
          chalk.dim(
            '  ┌─ ' +
              (line.slice(3) || 'code') +
              ' ' +
              '─'.repeat(Math.max(0, 40 - (line.slice(3) || 'code').length)) +
              '┐',
          ),
        );
      } else {
        console.log(chalk.dim('  └' + '─'.repeat(44) + '┘'));
      }
      continue;
    }

    if (inCodeBlock) {
      console.log(chalk.dim('  │ ') + chalk.yellow(line));
      continue;
    }

    if (line.startsWith('---')) {
      if (inTable) inTable = false;
      console.log('  ' + divider);
      continue;
    }

    if (line.startsWith('# ')) {
      console.log('\n' + chalk.cyan.bold('  ' + line.slice(2).toUpperCase()));
      console.log('  ' + divider);
      continue;
    }

    if (line.startsWith('## ')) {
      console.log('\n' + chalk.cyan.bold('  ' + line.slice(3)));
      continue;
    }

    if (line.startsWith('### ')) {
      console.log('\n' + chalk.bold('  ' + line.slice(4)));
      continue;
    }

    if (line.startsWith('> ')) {
      console.log(chalk.dim('  ▎ ' + renderInline(line.slice(2))));
      continue;
    }

    if (line.startsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        console.log('');
      }
      const rendered = cells.map((c, i) =>
        i === 0 ? chalk.bold(renderInline(c).padEnd(28)) : renderInline(c),
      );
      console.log('  ' + rendered.join('  '));
      continue;
    } else if (inTable) {
      inTable = false;
    }

    if (line.trim() === '') {
      console.log('');
      continue;
    }

    console.log('  ' + renderInline(line));
  }

  console.log('');
}
