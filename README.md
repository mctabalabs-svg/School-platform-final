# School Platform

The application is an Express API with a Vite/React dashboard. Local development uses PGlite; when `DATABASE_URL` is set, the server uses a persistent PostgreSQL connection pool. Existing Greenfield seed records remain in the default `public` schema. Provisioned schools receive separate PostgreSQL schemas.

## Local development

1. Copy `.env.example` to `.env`.
2. Set a random `JWT_SECRET` (at least 32 characters is recommended in every environment).
3. Run `npm install`, then `npm run dev`.

Without `DATABASE_URL`, the server runs in single-school PGlite development mode. School provisioning is deliberately unavailable in this mode.

## Docker deployment

1. Copy `.env.example` to `.env` and replace the example values. Use a unique PostgreSQL password made from URL-safe characters (letters, numbers, `_`, or `-`), a private `JWT_SECRET` of at least 32 characters, and a platform-admin password of 16–72 UTF-8 bytes.
2. Start the app and PostgreSQL with `docker compose up --build -d`.
3. Open `http://localhost:3000`. To follow startup logs, run `docker compose logs -f app`; to stop the services, run `docker compose down`.

Compose waits for PostgreSQL to become healthy before starting the app. Database data is stored in the `postgres_data` named volume and survives container restarts and `docker compose down`. To intentionally remove that data, run `docker compose down --volumes`. The app bootstraps the platform administrator and initializes the Greenfield seed data on first startup; subsequent startups do not rotate an existing administrator's password. Remove `PLATFORM_ADMIN_PASSWORD` from `.env` after confirming the first startup if your workflow permits it.

The app container listens on port 3000. Change `APP_PORT` in `.env` to select a different host port. For an external PostgreSQL deployment, set `DATABASE_URL` to a TLS-enabled connection string and provide the required secrets through the deployment environment.

## Multi-school readiness

School provisioning requires a persistent PostgreSQL `DATABASE_URL` and is restricted to the environment-bootstrapped platform administrator. Each provisioned school gets an empty, isolated PostgreSQL schema and an active first school-admin account. That administrator can sign in with the email and password entered during provisioning.

Non-Greenfield school admins currently land on a school-specific, read-only setup page. Greenfield's dashboard data modules are deliberately hidden for those accounts because not all screens and integrations have been migrated to tenant-specific records. Do not enable those modules for additional schools until each data surface and webhook has been migrated and verified with isolation tests. No Greenfield student, teacher, attendance, assessment, or fee rows are copied into new school schemas.

The external PostgreSQL startup seeds the existing Greenfield demo fixtures. It does not import unseeded edits from a prior local PGlite database; plan and verify a separate export/import before switching an installation whose Greenfield database contains real changes.

## Authentication notes

- Production API routes require a valid JWT. Missing, malformed, expired, or invalid tokens receive `401`; the demo role fallback is limited to non-production.
- Sign-in attempts are limited to 8 per IP address per 15 minutes. The limiter is in-memory and resets when the server restarts; use a shared rate-limit store if deploying multiple app instances.
- User sessions are checked against the profile endpoint when the app loads. Access tokens expire after one hour, inactive accounts cannot restore a session, and saved client-side profile data is not trusted.
- Login errors do not reveal whether an email address exists. Demo credentials and the role simulator are only displayed in development builds.
- `POST /api/auth/login` authenticates Greenfield users, the environment-bootstrapped platform administrator, and active school-admin accounts provisioned by the platform administrator. A school-admin token is scoped to the school's isolated schema; non-Greenfield accounts currently have access to the safe setup page only.
- `GET /api/platform/schools` and `POST /api/platform/schools` require the platform-admin JWT. The create request expects `name`, `adminFirstName`, `adminLastName`, `adminEmail`, and `adminPassword`.
- Health check: `GET /api/health`.

## Commands

- `npm run dev` — local development server
- `npm run typecheck` — TypeScript validation
- `npm run build` — TypeScript compilation and Vite production build
