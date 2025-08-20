export const handler = async (event) => {
  const leagueId = event.pathParameters?.id || "league-1";
  const sample = [
    { scores: [{ a: 11, b: 8 }], players: [{name:"Kyle",team:"A"},{name:"Max",team:"A"},{name:"Sam",team:"B"},{name:"Leo",team:"B"}] },
    { scores: [{ a: 9,  b: 11}], players: [{name:"Kyle",team:"A"},{name:"Max",team:"A"},{name:"Sam",team:"B"},{name:"Leo",team:"B"}] },
    { scores: [{ a: 11, b: 7 }], players: [{name:"Kyle",team:"A"},{name:"Max",team:"A"},{name:"Sam",team:"B"},{name:"Leo",team:"B"}] }
  ];

  const players = new Map();
  for (const m of sample) {
    const a = m.scores[0].a, b = m.scores[0].b;
    const aWon = a > b;
    for (const p of m.players) {
      const rec = players.get(p.name) || { name: p.name, wins: 0, losses: 0 };
      if ((p.team === "A" && aWon) || (p.team === "B" && !aWon)) rec.wins++;
      else rec.losses++;
      players.set(p.name, rec);
    }
  }

  const playerArr = [...players.values()].map(p => ({
    ...p,
    winPct: +(p.wins / Math.max(1, p.wins + p.losses)).toFixed(3)
  }));

  const res = {
    leagueId,
    updatedAt: new Date().toISOString(),
    players: playerArr,
    teams: [
      { team: "A", wins: 2, losses: 1, winPct: 0.667 },
      { team: "B", wins: 1, losses: 2, winPct: 0.333 }
    ]
  };
  return { statusCode: 200, body: JSON.stringify(res) };
};