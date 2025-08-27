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

/**
 * getOptionalUserId(event) -> Promise<string|null>
 * - Reads Authorization: Bearer <ID_TOKEN> if present
 * - Verifies against Cognito issuer & audience
 * - Ensures token_use === 'id'
 * - Returns payload.sub (or cognito:username) on success; null otherwise
 */
async function getOptionalUserId(event) {
  try {
    const auth = _getAuthHeader(event);
    if (!auth || !auth.startsWith('Bearer ')) return null;

    // If misconfigured in env, fail soft to keep GETs public
    if (!ISSUER || !AUDIENCE) return null;

    const token = auth.slice(7).trim();
    if (!token) return null;

    const { jwtVerify } = await _jose();
    const jwks = await _getJwks();

    const { payload } = await jwtVerify(token, jwks, {
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: '5s', // small skew tolerance
      // algorithms: ['RS256'], // optional: Cognito uses RS256
    });

    // Only accept ID tokens (not access tokens)
    if (payload.token_use && payload.token_use !== 'id') return null;

    return payload.sub ?? payload['cognito:username'] ?? null;
  } catch {
    // Any error -> anonymous
    return null;
  }
}

module.exports = { getOptionalUserId };
