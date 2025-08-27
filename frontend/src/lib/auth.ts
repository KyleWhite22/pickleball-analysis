import { fetchAuthSession } from "aws-amplify/auth";

export async function getIdToken() {
  const s = await fetchAuthSession();
  return s.tokens?.idToken?.toString() ?? null;
}

export async function getUserId() {
  const tok = await getIdToken();
  if (!tok) return null;
  const parts = tok.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || payload["cognito:username"] || null;
  } catch {
    return null;
  }
}