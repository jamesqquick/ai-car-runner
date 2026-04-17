import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { jsonResponse } from "../../lib/server-utils";

export const GET: APIRoute = async ({ url }) => {
  try {
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "10", 10),
      50
    );
    const remixId = url.searchParams.get("remix_id");

    const results = remixId
      ? await env.DB.prepare(
          `SELECT s.score, s.created_at, u.name
           FROM scores s
           JOIN users u ON u.id = s.user_id
           WHERE s.remix_id = ?
           ORDER BY s.score DESC
           LIMIT ?`
        )
          .bind(remixId, limit)
          .all<{ score: number; created_at: string; name: string }>()
      : await env.DB.prepare(
          `SELECT s.score, s.created_at, u.name
           FROM scores s
           JOIN users u ON u.id = s.user_id
           WHERE s.remix_id IS NULL
           ORDER BY s.score DESC
           LIMIT ?`
        )
          .bind(limit)
          .all<{ score: number; created_at: string; name: string }>();

    return jsonResponse({
      entries: results.results || [],
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return jsonResponse({ entries: [] });
  }
};
