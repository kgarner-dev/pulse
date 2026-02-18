# Pulse

Pulse is a powerful CLI tool designed to scan web applications for HIPAA compliance issues, specifically focusing on unauthorized tracking and sensitive data exposure.

## Features

- **HIPAA Tracking Detection**: Identifies pixels and trackers (Google, Meta, etc.) on pages containing sensitive health information.
- **Security Headers Audit**: Checks for essential security headers like HSTS, CSP, and X-Frame-Options.
- **Form Analysis**: Scans input fields for potential PHI (Protected Health Information) collection without proper safeguards.
- **Context-Aware Scanning**: Intelligent detection of PHI context to reduce false positives.

## Installation

You can run Pulse directly using `npx`:

```bash
npx @pulse/cli <url>
```

Or install it globally:

```bash
npm install -g @pulse/cli
pulse <url>
```

## Usage

```bash
pulse https://your-healthcare-app.com
```

## Project Structure

This is a monorepo consisting of:
- `apps/cli`: The command-line interface tool.
- `packages/core`: Core engine, scanners, and rule definitions.

## Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the project:
   ```bash
   npm run build
   ```

## License

MIT © Vital Labs
