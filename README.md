# iiitn-auth-cli

> Automatic authenticator for the IIITN Fortinet captive portal — secure, headless, and daemon-capable.

[![npm version](https://img.shields.io/npm/v/iiitn-auth-cli.svg)](https://www.npmjs.com/package/iiitn-auth-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20WSL-blue)](#)

A production-quality Node.js CLI that replaces manual browser login at the IIITN campus Wi-Fi captive portal. Designed for Linux servers, Raspberry Pis, Docker hosts, and any headless environment where keeping a browser open is not practical.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration Reference](#configuration-reference)
- [Security](#security)
- [Autostart (Boot Persistence)](#autostart-boot-persistence)
- [Docker Usage](#docker-usage)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

---

## Features

| Capability | Details |
|---|---|
| **Secure credential storage** | OS keychain (`keytar`) with AES-256-GCM encrypted file fallback |
| **Automatic authentication** | Detects captive portal redirects and re-authenticates without user input |
| **Daemon mode** | Runs continuously, monitors connectivity, recovers from session expiry |
| **Autostart** | systemd (Linux) and launchd (macOS) support built-in |
| **Retry with backoff** | Exponential backoff with jitter on all network operations |
| **Structured logging** | JSON file logs + colorized console output via Winston |
| **Rich TUI** | Box-drawing menus, section panels, and status views in the terminal |
| **Diagnostic export** | Bundle system info + logs into a shareable report file |
| **Update checker** | Silent background check against npm registry (cached 24 h) |
| **Zero browser dependency** | Pure HTTP — no Chrome, no Puppeteer, no WebView |
| **Cross-platform** | Linux, macOS, Windows (WSL) |

---

## Requirements

- **Node.js** ≥ 16.0.0
- **npm** ≥ 7 (for global install)
- Network access to `172.16.0.30:1003` (the IIITN Fortinet portal)
- *(Optional)* `libsecret` for OS keychain support on Linux

---

## Installation

```bash
# Install globally from npm
npm install -g iiitn-auth-cli

# Or run without installing
npx iiitn-auth-cli
```

---

## Quick Start

```bash
# 1. Save credentials and verify they work
iiitn-auth-cli login

# 2. Check your current connection state
iiitn-auth-cli status

# 3. Manually trigger authentication
iiitn-auth-cli connect

# 4. Start the continuous monitoring daemon
iiitn-auth-cli daemon

# 5. Make the daemon start on every boot
iiitn-auth-cli enable-autostart
```

---

## Commands

### `iiitn-auth-cli` (no arguments)

Opens the interactive TUI menu. Use arrow keys to select a command, then press **Enter**.

```
 █████ █████ █████ ███████████ ██████   █████
 ...
╔════════════════════════════════════════════════════════════╗
║                    AuthBahn CLI  v1.0.0                    ║
╠════════════════════════════════════════════════════════════╣
║ Made by      Ojas S.K Mohbansi                             ║
╚════════════════════════════════════════════════════════════╝
```

---

### `login [--force]`

Prompts for your IIITN username and password, validates them against the portal, then stores them securely.

```bash
iiitn-auth-cli login            # First-time setup
iiitn-auth-cli login --force    # Re-enter credentials even if already saved
```

**Credential storage priority:**
1. OS native keychain (macOS Keychain / GNOME Keyring / Windows Credential Manager)
2. AES-256-GCM encrypted file at `~/.iiitn-auth-cli/.creds` (fallback)

---

### `logout`

Removes all stored credentials and sends a logout request to the portal.

```bash
iiitn-auth-cli logout
```

---

### `status`

Displays a three-panel status view: connectivity, credential state, and current configuration.

```bash
iiitn-auth-cli status
```

```
╔════════════════════════════════════════════════════════════╗
╠═ Connectivity ═════════════════════════════════════════════╣
║ Internet          ✔  Online                                ║
║ Captive portal    ✔  None detected                         ║
╠═ Credentials ══════════════════════════════════════════════╣
║ Stored            ✔  Yes                                   ║
╠═ Configuration ════════════════════════════════════════════╣
║ Check interval    30s                                      ║
╚════════════════════════════════════════════════════════════╝
```

---

### `connect`

Forces an immediate authentication attempt using stored credentials. Exits with code `0` on success, `1` on failure. Useful for scripting.

```bash
iiitn-auth-cli connect

# In a script:
iiitn-auth-cli connect && echo "Authenticated" || echo "Failed"
```

---

### `daemon`

Runs a continuous connectivity monitor in the foreground.

```bash
iiitn-auth-cli daemon
```

- Polls every `checkIntervalSeconds` (default: 30 s)
- Re-authenticates automatically when a captive portal is detected
- Sends keepalive pings to prevent session expiry
- Handles `SIGINT` / `SIGTERM` gracefully
- Writes a PID file to `~/.iiitn-auth-cli/daemon.pid`

---

### `enable-autostart` / `disable-autostart`

Installs or removes the daemon as a system service that starts at boot.

```bash
iiitn-auth-cli enable-autostart    # Install service
iiitn-auth-cli disable-autostart   # Remove service
```

| Platform | Service file location |
|---|---|
| Linux (systemd) | `~/.config/systemd/user/iiitn-auth-cli.service` |
| macOS (launchd) | `~/Library/LaunchAgents/com.iiitn.auth-cli.plist` |

After enabling on Linux, check live daemon logs with:

```bash
journalctl --user -u iiitn-auth-cli -f
```

---

### `config`

View or modify any configuration value.

```bash
iiitn-auth-cli config                                     # Show all settings
iiitn-auth-cli config --path                              # Print config file location
iiitn-auth-cli config --set checkIntervalSeconds=60       # Change a value
iiitn-auth-cli config --set logFile=~/.iiitn-auth-cli/iiitn.log
iiitn-auth-cli config --set logLevel=debug
iiitn-auth-cli config --reset                             # Restore all defaults
```

---

### `export-logs`

Bundles system information, configuration, and log file contents into a single `.txt` report file — useful for bug reports and support.

```bash
iiitn-auth-cli export-logs                         # Saves to ~/Desktop/ (or ~/)
iiitn-auth-cli export-logs --output ~/report.txt   # Custom output path
```

The report includes:
- Timestamp, CLI version, Node version, OS, architecture
- Full sanitized configuration
- Config file path
- Log file contents (last 2 MB if large)

Nothing is sent anywhere — the file is written locally only.

---

### `help`

Renders the full README inside the terminal with syntax highlighting.

```bash
iiitn-auth-cli help
```


### `uninstall`

Removes all stored credentials, configuration, autostart entries, and the `~/.iiitn-auth-cli/` data directory. Prompts for confirmation before doing anything.

```bash
iiitn-auth-cli uninstall
```

---

### `completion <shell>`

Prints a shell completion script to stdout. Supports `bash`, `zsh`, and `fish`.

```bash
# bash — add to ~/.bashrc
eval "$(iiitn-auth-cli completion bash)"

# zsh — add to ~/.zshrc
eval "$(iiitn-auth-cli completion zsh)"

# fish — add to ~/.config/fish/config.fish
iiitn-auth-cli completion fish | source
```

---
---

## Configuration Reference

Config is stored at:
- **Linux:** `~/.config/iiitn-auth-cli/config.json`
- **macOS:** `~/Library/Preferences/iiitn-auth-cli/config.json`

| Key | Default | Description |
|---|---|---|
| `checkIntervalSeconds` | `30` | How often the daemon checks connectivity (seconds) |
| `connectivityTestUrl` | `http://connectivitycheck.gstatic.com/generate_204` | URL used to detect internet access and portal redirects |
| `portalDetectionUrl` | `http://example.com` | Secondary URL for captive portal fingerprinting |
| `maxRetries` | `5` | Max login retries before giving up |
| `backoffBaseMs` | `2000` | Base delay (ms) for exponential backoff |
| `logLevel` | `info` | Log verbosity: `error` \| `warn` \| `info` \| `verbose` \| `debug` |
| `logFile` | `null` | Absolute path to write JSON log file (`null` = console only) |
| `daemonPidFile` | `~/.iiitn-auth-cli/daemon.pid` | PID file path for the daemon |
| `portalBaseUrl` | `https://172.16.0.30:1003` | Fortinet portal base address |
| `loginPath` | `/fgtauth` | Portal login endpoint |
| `keepalivePath` | `/keepalive` | Portal keepalive endpoint |
| `logoutPath` | `/logout` | Portal logout endpoint |

---

## Security

### Credential Storage

Credentials are **never stored in plaintext**.

1. **Primary (where available):** Stored in the OS native keychain via `keytar`:
   - Linux: `libsecret` / GNOME Keyring / KWallet
   - macOS: Keychain Services
   - Windows (WSL): Windows Credential Manager

2. **Fallback:** AES-256-GCM encrypted at `~/.iiitn-auth-cli/.creds` with a per-device key at `~/.iiitn-auth-cli/.key` (file mode `0600`).

### What is never done

- Passwords are **never logged** anywhere
- Credentials are **never transmitted** except directly to the portal's HTTPS endpoint
- No telemetry, no analytics, no external calls beyond the portal itself and the npm registry update check

### TLS

The Fortinet portal uses a self-signed certificate on a private IP. TLS verification for portal endpoints (`172.16.0.30`) is intentionally disabled (`rejectUnauthorized: false`). All other HTTP calls use the system certificate store normally.

---

## Autostart (Boot Persistence)

### Linux — systemd

```bash
iiitn-auth-cli enable-autostart
systemctl --user enable iiitn-auth-cli   # Already done by the command
systemctl --user start  iiitn-auth-cli   # Start immediately
journalctl --user -u iiitn-auth-cli -f   # Follow logs
```

The unit file is written to `~/.config/systemd/user/iiitn-auth-cli.service`.

### macOS — launchd

```bash
iiitn-auth-cli enable-autostart
# Plist installed at ~/Library/LaunchAgents/com.iiitn.auth-cli.plist
# Daemon starts automatically at next login or immediately via:
launchctl load ~/Library/LaunchAgents/com.iiitn.auth-cli.plist
```

---

## Docker Usage

```dockerfile
FROM node:20-alpine
RUN npm install -g iiitn-auth-cli
CMD ["iiitn-auth-cli", "daemon"]
```

```bash
# First-time credential setup on the host
iiitn-auth-cli login

# Run container, mounting the credentials directory
docker run -d \
  --name iiitn-auth \
  --restart unless-stopped \
  -v "$HOME/.iiitn-auth-cli:/root/.iiitn-auth-cli" \
  iiitn-auth-image
```

The `~/.iiitn-auth-cli` directory holds encrypted credentials and config. Mounting it into the container avoids re-running `login` inside the container.

---

## Architecture

```
src/
├── index.ts                   CLI entry point — Commander program + command registry
├── types/
│   └── index.ts               Shared TypeScript interfaces (AppConfig, SessionState, …)
├── commands/
│   ├── login.ts               Credential save + initial authentication
│   ├── logout.ts              Credential removal + portal logout
│   ├── connect.ts             Single authenticated attempt with retry
│   ├── status.ts              Three-panel TUI status display
│   ├── daemon.ts              Continuous polling loop + keepalive
│   ├── config.ts              Config read / write / reset
│   ├── autostart.ts           systemd unit, launchd plist, and Task Scheduler installer
│   ├── uninstall.ts           Full data + credential + autostart removal
│   └── completion.ts          Shell completion script generator (bash/zsh/fish)
│   ├── export-logs.ts         Diagnostic report bundler
│   ├── menu.ts                Interactive TUI main menu
│   ├── help.ts                In-terminal README renderer
├── core/
│   ├── auth.ts                HTTP login / logout / keepalive via Axios + tough-cookie
│   ├── portal.ts              Captive portal detection logic
│   ├── credentials.ts         Secure credential store (keytar + AES-256-GCM fallback)
│   ├── session.ts             Session state persistence
│   └── connectivity.ts        Connectivity monitoring orchestration
└── utils/
    ├── banner.ts              IIITN ASCII art banner + info box
    ├── tui.ts                 Box-drawing TUI engine (W=62, all helpers)
    ├── logger.ts              Winston logger (console + optional JSON file)
    ├── config.ts              Conf-based typed configuration store
    ├── backoff.ts             Exponential backoff with jitter
    ├── crypto.ts              AES-256-GCM encrypt / decrypt helpers
    ├── readme.ts              Chalk-formatted README terminal renderer
    └── update-check.ts        Background npm version check (24 h cache)
```

---

## Improvements Over AuthBahn Chrome Extension

| Concern | AuthBahn Extension | iiitn-auth-cli |
|---|---|---|
| **Credential storage** | Plaintext in `chrome.storage.sync` | AES-256-GCM or OS keychain |
| **Browser dependency** | Requires Chrome running | No browser needed |
| **Headless operation** | Not possible | Native support |
| **Server / Raspberry Pi** | Not supported | Primary target |
| **Autostart** | Chrome autostart only | systemd / launchd |
| **Logging** | `console.log` in DevTools | Structured JSON + colored console |
| **Retry logic** | None | Exponential backoff with jitter |
| **Session recovery** | Manual page reload | Fully automatic |
| **Connectivity detection** | Tab URL intercept | Direct HTTP probe |

---

## Troubleshooting

**`No credentials found`**
Run `iiitn-auth-cli login` first.

**`keytar` build errors on install**
`keytar` is optional; the tool falls back to encrypted file storage automatically. On minimal Linux systems, install the native secret service library first:
```bash
# Debian / Ubuntu
sudo apt-get install libsecret-1-dev

# Fedora / RHEL
sudo dnf install libsecret-devel
```

**`keytar` unavailable after npm v12 install**
npm v12 disables lifecycle scripts (`preinstall` / `install` / `postinstall`) by default. `keytar` uses a native build script, so it will not compile automatically. `iiitn-auth-cli` handles this gracefully — it falls back to AES-256-GCM encrypted file storage with no action required.

To explicitly allow `keytar`'s build script and enable OS keychain storage:
```bash
npm approve-scripts --allow-scripts-pending
# then reinstall
npm install -g iiitn-auth-cli
```

**`Portal not detected` / `Connection test fails`**
The default connectivity check uses `connectivitycheck.gstatic.com`. If your network blocks it, swap it out:
```bash
iiitn-auth-cli config --set connectivityTestUrl=http://neverssl.com
```

**Daemon does not reconnect**
Enable debug logging to trace what the daemon sees at each poll:
```bash
iiitn-auth-cli config --set logLevel=debug
iiitn-auth-cli config --set logFile=~/.iiitn-auth-cli/debug.log
iiitn-auth-cli daemon
```
Then run `iiitn-auth-cli export-logs` to bundle everything into a shareable report.

**Self-signed certificate errors on custom networks**
The portal cert check is disabled only for `portalBaseUrl`. If you have changed the portal address to a domain with a real cert, this is unnecessary and can be hardened in `src/core/auth.ts`.

---

## Contributing

Pull requests are welcome. Please:

1. Fork the repository and create a feature branch (`git checkout -b feat/my-feature`)
2. Write TypeScript — strict mode is enforced (`"strict": true` in `tsconfig.json`)
3. Run `npm run typecheck` before committing — zero errors required
4. Run `npm run build` to verify the output is valid
5. Open a PR with a clear description of what changed and why

For bug reports, run \iiitn-auth-cli export-logs\ and attach the generated report to the issue.

Releases are published to npm automatically via GitHub Actions using OIDC trusted publishing — no long-lived tokens required. To publish, push a * tag.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

---

## License

MIT — see [LICENSE](./LICENSE) for full text.

---

## Author

Made by **Ojas S.K Mohbansi** — A CRISPR / IIITN Initiative
