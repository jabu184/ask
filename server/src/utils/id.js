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

/**
 * Generate a 6-digit numeric PIN for polls
 */
function generatePollPin(length = 6) {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10);
  }
  return pin;
}

module.exports = {
  generateSlug,
  generateId,
  generatePollPin
};

