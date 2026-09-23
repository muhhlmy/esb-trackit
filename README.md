# TrackIT

> Asset and IT service management platform for inventory, requests, helpdesk tickets, and operational workflows.

[![Continuous Integration](https://github.com/muhhlmy/esb-trackit/actions/workflows/ci.yml/badge.svg)](https://github.com/muhhlmy/esb-trackit/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/muhhlmy/esb-trackit/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/muhhlmy/esb-trackit/actions/workflows/e2e-tests.yml)
[![CodeQL Analysis](https://github.com/muhhlmy/esb-trackit/actions/workflows/codeql.yml/badge.svg)](https://github.com/muhhlmy/esb-trackit/actions/workflows/codeql.yml)

TrackIT is a web-based asset and IT service management platform designed to help organizations manage IT assets, requests, approvals, inventory, and operational workflows from a centralized interface.

It combines a Vue 3 single-page application, an Express 5 REST API, and PostgreSQL 16 in a single monorepo. Management screens sit behind authentication and role-based access control; a public Help Center exposes published knowledge-base content without a login.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Feature Matrix](#feature-matrix)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Production Build](#production-build)
- [Docker](#docker)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Development Workflow](#development-workflow)
- [CI and Quality Checks](#ci-and-quality-checks)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

## Overview

TrackIT supports three typical audiences:

1. **Employees** — view assigned assets, open helpdesk tickets, and read published Help Center articles.
2. **Operations teams (IT, GA, OPS)** — maintain per-domain asset inventories, process submissions and shipments, and work ticket queues.
3. **Administrators** — manage accounts and feature permissions, review audit logs, run XLSX exports, and perform database backup/restore from the admin UI.

Management pages require authentication. Help Center routes that serve published articles, FAQs, and categories are intentionally public and read-only.

Design constraints that shape the codebase:

- Backend layers are explicit: `routes → controllers → services → pg`, with parameterized SQL throughout.
- The server does not run DDL at startup; schema changes go through versioned migrations only.
- The backend is the source of truth for roles and permissions. Frontend permission checks only gate navigation.
- Realtime ticket updates use Server-Sent Events from an in-process event bus (single-instance deployment model).

## Features

### Asset Management

- Separate inventories for **IT**, **GA**, and **OPS** assets with distinct tables and permission keys
- Asset attributes: hostname, serial number, specifications, holder (employee NIK), location, device type, brand, model, status, and condition
- Holder history and per-asset change history recorded in dedicated audit tables
- Asset submission workflow (`draft → submitted → completed`) with cancel support and unique submission numbers
- “My Assets” view for assets assigned to the logged-in employee
- Barcode label generation for physical tagging (JsBarcode)
- Excel import with add or replace modes; export headers aligned with import templates

### Request and Helpdesk Workflows

- Tickets with unique numbers, categories, priority levels, and per-team queues
- Claim, reassign, resolve, and cancel flows; comments with attachments
- Ticket history and status changes captured for audit
- CSAT rating (1–5) after completion
- Realtime updates over SSE (`GET /api/tickets/events`), filtered per user access
- Shipments module: recipients, destinations, AWB/tracking numbers, status progression, cancel
- Submissions module for asset requests with approval-style lifecycle

### Knowledge Base and Help Center

- Published incident articles (SOP-style), FAQs, and category/topic cards served publicly
- Severity tags, free-text search, and popular-search logging
- Rich-text CMS editor (TipTap) for authenticated editors with `knowledge_base` permission
- Per-user article bookmarks for signed-in users

### User Management and Access Control

- Session-based authentication with HttpOnly cookies (JWT paired with server-side sessions)
- Roles: `user`, `admin`, `superadmin`
- Per-feature permission keys (`none` / `read_only` / `full`) checked on every API request
- Password change, forgot-password OTP flow, and enrollment credentials that require OTP completion
- Employee master data and user provisioning from admin screens

### Reporting and Administration

- Dashboard charts: asset trends, condition distribution, device-type mix, CSAT trends (Chart.js)
- Activity and login audit trails (`system_audit_logs`, `log_audit_login`)
- Admin-initiated PostgreSQL backup and restore with SHA-256 checksums, retention limits, and backup audit log
- Superadmin-only XLSX exports for assets, users, tickets, and related tables
- Health endpoint (`GET /health`) including database connectivity

## Feature Matrix

| Area | Capability | Status |
| --- | --- | --- |
| Authentication | Session cookie + server-side session, OTP password reset | Available |
| Authorization | Global roles + 13 feature permission keys (RBAC) | Available |
| Assets | IT / GA / OPS inventories, assignment, history, labels | Available |
| Requests | Submissions workflow | Available |
| Helpdesk | Tickets, queues, comments, CSAT, SSE realtime | Available |
| Logistics | Shipments with tracking status | Available |
| Knowledge base | Public Help Center + authenticated CMS | Available |
| Import / Export | XLSX import and export with formula-injection guards | Available |
| Audit | System audit logs and login audit | Available |
| Backup | Admin UI backup / restore with checksums and retention | Available |
| Testing | Node unit tests (backend, frontend) | Available |
| Testing | Playwright E2E (Chromium, Firefox) | Available |
| Testing | axe-core accessibility suite | Available |
| CI | GitHub Actions (backend, frontend, dependencies, E2E) | Available |
| SAST | CodeQL (JavaScript/TypeScript) | Available |
| Containers | Docker Compose stack (PostgreSQL, migrate, backend, frontend) | Available |

## Architecture

Local development:

```text
Browser
   │
   ▼
Frontend (Vite dev server, :5173)
   │  proxies /api
   ▼
Backend API (Express, :3000)
   │
   ▼
PostgreSQL (:5432)
```

Docker Compose:

```text
Browser
   │
   ▼
Nginx (frontend container)
   │  serves SPA, proxies /api
   ▼
Backend (Express, non-root container)
   │
   ▼
PostgreSQL 16
   ▲
   │
migrate (one-shot job, runs versioned migrations first)
```

Operational notes (VERIFIED from source and Compose):

- Same-origin deployment is the canonical production model: the reverse proxy serves the SPA and forwards `/api` to the backend.
- Access tokens are short-lived; the browser holds an HttpOnly session cookie. Tokens are not stored in `localStorage`.
- Application containers drop Linux capabilities and run with `no-new-privileges`.
- Realtime is an in-process EventEmitter intended for single-instance deployments.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend framework | Vue 3 |
| Build tool | Vite |
| Routing | Vue Router |
| Styling | Tailwind CSS 4 |
| Charts | Chart.js / vue-chartjs |
| Rich text | TipTap |
| Barcode | JsBarcode |
| Animation | GSAP |
| Spreadsheet | SheetJS (`xlsx`) |
| HTML sanitizing (client) | DOMPurify |
| Backend runtime | Node.js (ESM) |
| Backend framework | Express 5 |
| Database driver | `pg` (PostgreSQL) |
| Password hashing | bcrypt |
| Tokens / sessions | `jsonwebtoken` + server-side sessions |
| Email | nodemailer (optional SMTP) |
| Uploads | multer |
| Database | PostgreSQL 16 |
| Unit testing | Node.js built-in test runner |
| E2E testing | Playwright (Chromium, Firefox) |
| Accessibility testing | axe-core (`@axe-core/playwright`) |
| Lint / format | oxlint, ESLint, Prettier |
| Containers | Docker, Docker Compose |
| Reverse proxy | Nginx |
| CI / SAST | GitHub Actions, CodeQL |
| Dependency updates | Dependabot |

Node.js engines (from `backend/package.json` and `frontend/package.json`): `^22.18.0 || >=24.12.0`.

## Project Structure

```text
.
├── backend/                 Express 5 API (ESM)
│   ├── migrations/
│   │   ├── versioned/       Canonical migrations (only executed path)
│   │   └── 0xx_*.sql        Legacy reference files (do not run)
│   ├── src/
│   │   ├── config/          Env, DB, migration runner, schema checks
│   │   ├── controllers/     HTTP validation and orchestration
│   │   ├── services/        Business logic and SQL
│   │   ├── middleware/      Auth, rate limit, headers, errors
│   │   ├── routes/          Endpoints and compatibility aliases
│   │   ├── security/        CORS, password, validation, sanitizing
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/               Backend unit tests (node --test)
│   ├── Dockerfile
│   └── .env.example
├── frontend/                Vue 3 SPA
│   ├── src/
│   │   ├── views/           Pages
│   │   ├── components/      UI components
│   │   ├── composables/     Client state
│   │   ├── services/        API client
│   │   ├── router/          Routes and page-level gating
│   │   └── utils/           Permissions, export, sanitizing helpers
│   ├── tests/               Frontend unit tests
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── e2e/                     Playwright suites, fixtures, page objects
├── scripts/                 Test DB init, QA helpers, token build, deploy
├── docs/                    Conventions, migration adoption, manuals
├── design-tokens/           Design token sources (`npm run build:tokens`)
├── .github/workflows/       CI, E2E, CodeQL, Dependabot
├── docker-compose.yml       postgres, migrate, backend, frontend
├── playwright.config.js     E2E config (loopback `*_test` DB guard)
├── .env.example             Compose / root environment template
├── .env.e2e.example         E2E environment template
└── package.json             Root scripts (E2E, tokens, docs, deploy)
```

## Requirements

- Node.js `^22.18.0` or `>=24.12.0`
- npm
- PostgreSQL 16 (local instance, or Docker Compose)
- Docker and Docker Compose (optional, for the full stack)
- Playwright browsers (for E2E): installed via `npx playwright install`

## Installation

```bash
git clone https://github.com/muhhlmy/esb-trackit.git
cd esb-trackit

# Root (Playwright and root scripts)
npm ci

# Backend
npm --prefix backend ci

# Frontend
npm --prefix frontend ci
```

Copy environment templates before configuring:

```bash
cp .env.example .env                 # Docker Compose / root
cp backend/.env.example backend/.env  # local backend
cp frontend/.env.example frontend/.env
cp .env.e2e.example .env.e2e          # E2E only
```

Fill required values in your **local** `.env` files. Never commit `.env`, `.env.e2e`, database dumps, or backup files.

## Configuration

| File | Purpose |
| --- | --- |
| `backend/.env.example` | API port, PostgreSQL, JWT secret, CORS, rate limits, SMTP, migration guards, backup paths |
| `frontend/.env.example` | Vite host/proxy settings (`VITE_API_BASE_URL` stays empty for same-origin cookies) |
| `.env.example` | Docker Compose inputs (DB password, JWT secret, migration guards, optional SMTP/seed) |
| `.env.e2e.example` | Playwright base URLs and disposable test accounts |

Rules enforced by the application (VERIFIED):

- `JWT_SECRET` is required at startup (minimum 32 characters) and has no source-code default.
- `DB_PASSWORD` is required at startup.
- `CORS_ORIGINS` must be an exact comma-separated allowlist; `*` fails startup.
- `TRUST_PROXY_CIDRS` accepts only explicit IP/CIDR values (empty if you are not behind a proxy).
- Frontend `VITE_*` values are public to the browser — never put backend secrets there.

Do not commit `.env` files, credentials, private keys, production configuration, or database dumps.

## Database Setup

TrackIT uses **PostgreSQL 16**. Schema changes are applied only from `backend/migrations/versioned/` via the migration runner (advisory lock, SHA-256 checksums, `app_schema_migrations` ledger).

Legacy `backend/migrations/0xx_*.sql` files are documentation archives — do not execute them.

### Migration commands (backend working directory)

```bash
npm run db:migrate:plan    # inspect pending migrations (no changes)
npm run db:migrate:apply   # apply migrations (guarded)
npm run db:check           # verify runtime schema expectations
```

`db:migrate:apply` refuses to run unless the guard environment is set, including at least:

| Variable | Role |
| --- | --- |
| `ALLOW_DB_MIGRATIONS` | Must be `true` (explicit intent) |
| `MIGRATION_MODE` | `fresh` or `existing` |
| `MIGRATION_EXPECTED_HOST` | Must match the target host exactly |
| `MIGRATION_EXPECTED_DATABASE` | Must match the target database exactly |
| `MIGRATION_RECOVERY_PROOF_ID` | Proof ID from a verified backup/restore |
| `MIGRATION_CHANGE_ID` | Change-request identifier (required in production) |
| `REQUIRE_NON_SUPERUSER` | Optional: require non-superuser DB owner |

For adopting an existing database onto the migration ledger, follow `docs/database-migration-adoption.md`.

Docker Compose runs a dedicated `migrate` one-shot service before the backend starts.

### E2E / test database

Playwright only accepts:

- `DB_HOST` in `localhost`, `127.0.0.1`, or `::1`
- `DB_NAME` matching `*_test`

Preparation is handled by `npm run test:e2e:prepare` (`scripts/initialize-test-database.mjs --seed-e2e`).

## Running Locally

### Database

Start PostgreSQL 16 on `localhost:5432` (local install or `docker compose up postgres`).

### Backend

```bash
npm --prefix backend run db:migrate:plan
npm --prefix backend run db:migrate:apply
npm --prefix backend run dev
```

- API: `http://localhost:3000`
- Health check: `GET http://localhost:3000/health` → `{"status":"healthy"}` when the database is reachable
- Production-style start: `npm --prefix backend start`

### Frontend

```bash
npm --prefix frontend run dev
```

- App: `http://localhost:5173`
- Vite proxies `/api` to `http://127.0.0.1:3000` (override with `VITE_API_PROXY_TARGET`)

### First account (non-production)

When database reset/seeding is enabled (`ENABLE_DB_RESET=true`), the backend can create an initial superadmin from `SEED_SUPERADMIN_NAME`, `SEED_SUPERADMIN_EMAIL`, and `SEED_SUPERADMIN_PASSWORD`. Use unique credentials per environment and never reuse production passwords in development.

## Testing

All commands below are defined in the repository `package.json` files.

```bash
# From repository root
npm run test:backend        # backend unit tests (node --test)
npm run test:frontend       # frontend unit tests (node --test)

npm run test:e2e:prepare    # initialize disposable *_test database and seed
npm run test:e2e            # prepare + Playwright full run
npm run test:e2e:smoke      # @smoke tagged scenarios only
npm run test:e2e:headed     # headed browsers
npm run test:e2e:ui         # Playwright UI mode
npm run test:e2e:report     # open HTML report
```

E2E coverage (31 spec files under `e2e/tests/`): smoke, auth, tickets, assets, submissions, dashboard, RBAC, security (auth/authz/input), accessibility (axe-core), negative/error states, public regressions, view mode, and extended QA.

Unit suites include security-focused tests such as session lifecycle, brute-force lockout, rate limiting, CORS, security headers, IDOR authorization, XSS sanitizing, and export formula-injection guards.

See `e2e/README.md` for suite architecture and safety rules.

> This README does not claim a green test run for every environment. Verify with the commands above in CI or locally.

## Production Build

```bash
# Frontend
npm --prefix frontend run build     # vite build → frontend/dist
npm --prefix frontend run preview   # optional local preview

# Backend syntax preflight (used in CI)
npm --prefix backend run check

# Lint and format (frontend, used in CI)
npm --prefix frontend run lint
npm --prefix frontend run format:check
```

Optional root helpers:

```bash
npm run build:tokens        # build design tokens from design-tokens/
npm run docs:manual:pdf     # regenerate the user manual PDF
```

## Docker

Verified Compose services:

| Service | Role |
| --- | --- |
| `postgres` | PostgreSQL 16 Alpine with `pg_isready` healthcheck |
| `migrate` | One-shot job: applies versioned migrations, then exits |
| `backend` | Node 22 Alpine, non-root user, `postgresql-client` for backup/restore |
| `frontend` | Nginx: serves the SPA, proxies `/api` to the backend, SSE-friendly buffering |

```bash
cp .env.example .env
# Set at minimum: DB_PASSWORD, JWT_SECRET,
# MIGRATION_RECOVERY_PROOF_ID, MIGRATION_CHANGE_ID

docker compose up --build
```

Application UI: `http://localhost` (Compose publishes the frontend on port 80).

Notes:

- Database state lives in the `pgdata` volume; backups in the `backups` volume.
- Application containers use `no-new-privileges` and drop all capabilities.
- Set `TRUST_PROXY_CIDRS` only to the exact CIDR of a reverse proxy you control. Wildcards (`*`, `0.0.0.0/0`) are rejected.

## Security

High-level security model as implemented (no exploit-oriented detail):

| Area | Implementation |
| --- | --- |
| Authentication | HttpOnly session cookie; JWT validated against server-side sessions (revocable, sliding) |
| Authorization | Roles `user` / `admin` / `superadmin` plus 13 feature permission keys, enforced in API middleware |
| Password storage | bcrypt with configurable rounds (default 12, bounded 10–14); non-bcrypt hashes fail closed |
| Account protection | Login failure lockout state; OTP-based password reset with hashing, expiry, and attempt limits |
| Session hygiene | Short access-token TTL with server session as source of truth; logout revokes server-side |
| Rate limiting | Global API limiter, per-user authenticated limiter, dedicated auth endpoint limiter |
| SQL | Parameterized queries; dynamic export identifiers restricted through an allowlist helper |
| Input / output | JSON-only body policy for API mutations; DOMPurify sanitizing on client and server paths |
| Headers | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP; HSTS when deployed behind TLS |
| CORS | Exact origin allowlist; wildcards rejected at startup |
| XLSX | Formula-injection neutralization on export; template-aligned import validation |
| Audit | Cross-module system audit (before/after JSONB, actor, IP, user-agent) plus login audit |
| Secrets | Required via environment with no insecure source defaults; `.env*` gitignored (examples only tracked) |
| Supply chain | Dependabot, `npm audit --audit-level=high` in CI, CycloneDX SBOM artifacts, CodeQL |
| Containers | Non-root backend, capability drop, `no-new-privileges` |

### Security disclosure

To report a vulnerability, open a private GitHub security advisory on this repository, or contact the maintainer through GitHub.

**Do not commit secrets, credentials, private keys, production configuration, or sensitive infrastructure information.**

- Keep real values only in local `.env` files (gitignored) or a secret manager
- Use GitHub repository secrets for CI/CD values that cannot be dummy data
- Rotate any credential that may have been exposed
- Never publish private keys or database dumps

## Environment Variables

Representative placeholders (always prefer the `.env.example` files as the source of truth):

```env
# backend/.env
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=<database-name>
DB_USER=<database-user>
DB_PASSWORD=<set-in-environment>

JWT_SECRET=<generate-a-strong-random-secret-at-least-32-characters>
PASSWORD_BCRYPT_ROUNDS=12
ACCESS_TOKEN_TTL_SECONDS=900

CORS_ORIGINS=http://localhost:5173
TRUST_PROXY_CIDRS=

EMAIL_ENABLED=false
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=<sender@example.com>

ALLOW_DB_MIGRATIONS=false
MIGRATION_MODE=fresh
MIGRATION_EXPECTED_HOST=localhost
MIGRATION_EXPECTED_DATABASE=<database-name>
MIGRATION_RECOVERY_PROOF_ID=
MIGRATION_CHANGE_ID=
```

```env
# frontend/.env
VITE_API_BASE_URL=
VITE_HOST=127.0.0.1
VITE_API_PROXY_TARGET=http://127.0.0.1:3000
```

Full variable lists: `backend/.env.example`, `frontend/.env.example`, and root `.env.example`.

## API Overview

Base path: `/api`. JSON in/out. Mutating requests must send `Content-Type: application/json`. Authentication uses the session cookie established at login.

| Area | Prefix | Access |
| --- | --- | --- |
| Authentication | `/api/auth/*` | Public login/reset (rate-limited); session for the rest |
| Health | `/health` | Public |
| IT assets | `/api/assets` | Feature permission `assets` |
| GA assets | `/api/ga-assets` (+ aliases) | Permission `assets_ga` |
| OPS assets | `/api/ops-assets` (+ aliases) | Permission `assets_ops` |
| Tickets and queues | `/api/tickets`, `/api/ticket-queues` | Permission `tickets` (SSE: `GET /api/tickets/events`) |
| Submissions | `/api/submissions` | Permission `submissions` |
| Shipments | `/api/shipments` (+ alias) | Permission `shipments` |
| Help Center content | `/api/cases/public`, `/api/faqs/public`, `/api/kb-categories/public` | Public, published only |
| CMS content | `/api/cases`, `/api/faqs`, `/api/kb-categories` | Permission `knowledge_base` |
| Bookmarks | `/api/case-bookmarks` | Authenticated session |
| Employees | `/api/employees` (+ legacy alias) | Admin+ |
| Users | `/api/users` | Admin+ |
| Activity logs | `/api/logs` | Admin+ |
| Excel import | `/api/import/*` | Admin+ |
| Export | `/api/export/*` | Superadmin |
| Backup / restore | `/api/admin/database/*` | Superadmin |

Legacy path aliases remain for compatibility; authorization is always re-checked on the server. There is no OpenAPI document in this repository.

## Development Workflow

1. Clone the repository and install dependencies (`npm ci` per package).
2. Copy `.env.example` templates; set local secrets only in gitignored files.
3. Start PostgreSQL 16.
4. Run `npm run db:migrate:plan`, then `npm run db:migrate:apply` with guards set.
5. Start backend (`npm --prefix backend run dev`) and frontend (`npm --prefix frontend run dev`).
6. Run unit tests (`npm run test:backend`, `npm run test:frontend`).
7. Run E2E when needed (`cp .env.e2e.example .env.e2e`, then `npm run test:e2e`).
8. Run lint/format checks (`npm --prefix frontend run lint`, `npm --prefix frontend run format:check`).
9. Open a pull request against `main` and wait for required checks.

## CI and Quality Checks

| Workflow | Purpose |
| --- | --- |
| `ci.yml` | Backend preflight + unit tests with PostgreSQL service; frontend lint, format, unit tests, build; dependency audit + SBOM |
| `e2e-tests.yml` | Playwright on PRs (smoke + accessibility) and full suite on `main` |
| `codeql.yml` | CodeQL analysis for JavaScript/TypeScript |
| Dependabot | Weekly npm updates (root, backend, frontend); monthly GitHub Actions updates |

Repository automation also includes a pull request template and CODEOWNERS for review routing.

## Troubleshooting

| Symptom | Things to check |
| --- | --- |
| Backend exits on startup | `JWT_SECRET` and `DB_PASSWORD` set, minimum length satisfied |
| `ECONNREFUSED` to PostgreSQL | Server running on the configured host/port; `DB_*` values in `backend/.env` |
| `GET /health` not healthy | Database reachable with current credentials; migrations applied |
| Migration command refuses to run | `ALLOW_DB_MIGRATIONS=true`, expected host/database match, recovery proof and change ID present |
| CORS errors in the browser | Exact origin listed in `CORS_ORIGINS` (scheme, host, port); no trailing mismatches |
| Frontend cannot reach API | Vite proxy target (`VITE_API_PROXY_TARGET`) points at the running backend; `/api` path not overridden by `VITE_API_BASE_URL` unless intentional |
| Port already in use | Free `3000` (API), `5173` (Vite), `5432` (PostgreSQL), or `80` (Compose frontend) |
| E2E fails before tests | `.env.e2e` present; `DB_HOST` loopback; `DB_NAME` ends with `_test`; Playwright browsers installed |
| Compose stack unhealthy | Required `.env` values filled; `migrate` job finished successfully before backend start; `docker compose ps` and service logs |
| Lint/format CI failure | Run `npm --prefix frontend run lint` and `npm --prefix frontend run format:check` locally |

## Contributing

Contributions are welcome.

1. Fork and create a feature branch from `main`.
2. Keep changes focused; follow existing layering (`routes → controllers → services`) and coding conventions in `docs/CONVENTIONS.md`.
3. Add or update tests for behavioral changes.
4. Run unit tests, lint, and format checks; run E2E when flows are affected.
5. Open a pull request using the repository template. Do not include credentials, dumps, or internal environment data.
6. Address review feedback before merge.

## Roadmap

Planned improvements are tracked through [GitHub Issues](https://github.com/muhhlmy/esb-trackit/issues).

Known architectural consideration documented in code: realtime delivery is currently in-process (single instance). Multi-instance options such as PostgreSQL `LISTEN/NOTIFY` or an external pub/sub bus are noted in `backend/src/services/realtimeService.js`.

## License

No license has been specified yet. No `LICENSE` file is present in this repository. All rights reserved by the copyright holder unless a license is added later.
