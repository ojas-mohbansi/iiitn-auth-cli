# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-09-22

### Added
- `uninstall` command — removes all credentials, configuration, autostart entries, and the `~/.iiitn-auth-cli/` data directory in one step
- `completion` command — generates shell completion scripts for bash, zsh, and fish (`iiitn-auth-cli completion <shell>`)
- Windows autostart via Task Scheduler (`schtasks /create`) — full feature parity with Linux systemd and macOS launchd
- `keepaliveIntervalChecks` config key — controls how often keepalive pings fire in the daemon loop (default: every 10 checks ≈ 5 min)
- Keepalive pings now fire automatically in the daemon loop every N connectivity checks
- Secondary captive portal probe using `portalDetectionUrl` in both `detectPortal()` and `checkConnectivity()` — catches portals that allow `connectivitycheck.gstatic.com` through
- `ExitCode` enum — all commands return structured exit codes (`OK=0`, `ERROR=1`, `NO_CREDENTIALS=2`, `AUTH_FAILED=3`, `CONFIG_ERROR=4`) instead of calling `process.exit()` directly
- `exports` field in `package.json` for modern Node.js module resolution
- `.npmrc` with `access=public`, npm registry, and `provenance=true`
- Release workflow now uses GitHub OIDC trusted publishing — no long-lived `NPM_TOKEN` required

### Fixed
- `program.parse()` replaced with `program.parseAsync()` — eliminates unhandled-rejection risk for async command handlers
- Windows `getExecutablePath()` now uses `where` instead of `which`

---

## [1.0.0] - 2024-06-11

### Added
- **Core authentication engine** — HTTP POST to Fortinet `/fgtauth` endpoint with `axios` + `tough-cookie` session jar
- **Captive portal detection** — HTTP probe to `connectivitycheck.gstatic.com` to distinguish "no internet" from "behind portal"
- **Secure credential storage** — OS keychain via `keytar` (macOS Keychain, GNOME Keyring, Windows Credential Manager); AES-256-GCM encrypted file fallback when keychain is unavailable
- **`login` command** — interactive credential entry, validation against portal, secure save
- **`logout` command** — removes credentials and sends HTTP logout to portal
- **`connect` command** — single authenticated attempt with configurable exponential backoff + jitter
- **`status` command** — three-panel TUI showing connectivity, credentials, and configuration
- **`daemon` command** — continuous monitoring loop with keepalive pings and automatic re-authentication
- **`enable-autostart` / `disable-autostart`** — systemd user unit (Linux) and launchd plist (macOS) installer
- **`config` command** — typed configuration store (`conf`) with `--set`, `--reset`, `--path` options
- **`export-logs` command** — bundles system info, config, and log file into a shareable `.txt` report
- **`help` command** — renders README inside the terminal with chalk formatting
- **Rich TUI** — box-drawing engine (`src/utils/tui.ts`) with double-line borders, section headers, label rows, and menu item rows; consistent 62-column layout
- **IIITN ASCII art banner** — block-letter IIITN logo printed on startup
- **Background update checker** — silent npm registry check, 24 h cache, shown only when newer version is available
- **Structured logging** — Winston with colorized console transport and optional JSON file transport
- **TypeScript strict mode** — full strict compilation with declaration maps and source maps
- **GitHub Actions CI** — Node.js 18 / 20 / 22 matrix build on push and pull request

### Security
- Passwords are never logged
- Credentials are never written to disk in plaintext
- TLS verification disabled only for the portal self-signed certificate endpoint; all other requests use system CA store

---

[1.1.0]: https://github.com/ojas-mohbansi/iiitn-auth-cli/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ojas-mohbansi/iiitn-auth-cli/releases/tag/v1.0.0
