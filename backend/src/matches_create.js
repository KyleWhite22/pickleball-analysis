module.exports.handler = async (event) => {
  try {
    const leagueId = event?.pathParameters?.id || "league-1";
    let body = {};
    try { body = JSON.parse(event?.body || "{}"); } catch {}
    const out = { id: "match-" + Date.now(), leagueId, ...body, createdAt: new Date().toISOString() };
    return { statusCode: 201, body: JSON.stringify(out) };
  } catch (err) {
    console.error("createMatch error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "InternalError" }) };
  }
};
