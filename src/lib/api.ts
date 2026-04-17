export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  created_at: string;
}

export async function login(name: string, email: string): Promise<User> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  const data = await res.json() as User & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }
  return { id: data.id, name: data.name, email: data.email };
}

export async function fetchLeaderboard(remixId?: string): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ limit: "10" });
  if (remixId) params.set("remix_id", remixId);
  const res = await fetch(`/api/leaderboard?${params}`);
  if (!res.ok) return [];
  const data = await res.json() as { entries: LeaderboardEntry[] };
  return data.entries;
}

export async function submitScore(
  userId: string,
  finalScore: number,
  remixId?: string
): Promise<number | null> {
  const payload: Record<string, unknown> = { user_id: userId, score: finalScore };
  if (remixId) payload.remix_id = remixId;
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const data = await res.json() as { score: number; rank: number };
  return data.rank;
}

export async function requestCommentaryFromAPI(
  event: string,
  context: Record<string, unknown> = {}
): Promise<string | null> {
  const res = await fetch("/api/commentary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, context }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { commentary: string };
  return data.commentary || null;
}
