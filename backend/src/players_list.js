const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
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

    const res = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :p)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":p":  { S: "PLAYER#" },
      },
      ProjectionExpression: "playerId, #nm, nameNorm, createdAt",
      ExpressionAttributeNames: { "#nm": "name" },
      Limit: 500
    }));

    const players = (res.Items || []).map(unmarshall).map(p => ({
      playerId: p.playerId || (p.SK ? p.SK.split("#")[1] : undefined),
      name: p.name,
      nameNorm: p.nameNorm,
      createdAt: p.createdAt
    })).filter(p => p.playerId);

    // sort alphabetically by display name
    players.sort((a, b) => a.name.localeCompare(b.name));

    return json(200, { leagueId, players });
  } catch (err) {
    console.error("players_list error:", err);
    return json(500, { error: "internal_error" });
  }
};