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

    // Fetch matches for league
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :p)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":p":  { S: "MATCH#" },
      },
      // newest first helps us compute streak in order
      ScanIndexForward: false,
      Limit: 500, // plenty for MVP; paginate later if needed
    }));

    const matches = (res.Items || []).map(unmarshall);

    // Aggregate per playerId
    const stats = new Map(); // id -> { id, name, wins, losses, pointsFor, pointsAgainst, streak }
    const ensure = (id, name) => {
      if (!stats.has(id)) stats.set(id, { id, name, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, streak: 0, lastResult: null });
      return stats.get(id);
    };

    for (const m of matches) {
      if (!Array.isArray(m.players) || m.players.length !== 2) continue;
      const [a, b] = m.players; // {id,name,points}
      const sa = Number(a.points ?? 0), sb = Number(b.points ?? 0);

      const A = ensure(a.id, a.name);
      const B = ensure(b.id, b.name);

      A.pointsFor += sa; A.pointsAgainst += sb;
      B.pointsFor += sb; B.pointsAgainst += sa;

      if (sa === sb) continue; // ignore ties for now
      const aWon = sa > sb;

      if (aWon) { A.wins++; B.losses++; }
      else      { B.wins++; A.losses++; }

      // Update streaks (newest→oldest iteration)
      const applyResult = (entry, won) => {
        if (entry.lastResult === null) {
          entry.streak = won ? 1 : -1;
        } else if ((entry.streak > 0 && won) || (entry.streak < 0 && !won)) {
          entry.streak += won ? 1 : -1;
        } else {
          entry.streak = won ? 1 : -1;
        }
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
        streak: r.streak, // positive = W streak, negative = L streak
        games,
      };
    });

    // Sort: winPct desc, then wins desc, then pointDiff desc, then name
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