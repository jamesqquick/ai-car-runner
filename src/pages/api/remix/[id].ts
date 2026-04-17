import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { jsonResponse, errorResponse } from "../../../lib/server-utils";

export const GET: APIRoute = async ({ params }) => {

  const remixId = params.id;
  if (!remixId) {
    return errorResponse("Remix ID is required");
  }

  const remix = await env.DB.prepare(
    "SELECT id, prompt, config, created_at FROM remixes WHERE id = ?"
  )
    .bind(remixId)
    .first<{ id: string; prompt: string; config: string; created_at: string }>();

  if (!remix) {
    return errorResponse("Remix not found", 404);
  }

  return jsonResponse({
    id: remix.id,
    prompt: remix.prompt,
    config: JSON.parse(remix.config),
    created_at: remix.created_at,
  });
};
