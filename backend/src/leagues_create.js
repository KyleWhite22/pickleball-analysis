module.exports.handler = async (event) => {
  try {
    let name = "Test League";
    try { name = (JSON.parse(event?.body || "{}").name || "Test League").trim(); } catch {}
    const out = { id: "test-" + Date.now(), name, owner: "demo", createdAt: new Date().toISOString() };
    return { statusCode: 201, body: JSON.stringify(out) };
  } catch (err) {
    console.error("createLeague error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "InternalError" }) };
  }
};
