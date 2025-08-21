const {
  DynamoDBClient,
  QueryCommand,
  DeleteItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { getUserId } = require("./_auth");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

async function loadLeagueMeta(leagueId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "METADATA" } },
    ProjectionExpression: "ownerId",
  }));
  return r.Item ? unmarshall(r.Item) : null;
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });

    // 🔐 derive user from JWT
    const userId = getUserId(event);
    if (!userId) return json(401, { error: "unauthorized" });

    const meta = await loadLeagueMeta(leagueId);
    if (!meta) return json(404, { error: "not_found" });
    if (userId !== meta.ownerId) return json(403, { error: "forbidden" });

    // newest match first
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :p)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":p":  { S: "MATCH#" },
      },
      ScanIndexForward: false,
      Limit: 1,
    }));

    if (!q.Items || q.Items.length === 0) return json(404, { error: "no_matches" });

    const latest = unmarshall(q.Items[0]); // includes SK and matchId

    await ddb.send(new DeleteItemCommand({
      TableName: TABLE,
      Key: {
        PK: { S: `LEAGUE#${leagueId}` },
        SK: { S: latest.SK }, // safe because we didn't project it out
      },
      ConditionExpression: "begins_with(SK, :p)",
      ExpressionAttributeValues: { ":p": { S: "MATCH#" } },
    }));

    return json(200, { ok: true, deletedMatchId: latest.matchId, leagueId });
  } catch (err) {
    console.error("matches_delete_last error:", err);
    if (err?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "conflict_retry" });
    }
    return json(500, { error: "internal_error" });
  }
};
