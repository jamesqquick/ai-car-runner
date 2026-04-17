import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { jsonResponse } from "../../lib/server-utils";

export const GET: APIRoute = async ({ url }) => {

  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "50", 10),
    100
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") || "0", 10),
    0
  );

  const results = await env.DB.prepare(
    `SELECT r.id, r.prompt, r.config, r.created_at, u.name as creator_name
     FROM remixes r
     JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(limit, offset)
    .all<{ id: string; prompt: string; config: string; created_at: string; creator_name: string }>();

  const remixes = (results.results || []).map((r: { id: string; prompt: string; config: string; created_at: string; creator_name: string }) => ({
    id: r.id,
    prompt: r.prompt,
    config: JSON.parse(r.config),
    created_at: r.created_at,
    creator_name: r.creator_name,
  }));

  return jsonResponse({ remixes });
};
