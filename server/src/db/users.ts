import { randomUUID } from 'crypto';
import pool from './connection';

type UserRow = {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
};

function toAuthUser(row: UserRow): Express.User {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    avatarUrl: row.avatar_url,
  };
}

export async function getUserById(id: string): Promise<Express.User | null> {
  const result = await pool.query<UserRow>(
    'SELECT id, display_name, email, avatar_url FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ? toAuthUser(result.rows[0]) : null;
}

export async function findOrCreateGoogleUser(profile: {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}): Promise<Express.User> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize first-time logins for the same Google account.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`google:${profile.id}`]);

    const existing = await client.query<UserRow>(
      `SELECT u.id, u.display_name, u.email, u.avatar_url
       FROM users u
       JOIN oauth_accounts oa ON oa.user_id = u.id
       WHERE oa.provider = 'google' AND oa.provider_user_id = $1`,
      [profile.id]
    );

    if (existing.rows[0]) {
      const updated = await client.query<UserRow>(
        `UPDATE users
         SET display_name = $2, email = $3, avatar_url = $4, updated_at = NOW()
         WHERE id = $1
         RETURNING id, display_name, email, avatar_url`,
        [existing.rows[0].id, profile.displayName, profile.email, profile.avatarUrl]
      );
      await client.query(
        `UPDATE oauth_accounts SET updated_at = NOW()
         WHERE provider = 'google' AND provider_user_id = $1`,
        [profile.id]
      );
      await client.query('COMMIT');
      return toAuthUser(updated.rows[0]);
    }

    const userId = randomUUID();
    const created = await client.query<UserRow>(
      `INSERT INTO users (id, display_name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, display_name, email, avatar_url`,
      [userId, profile.displayName, profile.email, profile.avatarUrl]
    );
    await client.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
       VALUES ($1, 'google', $2)`,
      [userId, profile.id]
    );
    await client.query('COMMIT');
    return toAuthUser(created.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
