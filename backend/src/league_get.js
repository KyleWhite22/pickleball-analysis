const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
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

    const res = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: {
        PK: { S: `LEAGUE#${leagueId}` },
        SK: { S: "METADATA" },
      },
    }));

    if (!res.Item) return json(404, { error: "not_found" });
    const item = unmarshall(res.Item);
    return json(200, {
      leagueId: item.leagueId,
      name: item.name,
      ownerId: item.ownerId,
      inviteCode: item.inviteCode,
      createdAt: item.createdAt,
    });
  } catch (err) {
    console.error("league_get error:", err);
    return json(500, { error: "internal_error" });
  }
};