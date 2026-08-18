# DraftBase

A fantasy football mock draft simulator and customizable player ranking board.

## Features

- Real-time snake mock drafts with automated opponents
- PPR player rankings with ESPN projections and position filters
- Drag-and-drop tiers, player notes, targets, and avoid flags
- Live draft tracking and CSV export

## Run locally

### Configure authentication

1. Copy `server/.env.example` to `server/.env` and fill in the database and Google credentials.
2. In Google Cloud Console, create an OAuth 2.0 **Web application** client.
3. Add `http://localhost:4000/auth/google/callback` as an authorized redirect URI.
4. Generate a strong `SESSION_SECRET` (at least 32 random bytes).
5. Apply the authentication schema once:

```bash
cd server
npm run migrate:auth
```

For production, use the deployed HTTPS callback URL, set `NODE_ENV=production`, and set `CLIENT_URL` and `GOOGLE_CALLBACK_URL` to the exact deployed origins. The API and Socket.IO server only accept origins listed in `CLIENT_URL` (comma-separated when needed).

### Start the apps

Install and start each app in a separate terminal:

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

The client runs at `http://localhost:5173` and the API at `http://localhost:4000`.
