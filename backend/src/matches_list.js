module.exports.handler = async (event) => {
  const leagueId = event?.pathParameters?.id || "league-1";
  return { statusCode: 200, body: JSON.stringify([{ id: "m1", leagueId, date: "2025-08-18", scores: [{ a: 11, b: 7 }], players: [] }]) };
};
