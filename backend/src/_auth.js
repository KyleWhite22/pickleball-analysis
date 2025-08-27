exports.getUserId = (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  return claims.sub || claims["cognito:username"] || null;
};