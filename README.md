# iiitn-auth-cli

CLI tool for IITN AuthBahn authentication — replicates the CRISPR AuthBahn browser extension behaviour so you can authenticate from a terminal or run it as a background service.

[![npm](https://img.shields.io/npm/v/@ojas-mohbansi/iiitn-auth-cli)](https://www.npmjs.com/package/@ojas-mohbansi/iiitn-auth-cli)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-@ojas--mohbansi%2Fiiitn--auth--cli-blue)](https://github.com/ojas-mohbansi/iiitn-auth-cli/packages)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Installation

**Prerequisites:** Node.js v20+

### Global install (recommended)

Installs the `iiitn-auth-cli` command globally.

```bash
npm install -g @ojas-mohbansi/iiitn-auth-cli
```

### From GitHub Packages

```bash
npm install -g @ojas-mohbansi/iiitn-auth-cli --registry https://npm.pkg.github.com
```

### Install locally in a project

```bash
npm install @ojas-mohbansi/iiitn-auth-cli
npx iiitn-auth-cli --setup
```

---

## Quick Start

### 1. First-time setup

```bash
iiitn-auth-cli --setup
```

You'll be prompted for:
- Username
- Password
- Whether to base64-encode the stored password (basic obfuscation)

Credentials are saved to `~/.authbahn/config.json`.

### 2. Start the auth loop

```bash
iiitn-auth-cli --start
```

Logs in and then pings the keepalive endpoint every 60 seconds. Re-authenticates automatically if the session drops. Press `Ctrl+C` to stop.

### 3. Check status

```bash
iiitn-auth-cli --status
```

Prints your configured username and a live keepalive check result (`CONNECTED` / `DISCONNECTED`).

### 4. Logout

```bash
iiitn-auth-cli --logout
```

Sends a logout request to the auth server.

### 5. View logs

```bash
iiitn-auth-cli --log
```

Tails the last 50 lines of `~/.authbahn/authbahn.log`.

---

## CLI Reference

| Argument   | Description                                                      |
|------------|------------------------------------------------------------------|
| `--setup`  | Interactive prompt to save credentials                           |
| `--start`  | Start the auth + keepalive loop (runs until killed)              |
| `--status` | Show username and live connection status                         |
| `--logout` | Send a logout request to the auth server                         |
| `--log`    | Print the last 50 lines of the log file                          |

---

## Configuration

| Path                        | Purpose                              |
|-----------------------------|--------------------------------------|
| `~/.authbahn/config.json`   | Stored credentials (username + password) |
| `~/.authbahn/authbahn.log`  | Event log with timestamps            |

Both are created automatically on first run.

---

## Systemd Integration

Run `--start` as a persistent background service on Linux.

```bash
# 1. Copy the bundled service file
sudo cp $(npm root -g)/@ojas-mohbansi/iiitn-auth-cli/authbahn.service /etc/systemd/system/

# 2. Reload systemd
sudo systemctl daemon-reload

# 3. Enable on boot
sudo systemctl enable authbahn.service

# 4. Start now
sudo systemctl start authbahn.service

# 5. Check status
sudo systemctl status authbahn.service
```

Service file (`authbahn.service`):

```ini
[Unit]
Description=iiitn-auth-cli Authentication Daemon
After=network.target
Wants=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/iiitn-auth-cli --start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## How It Works

### Authentication flow

Reverse-engineered from the CRISPR AuthBahn browser extension:

1. **Login** — POST `ft_un` (username) and `ft_pd` (password) as form data to `https://192.168.55.253:1003/login`
2. **Keepalive** — GET `https://192.168.55.253:1003/keepalive` every 60 seconds to hold the session
3. **Logout** — GET `https://192.168.55.253:1003/logout`

### Reconnection logic

- If keepalive returns non-200, a re-login is triggered immediately
- Exponential backoff between retries: 1s → 2s → 4s → 8s → 16s (with ±10% jitter)
- Up to 5 consecutive failures before the daemon exits

### File layout

```
.
├── auth.js      # Core auth logic (login, keepalive, backoff) — importable as a module
├── cli.js       # CLI entry point — handles all --flags and calls auth.js
└── authbahn.service  # Systemd unit file
```

---

## Dependencies

| Package | Purpose                        |
|---------|--------------------------------|
| `axios` | HTTP client for auth requests  |

---

## Publishing

The package is published to both **npm** and **GitHub Packages** automatically via GitHub Actions when a release is created.

### Automated release

```bash
# 1. Bump the version
npm version patch        # or minor / major

# 2. Push the commit and the new tag
git push origin main
git push origin v<new-version>

# 3. Create a GitHub release to trigger the workflow
gh release create v<new-version> --title "v<new-version>" --generate-notes
```

The workflow (`.github/workflows/publish.yml`) runs two parallel jobs — one for npm (using `NPM_TOKEN` secret), one for GitHub Packages (using the built-in `GITHUB_TOKEN`).

### Manual publish

```bash
# npm registry
npm login
npm publish --access public

# GitHub Packages
export NODE_AUTH_TOKEN=ghp_your_token_here
npm publish
```

---

## License

MIT — see [LICENSE](LICENSE)

---

Made by [Ojas Mohbansi](https://github.com/ojas-mohbansi) (BT24CSE211)
