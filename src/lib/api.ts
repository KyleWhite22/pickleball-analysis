import { fetchAuthSession } from "aws-amplify/auth";

export async function getAccessToken(): Promise<string | null> {
  const s = await fetchAuthSession();
  return s.tokens?.accessToken?.toString() ?? null;
}

export async function api(
  path: string,
  init: RequestInit = {},
  baseUrl = import.meta.env.VITE_API_URL // e.g. "https://abc123.execute-api.us-east-2.amazonaws.com/prod"
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "omit", // we use JWT, not cookies
  });
}