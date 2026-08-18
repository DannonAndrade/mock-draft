import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateGoogleUser, getUserById } from '../db';

dotenv.config();

export const googleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export function configurePassport() {
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await getUserById(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  if (!googleAuthConfigured) {
    console.warn('Google login is disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.');
    return;
  }

  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/callback',
      state: true,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.find((entry) => entry.verified)?.value
          ?? profile.emails?.[0]?.value
          ?? null;
        const user = await findOrCreateGoogleUser({
          id: profile.id,
          displayName: profile.displayName || email || 'DraftBase user',
          email,
          avatarUrl: profile.photos?.[0]?.value ?? null,
        });
        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  ));
}

export default passport;
