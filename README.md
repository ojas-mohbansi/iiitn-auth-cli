# iiitn-auth-cli

CLI tool for IITN AuthBahn authentication (replicates the CRISPR AuthBahn browser extension).

## Installation

### Global install (provides `iiitn-auth-cli` command)

```bash
npm install -g iiitn-auth-cli
```

### Local install + symlink

```bash
npm install iiitn-auth-cli
cd iiitn-auth-cli
npm link
```

### Prerequisites

- Node.js v20+ (required by the package engines field)
- npm (comes with Node.js)

## Quick Start

### 1. First-time setup (interactive)

```bash
iiitn-auth-cli --setup
```

You'll be prompted to:
- Enter your username
- Enter your password
- Choose whether to encrypt the password storage (base64 encoding)

### 2. Start the authentication loop

```bash
iiitn-auth-cli --start
```

This runs the auth loop in the foreground, monitoring the keepalive endpoint every 60 seconds and auto-reconnecting on session expiry. Press Ctrl+C to stop.

### 3. Check status

```bash
iiitn-auth-cli --status
```

Displays:
- Your username (from config)
- Whether credentials are configured
- Current keepalive connection status

### 4. Force logout

```bash
iiitn-auth-cli --logout
```

### 5. Tail the log file

```bash
iiitn-auth-cli --log
```

## Configuration

- Credentials are stored at `~/.authbahn/config.json`
- Password can be optionally base64-encrypted for basic obfuscation
- Log file at `~/.authbahn/authbahn.log`

## Systemd Integration

The `--start` mode is designed to run as a systemd service. To set up auto-start on boot:

```bash
# 1. Copy the service file
sudo cp authbahn.service /etc/systemd/system/

# 2. Reload systemd daemon
sudo systemctl daemon-reload

# 3. Enable the service to start on boot
sudo systemctl enable authbahn.service

# 4. Start the service
sudo systemctl start authbahn.service

# 5. Check status
sudo systemctl status authbahn.service
```

**Service file content** (auto-generated or copy this):

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
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

## CLI Arguments

| Argument | Description |
|---|---|
| `--setup` | Interactive prompt to create/update the config file with credentials |
| `--start` | Start the auth loop (used by systemd, keeps running monitoring keepalive) |
| `--status` | Check current connection status |
| `--logout` | Send logout request if the extension supports it |
| `--log` | Tail the log file |

## How It Works

### Authentication Flow (reverse-engineered from browser extension)

1. **Login**: POST form data `ft_un` (username) and `ft_pd` (password) to `https://192.168.55.253:1003/login`
2. **Session maintenance**: After successful login, the session is maintained at `https://192.168.55.253:1003/keepalive`
3. **Post-login redirect**: After keepalive detection, the extension redirects to `http://192.168.77.84`
4. **Logout**: Replace "keepalive" with "logout" in the stored submitted URL

### Connection Monitoring

- The auth loop pings `https://192.168.55.253:1003/keepalive` every 60 seconds
- If the keepalive check fails (no 200 response), the connection is considered lost
- Exponential backoff retry: 1s, 2s, 4s, 8s, 16s between reconnection attempts
- Up to 5 retry attempts before giving up

### Logging

All events are logged with timestamps to `~/.authbahn/authbahn.log`:
- Login attempts (success/failure)
- Connection status changes
- Re-authentication events
- Startup and shutdown events
- Error events

## Dependencies

- `axios` - HTTP client for making API requests
- `colors` - Terminal color output (included via chalk in the script)

Both are available via npm and installed automatically when you install the package.

## License

MIT

## Publishing

The package is published to both the **npm registry** and **GitHub Packages** as `@ojas-mohbansi/iiitn-auth-cli`.

### Automated (GitHub Actions)

Publishing is triggered automatically when you create a GitHub Release:

```bash
# 1. Bump the version
npm version patch   # or minor / major

# 2. Push the commit and the new tag
git push origin main --tags

# 3. Go to GitHub → Releases → Draft a new release → pick the tag → Publish release
```

The workflow (`.github/workflows/publish.yml`) runs two parallel jobs — one for npm, one for GitHub Packages.

**Required secret:** Add an `NPM_TOKEN` (npm Automation token) to your repo's Settings → Secrets and variables → Actions. `GITHUB_TOKEN` is provided automatically by GitHub Actions.

### Manual publish

#### To npm registry

```bash
# Log in once (stores credentials in ~/.npmrc)
npm login

# Publish
npm publish --access public
```

#### To GitHub Packages

```bash
# Set your GitHub Personal Access Token (needs write:packages scope)
export NODE_AUTH_TOKEN=ghp_your_token_here

# Publish (the .npmrc in the repo routes @ojas-mohbansi to GitHub Packages)
npm publish
```

#### Version bump reminder

Always bump the version before re-publishing — both registries reject duplicate versions:

```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```
