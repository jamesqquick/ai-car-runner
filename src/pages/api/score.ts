import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { jsonResponse, errorResponse } from "../../lib/server-utils";

export const POST: APIRoute = async ({ request }) => {

  let body: { user_id?: string; score?: number; remix_id?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON");
  }

  const { user_id, score, remix_id } = body;
  if (!user_id || typeof user_id !== "string") {
    return errorResponse("user_id is required");
  }
  if (score === undefined || typeof score !== "number" || score < 0) {
    return errorResponse("Valid score is required");
  }

  const user = await env.DB.prepare("SELECT id FROM users WHERE id = ?")
    .bind(user_id)
    .first();
  if (!user) {
    return errorResponse("User not found", 404);
  }

  const roundedScore = Math.floor(score);
  const remixIdValue = remix_id || null;

  await env.DB.prepare(
    "INSERT INTO scores (user_id, score, remix_id) VALUES (?, ?, ?)"
  )
    .bind(user_id, roundedScore, remixIdValue)
    .run();

  // Rank scoped to the same game (main or specific remix)
  const rankResult = remixIdValue
    ? await env.DB.prepare(
        "SELECT COUNT(*) as rank FROM scores WHERE remix_id = ? AND score > ?"
      )
        .bind(remixIdValue, roundedScore)
        .first<{ rank: number }>()
    : await env.DB.prepare(
        "SELECT COUNT(*) as rank FROM scores WHERE remix_id IS NULL AND score > ?"
      )
        .bind(roundedScore)
        .first<{ rank: number }>();

  return jsonResponse({
    score: roundedScore,
    rank: (rankResult?.rank || 0) + 1,
  });
};
