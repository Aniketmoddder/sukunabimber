const crypto = require('crypto');

const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString();
}

function generateToken(owner, limit, expiresIn) {
  const payload = {
    owner,
    limit,
    exp: Math.floor(Date.now() / 1000) + expiresIn
  };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadStr);

  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(encodedPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedPayload}.${signature}`;
}

function validateToken(token) {
  try {
    const [encodedPayload, signature] = token.split('.');
    
    // Recompute the signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(encodedPayload)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (expectedSignature !== signature) {
      return false;
    }

    const payloadStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr);

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    return payload;
  } catch (error) {
    return false;
  }
}

module.exports = { generateToken, validateToken };
