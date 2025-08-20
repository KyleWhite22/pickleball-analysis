const { DynamoDBClient, QueryCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });

    const body = event.body ? JSON.parse(event.body) : {};
    const requesterId = body.requesterId || null; // optional: who is undoing

    // 1) fetch newest match for this league
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :p)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":p":  { S: "MATCH#" },
      },
      ScanIndexForward: false, // newest first
      Limit: 1,
    }));

    if (!q.Items || q.Items.length === 0) {
      return json(404, { error: "no_matches" });
    }

    const latest = unmarshall(q.Items[0]);
    // optional: simple permission check
    if (requesterId && latest.createdBy && latest.createdBy !== requesterId) {
      // you can relax/modify this rule; for now only the original submitter (or omit requesterId) can undo
      return json(403, { error: "forbidden_not_creator" });
    }

    // 2) delete it
    await ddb.send(new DeleteItemCommand({
      TableName: TABLE,
      Key: {
        PK: { S: `LEAGUE#${leagueId}` },
        SK: { S: latest.SK }, // keep the exact SK we queried
      },
      // defensive: ensure we're deleting a match item
      ConditionExpression: "begins_with(SK, :p)",
      ExpressionAttributeValues: { ":p": { S: "MATCH#" } },
    }));

    return json(200, { ok: true, deletedMatchId: latest.matchId, leagueId });
  } catch (err) {
    console.error("matches_delete_last error:", err);
    // Conditional fail means someone wrote a new match between query and delete
    if (err?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "conflict_retry" });
    }
    return json(500, { error: "internal_error" });
  }
};