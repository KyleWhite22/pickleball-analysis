const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: '{"error":"leagueId required"}' };

    const res = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :p)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":p":  { S: "MATCH#" },
      },
      ScanIndexForward: false, // newest first
      Limit: 100,
    }));

    const items = (res.Items || []).map(unmarshall);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ leagueId, matches: items }),
    };
  } catch (err) {
    console.error("matches_list error:", err);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: '{"error":"internal_error"}' };
  }
};