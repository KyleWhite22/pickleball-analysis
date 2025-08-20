export const handler = async () => {
  const leagues = [
    { id: "league-1", name: "Summer 2025", owner: "demo", createdAt: "2025-06-01T00:00:00Z" },
    { id: "league-2", name: "Fall 2025",   owner: "demo", createdAt: "2025-09-01T00:00:00Z" }
  ];
  return { statusCode: 200, body: JSON.stringify(leagues) };
};