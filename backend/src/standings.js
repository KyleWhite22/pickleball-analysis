export const handler = async (event) => {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims?.sub) return { statusCode: 401, body: "Unauthorized" };
  // TODO: query DynamoDB for players under PK=USER#sub; for now, stub:
  const data = [
    { playerId: "p_demo1", name: "Demo A", rating: 1200, wins: 1, losses: 0, delta: +12 },
    { playerId: "p_demo2", name: "Demo B", rating: 1188, wins: 0, losses: 1, delta: -12 }
  ];
  return { statusCode: 200, body: JSON.stringify(data) };
};