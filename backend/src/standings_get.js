const { DynamoDBClient, QueryCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

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
    ProjectionExpression: "ownerId, visibility",
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
if (!canView(meta, viewerId)) {
  return json(403, { error: 'forbidden' });
}
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :p)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":p":  { S: "MATCH#" },
      },
      ScanIndexForward: false,
      Limit: 500,
    }));

    const matches = (res.Items || []).map(unmarshall);

    const stats = new Map();
    const ensure = (id, name) => {
      if (!stats.has(id)) stats.set(id, { id, name, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, streak: 0, lastResult: null });
      return stats.get(id);
    };

    for (const m of matches) {
      if (!Array.isArray(m.players) || m.players.length !== 2) continue;
      const [a, b] = m.players;
      const sa = Number(a.points ?? 0), sb = Number(b.points ?? 0);

      const A = ensure(a.id, a.name);
      const B = ensure(b.id, b.name);

      A.pointsFor += sa; A.pointsAgainst += sb;
      B.pointsFor += sb; B.pointsAgainst += sa;

      if (sa === sb) continue;
      const aWon = sa > sb;

      if (aWon) { A.wins++; B.losses++; } else { B.wins++; A.losses++; }

      const applyResult = (entry, won) => {
        if (entry.lastResult === null) entry.streak = won ? 1 : -1;
        else if ((entry.streak > 0 && won) || (entry.streak < 0 && !won)) entry.streak += won ? 1 : -1;
        else entry.streak = won ? 1 : -1;
        entry.lastResult = won;
      };
      applyResult(A, aWon);
      applyResult(B, !aWon);
    }

    const rows = [...stats.values()].map(r => {
      const games = r.wins + r.losses;
      const winPct = games ? r.wins / games : 0;
      return {
        playerId: r.id,
        name: r.name,
        wins: r.wins,
        losses: r.losses,
        winPct: Number(winPct.toFixed(3)),
        pointsFor: r.pointsFor,
        pointsAgainst: r.pointsAgainst,
        pointDiff: r.pointsFor - r.pointsAgainst,
        streak: r.streak,
        games,
      };
    });

    rows.sort((x, y) =>
      y.winPct - x.winPct ||
      y.wins   - x.wins   ||
      y.pointDiff - x.pointDiff ||
      x.name.localeCompare(y.name)
    );

    return json(200, { leagueId, standings: rows, totalMatches: matches.length });
  } catch (err) {
    console.error("standings_get error:", err);
    return json(500, { error: "internal_error" });
  }
};