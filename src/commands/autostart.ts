import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { ExitCode } from '../types/index';

const SERVICE_NAME = 'iiitn-auth-cli';

function getExecutablePath(): string {
  try {
    if (process.platform === 'win32') {
      return execSync('where iiitn-auth-cli', { encoding: 'utf8' })
        .trim()
        .split('\n')[0]
        .trim();
    }
    return execSync('which iiitn-auth-cli', { encoding: 'utf8' }).trim();
  } catch {
    return process.argv[1] ?? 'iiitn-auth-cli';
  }
}

function generateSystemdUnit(execPath: string): string {
  return `[Unit]
Description=IIITN Captive Portal Auto-Authenticator
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${execPath} daemon
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=iiitn-auth-cli
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
`;
}

export function generateTaskSchedulerXml(execPath: string): string {
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>IIITN Captive Portal Auto-Authenticator</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${execPath}</Command>
      <Arguments>daemon</Arguments>
    </Exec>
  </Actions>
</Task>`;
}

export async function enableWindowsTaskScheduler(): Promise<void> {
  const execPath = getExecutablePath();
  const tmpFile = path.join(os.tmpdir(), 'iiitn-auth-cli-task.xml');
  try {
    fs.writeFileSync(tmpFile, generateTaskSchedulerXml(execPath), { encoding: 'utf8' });
    execSync(`schtasks /create /xml "${tmpFile}" /tn "${SERVICE_NAME}" /f`, { stdio: 'ignore' });
    console.log(chalk.green(`✔ Task Scheduler entry created: ${SERVICE_NAME}`));
    console.log(chalk.dim('  The daemon will start automatically at next logon.'));
  } catch (e) {
    console.log(chalk.red(`✘ Failed to create Task Scheduler entry: ${(e as Error).message}`));
    throw e;
  } finally {
    try { fs.rmSync(tmpFile, { force: true }); } catch { /* ignore */ }
  }
}

export async function disableWindowsTaskScheduler(): Promise<void> {
  try {
    execSync(`schtasks /delete /tn "${SERVICE_NAME}" /f`, { stdio: 'ignore' });
    console.log(chalk.green(`✔ Task Scheduler entry removed: ${SERVICE_NAME}`));
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (/cannot find|does not exist|ERROR: The system cannot/i.test(msg)) {
      console.log(chalk.yellow('No Task Scheduler entry found — nothing to remove.'));
    } else {
      console.log(chalk.red(`✘ Failed to remove Task Scheduler entry: ${msg}`));
    }
  }
}

export async function enableAutostartCommand(): Promise<ExitCode> {
  const platform = os.platform();

  if (platform === 'linux') {
    await enableLinuxSystemd();
    return ExitCode.OK;
  } else if (platform === 'darwin') {
    await enableMacLaunchAgent();
    return ExitCode.OK;
  } else if (platform === 'win32') {
    try {
      await enableWindowsTaskScheduler();
      return ExitCode.OK;
    } catch {
      return ExitCode.ERROR;
    }
  } else {
    console.log(chalk.yellow(`Unsupported platform: ${platform}`));
    console.log(chalk.dim('Manually add `iiitn-auth-cli daemon` to your startup scripts.'));
    return ExitCode.ERROR;
  }
}

export async function disableAutostartCommand(): Promise<ExitCode> {
  const platform = os.platform();

  if (platform === 'linux') {
    await disableLinuxSystemd();
    return ExitCode.OK;
  } else if (platform === 'darwin') {
    await disableMacLaunchAgent();
    return ExitCode.OK;
  } else if (platform === 'win32') {
    await disableWindowsTaskScheduler();
    return ExitCode.OK;
  } else {
    console.log(chalk.yellow(`No autostart to remove on platform: ${platform}`));
    return ExitCode.OK;
  }
}

async function enableLinuxSystemd(): Promise<void> {
  const systemdDir = path.join(os.homedir(), '.config', 'systemd', 'user');
  const unitFile = path.join(systemdDir, `${SERVICE_NAME}.service`);
  const execPath = getExecutablePath();

  fs.mkdirSync(systemdDir, { recursive: true });
  fs.writeFileSync(unitFile, generateSystemdUnit(execPath), 'utf8');

  console.log(chalk.green(`✔ Systemd unit written to ${unitFile}`));
  console.log(chalk.dim('\nEnable with:'));
  console.log(chalk.cyan(`  systemctl --user daemon-reload`));
  console.log(chalk.cyan(`  systemctl --user enable --now ${SERVICE_NAME}`));
  console.log(chalk.dim('\nCheck status with:'));
  console.log(chalk.cyan(`  systemctl --user status ${SERVICE_NAME}`));
  console.log(chalk.dim('\nView logs with:'));
  console.log(chalk.cyan(`  journalctl --user -u ${SERVICE_NAME} -f`));

  try {
    execSync('systemctl --user daemon-reload', { stdio: 'ignore' });
    execSync(`systemctl --user enable --now ${SERVICE_NAME}`, { stdio: 'ignore' });
    console.log(chalk.green('\n✔ Service enabled and started automatically'));
  } catch {
    console.log(chalk.yellow('\n⚠  Run the commands above manually to activate the service'));
  }
}

async function disableLinuxSystemd(): Promise<void> {
  const unitFile = path.join(
    os.homedir(),
    '.config',
    'systemd',
    'user',
    `${SERVICE_NAME}.service`,
  );

  try {
    execSync(`systemctl --user disable --now ${SERVICE_NAME}`, { stdio: 'ignore' });
    console.log(chalk.green(`✔ Service disabled`));
  } catch {
    /* may not be running */
  }

  if (fs.existsSync(unitFile)) {
    fs.rmSync(unitFile);
    console.log(chalk.green(`✔ Unit file removed: ${unitFile}`));
    try { execSync('systemctl --user daemon-reload', { stdio: 'ignore' }); } catch { /* ignore */ }
  } else {
    console.log(chalk.yellow('No unit file found — nothing to remove'));
  }
}

async function enableMacLaunchAgent(): Promise<void> {
  const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistFile = path.join(launchAgentsDir, `com.iiitn.auth-cli.plist`);
  const execPath = getExecutablePath();

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.iiitn.auth-cli</string>
  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
    <string>daemon</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${path.join(os.homedir(), '.iiitn-auth-cli', 'daemon.log')}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(os.homedir(), '.iiitn-auth-cli', 'daemon.err')}</string>
</dict>
</plist>`;

  fs.mkdirSync(launchAgentsDir, { recursive: true });
  fs.writeFileSync(plistFile, plist, 'utf8');
  console.log(chalk.green(`✔ LaunchAgent written to ${plistFile}`));

  try {
    execSync(`launchctl load ${plistFile}`, { stdio: 'ignore' });
    console.log(chalk.green('✔ LaunchAgent loaded and started'));
  } catch {
    console.log(chalk.dim(`Activate manually: launchctl load ${plistFile}`));
  }
}

async function disableMacLaunchAgent(): Promise<void> {
  const plistFile = path.join(
    os.homedir(),
    'Library',
    'LaunchAgents',
    'com.iiitn.auth-cli.plist',
  );

  try { execSync(`launchctl unload ${plistFile}`, { stdio: 'ignore' }); } catch { /* ignore */ }

  if (fs.existsSync(plistFile)) {
    fs.rmSync(plistFile);
    console.log(chalk.green(`✔ LaunchAgent removed: ${plistFile}`));
  } else {
    console.log(chalk.yellow('No LaunchAgent found'));
  }
}
