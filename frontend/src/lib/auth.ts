import { fetchAuthSession } from "aws-amplify/auth";

export async function getIdToken() {
  const s = await fetchAuthSession();
  return s.tokens?.idToken?.toString() ?? null;
}