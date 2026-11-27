/** Auth + account routes: register, login, logout, session, profile. */
import { Router } from 'express';
import { db } from '../db.js';
import { ApiError } from '../utils.js';
import { Validator, asyncHandler } from '../utils.js';
import {
  hashPassword,
  verifyPassword,
  issueToken,
  setSessionCookie,
  clearSessionCookie,
  publicUser,
  requireAuth,
} from '../auth.js';

const router = Router();
const USER_COLUMNS =
  'id, name, email, role, phone, address, city, zip, country, created_at';

// Very small in-memory brute-force guard for the login endpoint.
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 12;

function tooManyAttempts(key) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    attempts.set(key, { first: Date.now(), count: 1 });
  } else {
    entry.count += 1;
  }
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = new Validator(req.body)
      .string('name', { min: 2, max: 80, label: 'Full name' })
      .email('email')
      .password('password')
      .done();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
    if (existing) {
      throw new ApiError(409, 'An account with that email already exists', {
        email: 'That email is already registered',
      });
    }

    const info = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')")
      .run(data.name, data.email, hashPassword(data.password));

    const user = publicUser(
      db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(info.lastInsertRowid),
    );
    const token = issueToken(user);
    setSessionCookie(res, token);
    res.status(201).json({ user, token });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = new Validator(req.body)
      .email('email')
      .string('password', { required: true, min: 1, max: 128, label: 'Password' })
      .done();

    const key = `${req.ip}:${data.email}`;
    if (tooManyAttempts(key)) {
      throw new ApiError(429, 'Too many sign-in attempts. Please try again in a few minutes.');
    }

    const row = db
      .prepare(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`)
      .get(data.email);

    if (!row || !verifyPassword(data.password, row.password_hash)) {
      recordFailure(key);
      throw new ApiError(401, 'Incorrect email or password');
    }
    attempts.delete(key);

    const user = publicUser(row);
    const token = issueToken(user);
    setSessionCookie(res, token);
    res.json({ user, token });
  }),
);

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

router.patch(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const validator = new Validator(req.body)
      .string('name', { min: 2, max: 80, label: 'Full name' })
      .string('phone', { required: false, max: 40, label: 'Phone' })
      .string('address', { required: false, max: 200, label: 'Address' })
      .string('city', { required: false, max: 80, label: 'City' })
      .string('zip', { required: false, max: 20, label: 'ZIP / postal code' })
      .string('country', { required: false, max: 80, label: 'Country' });

    const wantsPasswordChange = Boolean(req.body?.newPassword);
    if (wantsPasswordChange) {
      validator.password('newPassword', { min: 8 });
      validator.string('currentPassword', { min: 1, max: 128, label: 'Current password' });
    }
    const data = validator.done();

    if (wantsPasswordChange) {
      const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
      if (!row || !verifyPassword(data.currentPassword, row.password_hash)) {
        throw new ApiError(422, 'Please check the highlighted fields', {
          currentPassword: 'Current password is incorrect',
        });
      }
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
        hashPassword(data.newPassword),
        req.user.id,
      );
    }

    db.prepare(
      `UPDATE users
         SET name = ?, phone = ?, address = ?, city = ?, zip = ?, country = ?
       WHERE id = ?`,
    ).run(
      data.name,
      data.phone || '',
      data.address || '',
      data.city || '',
      data.zip || '',
      data.country || '',
      req.user.id,
    );

    const user = publicUser(
      db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(req.user.id),
    );
    res.json({ user });
  }),
);

export default router;
