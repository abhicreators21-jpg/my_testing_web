/** Shared HTTP helpers: typed API errors and server-side input validation. */

export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details = null) => new ApiError(400, message, details);
export const unauthorized = (message = 'Please sign in to continue') => new ApiError(401, message);
export const forbidden = (message = 'You do not have access to this resource') => new ApiError(403, message);
export const notFound = (message = 'Resource not found') => new ApiError(404, message);

/** Wrap async route handlers so rejected promises reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Small declarative validator. Every field is collected into `data` (trimmed /
 * coerced) and failures are collected into `errors`, so a request returns all
 * problems at once with a 422 status.
 */
export class Validator {
  constructor(body) {
    this.body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    this.errors = {};
    this.data = {};
  }

  fail(field, message) {
    if (!this.errors[field]) this.errors[field] = message;
    return this;
  }

  raw(field) {
    const value = this.body[field];
    return typeof value === 'string' ? value.trim() : value;
  }

  string(field, { required = true, min = 1, max = 255, label } = {}) {
    const name = label || field;
    const value = this.raw(field);
    if (value === undefined || value === null || value === '') {
      if (required) this.fail(field, `${name} is required`);
      else this.data[field] = null;
      return this;
    }
    if (typeof value !== 'string') return this.fail(field, `${name} must be text`);
    if (value.length < min) return this.fail(field, `${name} must be at least ${min} characters`);
    if (value.length > max) return this.fail(field, `${name} must be at most ${max} characters`);
    this.data[field] = value;
    return this;
  }

  email(field, { required = true, label = 'Email' } = {}) {
    const value = this.raw(field);
    if (value === undefined || value === null || value === '') {
      if (required) this.fail(field, `${label} is required`);
      else this.data[field] = null;
      return this;
    }
    if (typeof value !== 'string' || !EMAIL_RE.test(value)) {
      return this.fail(field, 'Enter a valid email address');
    }
    this.data[field] = value.toLowerCase();
    return this;
  }

  password(field = 'password', { required = true, min = 8, max = 128 } = {}) {
    const value = this.body[field];
    if (value === undefined || value === null || value === '') {
      if (required) this.fail(field, 'Password is required');
      return this;
    }
    if (typeof value !== 'string') return this.fail(field, 'Password must be text');
    if (value.length < min) return this.fail(field, `Password must be at least ${min} characters`);
    if (value.length > max) return this.fail(field, 'Password is too long');
    if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
      return this.fail(field, 'Password must contain at least one letter and one number');
    }
    this.data[field] = value;
    return this;
  }

  int(field, { required = true, min = 0, max = 1_000_000, label } = {}) {
    const name = label || field;
    const raw = this.raw(field);
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.fail(field, `${name} is required`);
      else this.data[field] = null;
      return this;
    }
    const value = Number(raw);
    if (!Number.isInteger(value)) return this.fail(field, `${name} must be a whole number`);
    if (value < min) return this.fail(field, `${name} must be at least ${min}`);
    if (value > max) return this.fail(field, `${name} must be at most ${max}`);
    this.data[field] = value;
    return this;
  }

  /** Accepts a price in dollars (number or numeric string) and stores cents. */
  price(field = 'price', { required = true, min = 0, max = 1_000_000, label = 'Price' } = {}) {
    const raw = this.raw(field);
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.fail(field, `${label} is required`);
      return this;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return this.fail(field, `${label} must be a number`);
    if (value < min) return this.fail(field, `${label} must be at least ${min}`);
    if (value > max) return this.fail(field, `${label} must be at most ${max}`);
    this.data[`${field}_cents`] = Math.round(value * 100);
    return this;
  }

  enum(field, allowed, { required = true, label } = {}) {
    const name = label || field;
    const value = this.raw(field);
    if (value === undefined || value === null || value === '') {
      if (required) this.fail(field, `${name} is required`);
      return this;
    }
    if (!allowed.includes(value)) {
      return this.fail(field, `${name} must be one of: ${allowed.join(', ')}`);
    }
    this.data[field] = value;
    return this;
  }

  bool(field, { defaultValue = false } = {}) {
    const value = this.raw(field);
    if (value === undefined || value === null || value === '') {
      this.data[field] = defaultValue;
      return this;
    }
    this.data[field] = value === true || value === 'true' || value === 1 || value === '1';
    return this;
  }

  url(field, { required = false, label = 'Image URL' } = {}) {
    const value = this.raw(field);
    if (value === undefined || value === null || value === '') {
      if (required) this.fail(field, `${label} is required`);
      else this.data[field] = null;
      return this;
    }
    if (typeof value !== 'string' || !/^(https?:\/\/|\/)[^\s]*$/i.test(value)) {
      return this.fail(field, `${label} must be a valid URL`);
    }
    this.data[field] = value;
    return this;
  }

  done() {
    const fields = Object.keys(this.errors);
    if (fields.length) {
      throw new ApiError(422, 'Please check the highlighted fields', this.errors);
    }
    return this.data;
  }
}

export const parseId = (value, label = 'id') => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`Invalid ${label}`);
  return id;
};
