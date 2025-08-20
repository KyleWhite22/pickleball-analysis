module.exports.handler = async (event) => {
  const leagueId = event?.pathParameters?.id || "league-1";
  return { statusCode: 200, body: JSON.stringify({
    leagueId,
    updatedAt: new Date().toISOString(),
    players: [{ name: "Kyle", wins: 2, losses: 1, winPct: 0.667 }],
    teams: [{ team: "A", wins: 2, losses: 1, winPct: 0.667 }]
  }) };
};
