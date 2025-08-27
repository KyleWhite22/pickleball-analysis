// src/leagues_list.js
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

function getUserIdFromAuthorizer(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  return claims.sub || claims["cognito:username"] || null;
}

/**
 * GET /leagues
 * Protected by API Gateway JWT authorizer (authorizer: jwtAuth).
 * Returns ONLY the leagues owned by the caller.
 * Response: League[] (array, not wrapped)
 */
exports.handler = async (event) => {
  try {
    const userId = getUserIdFromAuthorizer(event);
    if (!userId) return json(401, { error: "unauthorized" }); // shouldn't happen if authorizer is on

    const res = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `OWNER#${userId}` },
      },
      ScanIndexForward: false, // newest first if GSI1SK = createdAt
      Limit: 50,
      ProjectionExpression: "leagueId, #n, ownerId, createdAt, visibility",
      ExpressionAttributeNames: { "#n": "name" },
    }));

    const leagues = (res.Items || []).map((it) => {
      const x = unmarshall(it);
      return {
        leagueId: x.leagueId,
        name: x.name,
        ownerId: x.ownerId,
        createdAt: x.createdAt,
        visibility: x.visibility, // 'public' | 'private'
      };
    });

    return json(200, leagues);
  } catch (err) {
    console.error("leagues_list error:", err);
    return json(500, { error: "internal_error" });
  }
};
