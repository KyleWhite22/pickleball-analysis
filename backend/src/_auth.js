exports.getUserId = (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  // Prefer 'sub' (stable subject). Fall back to email/username if you want.
  return claims.sub || claims.email || claims["cognito:username"] || null;
};