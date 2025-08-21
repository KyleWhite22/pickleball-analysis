const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

function randId(len = 12) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[(Math.random() * alphabet.length) | 0];
  return out;
}
function inviteCode(len = 5) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < len; i++) code += chars[(Math.random() * chars.length) | 0];
  return code;
}
const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const name = (body.name || '').trim();
    if (!name) return json(400, { error: 'name is required' });

    const ownerId = (body.ownerId || 'dev-user').toString();
    const visibilityRaw = (body.visibility || 'private').toString().toLowerCase();
    const visibility = visibilityRaw === 'public' ? 'public' : 'private';

    const now = new Date().toISOString();
    const leagueId = randId(10);
    const code = inviteCode(5);

    const item = {
      PK: `LEAGUE#${leagueId}`,
      SK: 'METADATA',
      leagueId,
      name,
      ownerId,
      inviteCode: code,
      createdAt: now,
      visibility,                      // 👈 new

      // existing GSIs
      GSI1PK: `OWNER#${ownerId}`,
      GSI1SK: now,
      GSI2PK: `INVITE#${code}`,
      GSI2SK: `LEAGUE#${leagueId}`,
    };

    // Only public leagues appear in GSI3 (public directory)
    if (visibility === 'public') {
      item.GSI3PK = 'VISIBILITY#PUBLIC';
      item.GSI3SK = now;               // newest first
    }

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall(item),
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    }));

    return json(201, { leagueId, name, ownerId, inviteCode: code, createdAt: now, visibility });
  } catch (err) {
    console.error("createLeague error:", err);
    if (err?.name === "ConditionalCheckFailedException") return json(409, { error: "exists" });
    return json(500, { error: "internal_error" });
  }
};