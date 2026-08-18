import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pool from '../db/connection';

dotenv.config();

export const SESSION_COOKIE_NAME = 'draftbase.sid';

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production');
  }
  sessionSecret = randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET is not set; using a temporary development secret.');
}

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
