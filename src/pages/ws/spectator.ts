import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  const id = env.SPECTATOR_HUB.idFromName("global");
  const hub = env.SPECTATOR_HUB.get(id);

  // Forward the request to the Durable Object with the type param
  url.searchParams.set("type", url.searchParams.get("type") || "spectator");
  return hub.fetch(new Request(url.toString(), request));
};
