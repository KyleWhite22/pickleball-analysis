import crypto from "node:crypto";

export const handler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const name = (body.name || "").trim();
  if (name.length < 2 || name.length > 40) {
    return { statusCode: 400, body: JSON.stringify({ error: "InvalidLeagueName" }) };
  }
  const league = {
    id: crypto.randomUUID(),
    name,
    owner: "demo",
    createdAt: new Date().toISOString()
  };
  // NOTE: We are NOT saving anywhere (mock). Just echo back.
  return { statusCode: 201, body: JSON.stringify(league) };
};