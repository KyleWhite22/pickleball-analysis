const {
  DynamoDBClient,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME || process.env.TABLE;

const json = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!TABLE) return json(500, { error: "internal_error", message: "TABLE_NAME missing" });
    if (!leagueId) return json(400, { error: "leagueId_missing" });

    // ---- 1) Fetch all match items for this league
    const matches = [];
    let ExclusiveStartKey = undefined;
    do {
      const r = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
        ExpressionAttributeValues: {
          ":pk": { S: `LEAGUE#${leagueId}` },
          ":pref": { S: "MATCH#" },
        },
        ExclusiveStartKey,
        ScanIndexForward: true, // ascending by time (because SK is MATCH#<ts>#<uuid>)
      }));
      for (const it of (r.Items || [])) matches.push(unmarshall(it));
      ExclusiveStartKey = r.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    // ---- 2) Aggregate per player
    // Map<playerId, { name, wins, losses, pointsFor, pointsAgainst, results: ('W'|'L'|'T')[] }>
    const acc = new Map();

    const asInt = (x) => {
      const n = Number(x);
      return Number.isFinite(n) ? Math.trunc(n) : 0;
    };

    // Helper to record a single player's game result
    function record(pid, name, pf, pa, outcome /* 'W'|'L'|'T' */) {
      if (!pid) return; // defensive
      let row = acc.get(pid);
      if (!row) {
        row = {
          playerId: pid,
          name: name || "",
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          results: [], // chronological
        };
        acc.set(pid, row);
      }
      if (name && row.name !== name) row.name = name; // keep latest name spelling
      row.pointsFor += asInt(pf);
      row.pointsAgainst += asInt(pa);
      if (outcome === "W") row.wins += 1;
      else if (outcome === "L") row.losses += 1;
      row.results.push(outcome);
    }

    // Process each match in chronological order
    for (const m of matches) {
      // Preferred (new doubles): participants[4] + score{team1,team2}
      if (Array.isArray(m.participants) && m.participants.length === 4 && m.score) {
        const s1 = asInt(m.score.team1);
        const s2 = asInt(m.score.team2);
        const winnerTeam = s1 === s2 ? null : (s1 > s2 ? 0 : 1);

        for (const p of m.participants) {
          const pid = p.id || p.playerId; // be flexible
          const name = p.name || "";
          const team = p.team; // 0 or 1
          const pf = team === 0 ? s1 : s2;
          const pa = team === 0 ? s2 : s1;

          let outcome = "T";
          if (winnerTeam !== null) outcome = (team === winnerTeam) ? "W" : "L";
          record(pid, name, pf, pa, outcome);
        }
        continue;
      }

      // Legacy singles: players[2] [{id,name,points},{id,name,points}]
      if (Array.isArray(m.players) && m.players.length === 2) {
        const a = m.players[0];
        const b = m.players[1];
        const s1 = asInt(a.points);
        const s2 = asInt(b.points);

        if (s1 === s2) {
          record(a.id || a.playerId, a.name, s1, s2, "T");
          record(b.id || b.playerId, b.name, s2, s1, "T");
        } else if (s1 > s2) {
          record(a.id || a.playerId, a.name, s1, s2, "W");
          record(b.id || b.playerId, b.name, s2, s1, "L");
        } else {
          record(a.id || a.playerId, a.name, s1, s2, "L");
          record(b.id || b.playerId, b.name, s2, s1, "W");
        }
        continue;
      }

      // Unknown shape: ignore safely
      // console.warn("Unknown match shape", m);
    }

    // ---- 3) Compute winPct + current streak
    function currentStreak(results) {
      if (!results || results.length === 0) return 0;
      // Walk from end until the result flips or tie encountered
      let i = results.length - 1;
      const last = results[i];
      if (last === "T") return 0;
      let count = 0;
      for (; i >= 0; i--) {
        if (results[i] !== last) break;
        count++;
      }
      return last === "W" ? count : -count;
    }

    const rows = Array.from(acc.values()).map((r) => {
      const games = r.wins + r.losses; // ties excluded from W/L
      const winPct = games > 0 ? r.wins / games : 0;
      return {
        playerId: r.playerId,
        name: r.name,
        wins: r.wins,
        losses: r.losses,
        winPct: Number(winPct.toFixed(4)), // keep precision for sorting; UI can toFixed(1)
        pointsFor: r.pointsFor,
        pointsAgainst: r.pointsAgainst,
        streak: currentStreak(r.results),
      };
    });

    // ---- 4) Sort (win% desc, wins desc, point diff desc, name asc)
    rows.sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.wins !== a.wins) return b.wins - a.wins;
      const diffA = a.pointsFor - a.pointsAgainst;
      const diffB = b.pointsFor - b.pointsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return a.name.localeCompare(b.name);
    });

    return json(200, rows);
  } catch (err) {
    console.error("standings_get error:", err);
    return json(500, { error: "internal_error", message: err?.message || null });
  }
};