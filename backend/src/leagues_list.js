module.exports.handler = async () => {
  return { statusCode: 200, body: JSON.stringify([{ id: "league-1", name: "Summer 2025" }]) };
};
