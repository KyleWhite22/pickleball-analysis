// src/standings_get.js
const { DynamoDBClient, GetItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { getOptionalUserId } = require("./auth_optional");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

async function loadMeta(leagueId) {
  // Prefer META
  let r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
    ProjectionExpression: "ownerId, visibility",
    ConsistentRead: true, // strong read for meta too
  }));
  if (r.Item) return unmarshall(r.Item);

  // Legacy fallback (remove later)
  r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "METADATA" } },
    ProjectionExpression: "ownerId, visibility",
    ConsistentRead: true,
  }));
  return r.Item ? unmarshall(r.Item) : null;
}

function canView(meta, userId) {
  return meta.visibility === "public" || (userId && userId === meta.ownerId);
}

function computeStandings(matches) {
  // matches: array of { players:[{id,name,points}], winnerId }
  const p = new Map(); // id -> row
  const touch = (id, name) => {
    if (!p.has(id)) p.set(id, {
      playerId: id, name,
      wins: 0, losses: 0, winPct: 0,
      pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
      streak: 0, games: 0,
    });
    return p.get(id);
  };

  // Sort oldest→newest for streak calc
  const sorted = [...matches].sort((a,b) => (a.SK||"").localeCompare(b.SK||""));
  const lastResult = new Map(); // id -> +1/-1/0
  let lastWinner = new Map();   // id -> current streak sign

  for (const m of sorted) {
    if (!Array.isArray(m.players) || m.players.length !== 2) continue;
    const [A, B] = m.players;
    const a = touch(A.id, A.name);
    const b = touch(B.id, B.name);

    a.games++; b.games++;
    a.pointsFor += A.points; a.pointsAgainst += B.points;
    b.pointsFor += B.points; b.pointsAgainst += A.points;
    a.pointDiff = a.pointsFor - a.pointsAgainst;
    b.pointDiff = b.pointsFor - b.pointsAgainst;

    let aRes = 0, bRes = 0;
    if (m.winnerId && (m.winnerId === A.id || m.winnerId === B.id)) {
      if (m.winnerId === A.id) { a.wins++; b.losses++; aRes = +1; bRes = -1; }
      else { b.wins++; a.losses++; aRes = -1; bRes = +1; }
    }

    // streaks: if result flips sign, reset to that sign with 1; if same sign, ++; if tie (0), set to 0
    const applyStreak = (row, res) => {
      if (res === 0) { row.streak = 0; return; }
      const sign = Math.sign(row.streak);
      if (sign === res) row.streak += res;
      else row.streak = res; // start new streak
    };
    applyStreak(a, aRes);
    applyStreak(b, bRes);
  }

  for (const row of p.values()) {
    row.winPct = row.games ? row.wins / row.games : 0;
  }

  // Sort: wins desc, winPct desc, pointDiff desc, name asc
  return [...p.values()].sort((x, y) =>
    y.wins - x.wins ||
    y.winPct - x.winPct ||
    y.pointDiff - x.pointDiff ||
    x.name.localeCompare(y.name)
  );
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId_missing" });

    const userId = await getOptionalUserId(event); // may be null
    const meta = await loadMeta(leagueId);
    if (!meta) return json(404, { error: "not_found" });
    if (!canView(meta, userId)) return json(403, { error: "forbidden" });

    // Strongly consistent read of matches under the league
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":pref": { S: "MATCH#" },
      },
      ConsistentRead: true,  // <-- important
      ScanIndexForward: true // oldest→newest (helps streak calc)
    }));

    const items = (q.Items || []).map(unmarshall);
    const standings = computeStandings(items);

    return json(200, { leagueId, standings, totalMatches: items.length });
  } catch (err) {
    console.error("standings_get error:", err);
    return json(500, { error: "internal_error" });
  }
};
