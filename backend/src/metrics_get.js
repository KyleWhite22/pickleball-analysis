// src/metrics_get.js  (drop-in replacement)
const {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { getOptionalUserId } = require("./auth_optional");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    Vary: "Authorization",
  },
  body: JSON.stringify(body),
});

function canView(meta, userId) {
  return meta?.visibility === "public" || (userId && userId === meta?.ownerId);
}

const asInt = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

// compute current streak from a list of 'W'|'L'|'T' results in chronological order
function currentStreak(results) {
  if (!results || results.length === 0) return 0;
  const last = results[results.length - 1];
  if (last === "T") return 0;
  let k = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] !== last) break;
    k++;
  }
  return last === "W" ? k : -k;
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });
    if (!TABLE) return json(500, { error: "internal_error", message: "TABLE_NAME missing" });

    // AuthZ
    const metaRes = await ddb.send(
      new GetItemCommand({
        TableName: TABLE,
        Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
        ProjectionExpression: "ownerId, visibility",
      })
    );
    if (!metaRes.Item) return json(404, { error: "not_found" });
    const meta = unmarshall(metaRes.Item);
    const userId = await getOptionalUserId(event);
    if (!canView(meta, userId)) return json(403, { error: "forbidden" });

    // Pull all MATCH# items
    const matches = [];
    let ExclusiveStartKey;
    do {
      const r = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
          ExpressionAttributeValues: {
            ":pk": { S: `LEAGUE#${leagueId}` },
            ":pref": { S: "MATCH#" },
          },
          ExclusiveStartKey,
          ScanIndexForward: true, // chronological
        })
      );
      for (const it of r.Items || []) matches.push(unmarshall(it));
      ExclusiveStartKey = r.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    // Aggregate per-player (supports doubles + legacy singles)
    // Map playerId -> { name, wins, losses, PF, PA, results[] }
    const acc = new Map();

    function rec(pid, name, pf, pa, outcome) {
      if (!pid) return;
      let row = acc.get(pid);
      if (!row) {
        row = {
          playerId: pid,
          name: name || "",
          wins: 0,
          losses: 0,
          PF: 0,
          PA: 0,
          results: [],
        };
        acc.set(pid, row);
      }
      if (name && row.name !== name) row.name = name;
      row.PF += asInt(pf);
      row.PA += asInt(pa);
      if (outcome === "W") row.wins++;
      else if (outcome === "L") row.losses++;
      row.results.push(outcome);
    }

    for (const m of matches) {
      // New doubles
      if (Array.isArray(m.participants) && m.participants.length === 4 && m.score) {
        const s1 = asInt(m.score.team1);
        const s2 = asInt(m.score.team2);
        const winnerTeam = s1 === s2 ? null : s1 > s2 ? 0 : 1;
        for (const p of m.participants) {
          const pid = p.id || p.playerId;
          const name = p.name || "";
          const team = p.team;
          const pf = team === 0 ? s1 : s2;
          const pa = team === 0 ? s2 : s1;
          const outcome = winnerTeam === null ? "T" : team === winnerTeam ? "W" : "L";
          rec(pid, name, pf, pa, outcome);
        }
        continue;
      }

      // Legacy singles
      if (Array.isArray(m.players) && m.players.length === 2) {
        const a = m.players[0];
        const b = m.players[1];
        const s1 = asInt(a.points);
        const s2 = asInt(b.points);
        if (s1 === s2) {
          rec(a.id || a.playerId, a.name, s1, s2, "T");
          rec(b.id || b.playerId, b.name, s2, s1, "T");
        } else if (s1 > s2) {
          rec(a.id || a.playerId, a.name, s1, s2, "W");
          rec(b.id || b.playerId, b.name, s2, s1, "L");
        } else {
          rec(a.id || a.playerId, a.name, s1, s2, "L");
          rec(b.id || b.playerId, b.name, s2, s1, "W");
        }
        continue;
      }
      // else ignore unknown shapes safely
    }

    // Build rows with winPct & streak
    const rows = Array.from(acc.values()).map((r) => {
      const games = r.wins + r.losses;
      const winPct = games > 0 ? r.wins / games : 0;
      return {
        playerId: r.playerId,
        name: r.name,
        wins: r.wins,
        losses: r.losses,
        winPct: Number(winPct.toFixed(4)),
        pointsFor: r.PF,
        pointsAgainst: r.PA,
        streak: currentStreak(r.results),
      };
    });

    // Sort helpers
    const byWinQuality = (a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.wins !== a.wins) return b.wins - a.wins;
      const difA = a.pointsFor - a.pointsAgainst;
      const difB = b.pointsFor - b.pointsAgainst;
      if (difB !== difA) return difB - difA;
      return a.name.localeCompare(b.name);
    };

    // Summary
    const matchCount = matches.length;
    const playerCount = rows.length;

    // Leaders
    const streakLeaders = [...rows]
      .sort((a, b) => Math.abs(b.streak) - Math.abs(a.streak))
      .slice(0, 5);

    const MIN_GAMES = 3; // adjust if you want
    const winPctLeaders = rows
      .filter((r) => r.wins + r.losses >= MIN_GAMES)
      .sort(byWinQuality)
      .slice(0, 5);

    // Return bundle your tiles can use
    return json(200, {
      leagueId,
      summary: { matchCount, playerCount },
      leaders: {
        streak: streakLeaders,
        winPct: winPctLeaders,
      },
      // You can add more here later (recent matches, elo, pair synergy, etc.)
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("metrics_get error", err);
    return json(500, { error: "internal_error", message: err?.message || null });
  }
};
