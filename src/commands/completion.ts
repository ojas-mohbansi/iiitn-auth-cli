import chalk from 'chalk';
import { ExitCode } from '../types/index';

const COMMANDS = [
  { name: 'login', description: 'Save credentials and verify authentication' },
  { name: 'logout', description: 'Remove saved credentials and log out from portal' },
  { name: 'status', description: 'Show current authentication and connectivity status' },
  { name: 'connect', description: 'Force an immediate authentication attempt' },
  { name: 'daemon', description: 'Run continuously and auto-reconnect when session expires' },
  { name: 'enable-autostart', description: 'Configure the daemon to start at system boot' },
  { name: 'disable-autostart', description: 'Remove the autostart configuration' },
  { name: 'config', description: 'View or modify configuration' },
  { name: 'help', description: 'Show the full README and documentation in the terminal' },
  {
    name: 'export-logs',
    description: 'Bundle logs, config, and system info into a shareable report file',
  },
  {
    name: 'uninstall',
    description: 'Remove all credentials, config, autostart entries, and data directory',
  },
  { name: 'completion', description: 'Generate shell completion script' },
];

function generateBash(): string {
  const wordList = COMMANDS.map(c => c.name).join(' ');
  const lines = [
    '# bash completion for iiitn-auth-cli',
    '# Add the following to your ~/.bashrc or ~/.bash_profile:',
    '#   eval "$(iiitn-auth-cli completion bash)"',
    '',
    '_iiitn_auth_cli() {',
    '  local cur prev words cword',
    '  _init_completion 2>/dev/null || {',
    '    COMPREPLY=()',
    '    cur="${COMP_WORDS[COMP_CWORD]}"',
    '  }',
    '  local commands="' + wordList + '"',
    '  if [[ ${COMP_CWORD} -eq 1 ]]; then',
    '    COMPREPLY=( $(compgen -W "${commands}" -- "${cur}") )',
    '    return 0',
    '  fi',
    '}',
    '',
    'complete -F _iiitn_auth_cli iiitn-auth-cli',
    '',
  ];
  return lines.join('\n');
}

function generateZsh(): string {
  const subcommands = COMMANDS.map(c => `    '${c.name}:${c.description}'`).join('\n');
  const lines = [
    '#compdef iiitn-auth-cli',
    '# zsh completion for iiitn-auth-cli',
    '# Add the following to your ~/.zshrc:',
    '#   eval "$(iiitn-auth-cli completion zsh)"',
    '',
    '_iiitn_auth_cli() {',
    '  local -a subcommands',
    '  subcommands=(',
    subcommands,
    '  )',
    '  _arguments -C \\',
    "    '1:command:->command' \\",
    "    '*:: :->args'",
    '  case $state in',
    '    command)',
    "      _describe 'iiitn-auth-cli commands' subcommands",
    '      ;;',
    '  esac',
    '}',
    '',
    '_iiitn_auth_cli "$@"',
    '',
  ];
  return lines.join('\n');
}

function generateFish(): string {
  const disableFileLine = 'complete -c iiitn-auth-cli -f';
  const lines = COMMANDS.map(
    c =>
      `complete -c iiitn-auth-cli -f -n '__fish_use_subcommand' -a '${c.name}' -d '${c.description}'`,
  );
  const out = [
    '# fish completion for iiitn-auth-cli',
    '# Add the following to your fish config:',
    '#   iiitn-auth-cli completion fish | source',
    '',
    '# Disable file completion at the top level',
    disableFileLine,
    '',
    'function __fish_use_subcommand',
    '  set -l cmd (commandline -poc)',
    '  if test (count $cmd) -eq 1',
    '    return 0',
    '  end',
    '  return 1',
    'end',
    '',
    ...lines,
    '',
  ];
  return out.join('\n');
}

export async function completionCommand(shell: string): Promise<ExitCode> {
  switch (shell.toLowerCase()) {
    case 'bash':
      process.stdout.write(generateBash());
      return ExitCode.OK;
    case 'zsh':
      process.stdout.write(generateZsh());
      return ExitCode.OK;
    case 'fish':
      process.stdout.write(generateFish());
      return ExitCode.OK;
    default:
      console.error(chalk.red(`Unsupported shell: ${chalk.bold(shell)}`));
      console.error(chalk.dim('Supported shells: bash, zsh, fish'));
      return ExitCode.ERROR;
  }
}
