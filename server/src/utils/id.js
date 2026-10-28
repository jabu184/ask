const crypto = require('crypto');

/**
 * Generate a URL-friendly unique slug (10 characters)
 */
function generateSlug(length = 10) {
  return crypto.randomBytes(Math.ceil(length * 3 / 4))
    .toString('base64url')
    .slice(0, length);
}

/**
 * Generate standard UUID
 */
function generateId() {
  return crypto.randomUUID();
}

module.exports = {
  generateSlug,
  generateId
};
