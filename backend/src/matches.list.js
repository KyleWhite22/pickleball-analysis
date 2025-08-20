export const handler = async (event) => {
  const leagueId = event.pathParameters?.id || "league-1";
  // Fake 3 recent matches
  const matches = [
    { id: "m1", leagueId, date: "2025-08-15", scores: [{ a: 11, b: 8 }], players: [
      { name: "Kyle", team: "A" }, { name: "Max", team: "A" }, { name: "Sam", team: "B" }, { name: "Leo", team: "B" }
    ]},
    { id: "m2", leagueId, date: "2025-08-16", scores: [{ a: 9, b: 11 }], players: [
      { name: "Kyle", team: "A" }, { name: "Max", team: "A" }, { name: "Sam", team: "B" }, { name: "Leo", team: "B" }
    ]},
    { id: "m3", leagueId, date: "2025-08-18", scores: [{ a: 11, b: 7 }], players: [
      { name: "Kyle", team: "A" }, { name: "Max", team: "A" }, { name: "Sam", team: "B" }, { name: "Leo", team: "B" }
    ]}
  ];
  return { statusCode: 200, body: JSON.stringify(matches) };
};