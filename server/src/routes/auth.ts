import { Router } from 'express';
import passport, { googleAuthConfigured } from '../auth/passport';
import { SESSION_COOKIE_NAME } from '../auth/session';

const router = Router();
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

router.get('/google', (req, res, next) => {
  if (!googleAuthConfigured) {
    return res.status(503).json({ error: 'Google authentication is not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${clientUrl}/signin?authError=google` }),
  (_req, res) => res.redirect(`${clientUrl}/simulator`)
);

router.get('/me', (req, res) => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

router.post('/logout', (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) return next(logoutError);
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      res.status(204).end();
    });
  });
});

export default router;
