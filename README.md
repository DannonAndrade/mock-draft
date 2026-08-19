# DraftBase

A fantasy football mock draft simulator and customizable player ranking board.

## Features

- Real-time snake mock drafts with automated opponents
- PPR player rankings with ESPN projections and position filters
- Drag-and-drop tiers, player notes, targets, and avoid flags
- Live draft tracking and CSV export

## Architecture

- `client/`: React 19, Vite, Tailwind CSS, and the Socket.IO client
- `server/`: Express 5, Socket.IO, Passport Google OAuth, and PostgreSQL
- `shared/`: TypeScript types and draft constants imported by both applications

The draft simulator uses the players stored in PostgreSQL. The ranking board separately loads current fantasy data from ESPN through the server, so that feature requires outbound internet access.

## Set up from scratch

### 1. Install prerequisites

Install the following before cloning the project:

- Git
- PostgreSQL
- Node.js `20.19` or newer (`22 LTS` is recommended)
- npm

On Ubuntu or Debian, PostgreSQL can be installed and started with:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Clone the repository and enter it:

```bash
git clone <repository-url>
cd mock-draft
```

### 2. Create the database

Create a local database and assign a password to the default PostgreSQL administrator:

```bash
sudo -u postgres createdb draftbase
sudo -u postgres psql
```

At the `postgres=#` prompt, run:

```sql
ALTER USER postgres PASSWORD 'postgres';
\q
```

The password above matches the development example. Use a different, securely stored password outside local development.

### 3. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/draftbase
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SESSION_SECRET=replace-with-a-generated-secret
GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

Generate a session secret with:

```bash
openssl rand -hex 32
```

Replace `SESSION_SECRET` with the generated value.

If `.env` was edited on Windows and database names appear to contain hidden characters, convert its line endings:

```bash
sed -i 's/\r$//' .env
```

### 4. Initialize the database

Install the server dependencies, load `DATABASE_URL` into the current shell, and apply the schema in order:

```bash
npm ci
set -a
source .env
set +a
psql "$DATABASE_URL" -f migrations/001-create-core-schema.sql
npm run migrate:auth
psql "$DATABASE_URL" -f migrations/003-create-fantasy-boards.sql
psql "$DATABASE_URL" -f migrations/seed-players.sql
```

The seed script resets existing picks, teams, drafts, and players. Do not run it against a database whose draft data you need to preserve.

Verify the setup:

```bash
psql "$DATABASE_URL" -c '\dt'
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM players;'
```

The player query should return `187`. The session table is created automatically when the server first starts.

### 5. Configure Google authentication

The simulator requires a signed-in user to create, join, start, or participate in drafts.

1. Open Google Cloud Console and create or select a project.
2. Configure its OAuth consent screen.
3. Create an OAuth 2.0 client with application type **Web application**.
4. Add `http://localhost:4000/auth/google/callback` as an authorized redirect URI.
5. Put the generated client ID and client secret in `server/.env`.

The server can start without Google credentials, but login and authenticated simulator actions will be disabled.

### 6. Configure the client

From the repository root:

```bash
cd client
cp .env.example .env
npm ci
```

For local development, `client/.env` should contain:

```dotenv
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### 7. Start both applications

From the repository root, run the server in one terminal:

```bash
cd server
npm run dev
```

From the repository root, run the client in another terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`. The API and Socket.IO server run at `http://localhost:4000`.

Check the server and database directly with:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/db-test
```

Both responses should report an `ok` status.

## Running on a remote Linux server

When the applications run over SSH, forward both ports to the laptop:

```bash
ssh -L 5173:localhost:5173 -L 4000:localhost:4000 user@server
```

Then open `http://localhost:5173` on the laptop. VS Code Remote SSH and similar tools may detect and forward these ports automatically; check the editor's **Ports** panel.

Alternatively, expose Vite on the local network:

```bash
npm run dev -- --host 0.0.0.0
```

For LAN access, replace `localhost` in `CLIENT_URL`, `VITE_API_URL`, and `VITE_SOCKET_URL` with the server's LAN address. Google OAuth has additional redirect restrictions for non-localhost HTTP addresses, so an HTTPS hostname is recommended for shared or permanent deployments.

## Production notes

- Set `NODE_ENV=production` and use HTTPS.
- Set a stable, secret `SESSION_SECRET`.
- Set `CLIENT_URL` and `GOOGLE_CALLBACK_URL` to the exact deployed URLs.
- Add the deployed callback URL to the Google OAuth client.
- Set the client API and Socket.IO URLs before building the client.
- `CLIENT_URL` accepts a comma-separated list when more than one origin is required.
- Run `npm run build` independently in `server/` and `client/`; this repository is not configured as an npm workspace.
