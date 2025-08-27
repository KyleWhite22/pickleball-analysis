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

/**
 * GET /leagues/public
 * Returns PUBLIC leagues only (does not depend on auth).
 * Query params:
 *   - limit: number (1..200), default 50
 * Response: { leagues: { leagueId, name, createdAt, visibility }[], count: number }
 */
exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const limit = Math.min(Math.max(parseInt(qs.limit || "50", 10), 1), 200);

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: { ":pk": { S: "VISIBILITY#PUBLIC" } },
        ScanIndexForward: false, // newest first if GSI3SK = createdAt (or similar)
        Limit: limit,
        ProjectionExpression: "leagueId, #n, createdAt, visibility",
        ExpressionAttributeNames: { "#n": "name" },
      })
    );

    const leagues = (res.Items || []).map((it) => {
      const x = unmarshall(it);
      return {
        leagueId: x.leagueId,
        name: x.name,
        createdAt: x.createdAt,
        visibility: x.visibility, // 'public'
        // ownerId intentionally omitted in public listing
        // inviteCode removed from the model
      };
    });

    return json(200, { leagues, count: leagues.length });
  } catch (err) {
    console.error("leagues_public_list error:", err);
    return json(500, { error: "internal_error" });
  }
};