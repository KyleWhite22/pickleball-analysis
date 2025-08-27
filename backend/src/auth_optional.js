// src/auth_optional.js
// Optional ID-token verification for PUBLIC GET routes.
// If a valid Cognito ID token is present, returns the caller's userId (sub).
// If missing/invalid/any error, returns null (treat as anonymous).

// jose is ESM-only; use dynamic import to stay CJS-compatible in Lambda.
let _josePromise;
function _jose() {
  if (!_josePromise) _josePromise = import('jose');
  return _josePromise;
}

const ISSUER_RAW = process.env.COGNITO_ISSUER_URL || '';
const ISSUER = ISSUER_RAW.replace(/\/+$/, ''); // strip trailing slash if any
const AUDIENCE = process.env.COGNITO_APP_CLIENT_ID || '';

let _jwks; // cached across warm invocations
async function _getJwks() {
  if (!_jwks) {
    const { createRemoteJWKSet } = await _jose();
    _jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
  }
  return _jwks;
}

function _getAuthHeader(event) {
  const h = event?.headers || {};
  return h.authorization || h.Authorization || null;
}

let _verify = null;

async function getOptionalUserId(event) {
  try {
    const auth = event.headers?.authorization || event.headers?.Authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;

    // Lazy-load jose so missing deps don’t crash module init
    if (!_verify) {
      const rawIssuer = process.env.COGNITO_ISSUER_URL || '';
      const ISSUER = rawIssuer.replace(/\/+$/, ''); // strip trailing slashes
      const AUDIENCE = process.env.COGNITO_APP_CLIENT_ID || '';
      if (!ISSUER || !AUDIENCE) return null;

      const { createRemoteJWKSet, jwtVerify } = await import('jose');
      const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
      _verify = (token) => jwtVerify(token, jwks, { issuer: ISSUER, audience: AUDIENCE });
    }

    const token = auth.slice(7);
    const { payload } = await _verify(token);
    return payload.sub || payload['cognito:username'] || null;
  } catch {
    return null; // anonymous on any failure
  }
}

module.exports = { getOptionalUserId };
