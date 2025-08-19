import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims?.sub) return { statusCode: 401, body: "Unauthorized" };
    const userId = claims.sub;

    const body = JSON.parse(event.body || "{}");
    const now = Date.now();
    const matchId = `m_${now}`;

    const item = {
      PK: `USER#${userId}`,
      SK: `MATCH#${matchId}`,
      date: body.date || new Date().toISOString().slice(0,10),
      teamA: body.teamA || [],
      teamB: body.teamB || [],
      score: body.score || "",
      winner: body.winner || null,
      createdAt: now
    };

    await ddb.send(new PutCommand({ TableName: process.env.TABLE, Item: item }));
    return { statusCode: 200, body: JSON.stringify({ ok: true, matchId }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
