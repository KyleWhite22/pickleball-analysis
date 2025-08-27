const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { getOptionalUserId } = require("./auth_optional");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    // Response varies with presence of Authorization header
    "Vary": "Authorization",
  },
  body: JSON.stringify(body),
});

/**
 * GET /leagues
 * Public endpoint. If caller includes a valid ID token, return ONLY their leagues.
 * If anonymous, return [] (use /leagues/public for public discovery).
 * Response: League[]  (array, not wrapped)
 */
exports.handler = async (event) => {
  try {
    const userId = await getOptionalUserId(event);
    if (!userId) {
      // Anonymous: no owner context → empty list
      return json(200, []);
    }

    // Query GSI1 by owner
    const cmd = new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `OWNER#${userId}` },
      },
      // newest first if GSI1SK = createdAt
      ScanIndexForward: false,
      Limit: 50,
      ProjectionExpression: "leagueId, #n, ownerId, createdAt, visibility",
      ExpressionAttributeNames: { "#n": "name" },
    });

    const res = await ddb.send(cmd);
    const leagues = (res.Items || []).map((it) => {
      const x = unmarshall(it);
      return {
        leagueId: x.leagueId,
        name: x.name,
        ownerId: x.ownerId,       // may be hidden in other endpoints for non-owners
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