const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

// Load full league metadata (includes fields we want to return)
async function loadLeagueMeta(leagueId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "METADATA" } },
    ProjectionExpression: "leagueId, ownerId, visibility, #n, inviteCode, createdAt",
    ExpressionAttributeNames: { "#n": "name" },
  }));
  return r.Item ? unmarshall(r.Item) : null;
}
function canView(meta, viewerId) {
  const vis = (meta?.visibility || 'private').toLowerCase();
  if (vis === 'public') return true;                 // anyone can view public
  return !!viewerId && viewerId === meta?.ownerId;   // only owner can view private
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });

    const viewerId = getUserId(event)

    const meta = await loadLeagueMeta(leagueId);
    if (!meta) return json(404, { error: "not_found" });
    if (!canView(meta, viewerId)) return json(403, { error: "forbidden" });

    return json(200, {
      leagueId: meta.leagueId,
      name: meta.name,
      ownerId: meta.ownerId,
      inviteCode: meta.inviteCode,
      createdAt: meta.createdAt,
      visibility: meta.visibility,
    });
  } catch (err) {
    console.error("league_get error:", err);
    return json(500, { error: "internal_error" });
  }
};