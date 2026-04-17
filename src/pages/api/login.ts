import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { jsonResponse, errorResponse, nanoid } from "../../lib/server-utils";

export const POST: APIRoute = async ({ request }) => {

  let body: { name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON");
  }

  const { name, email } = body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return errorResponse("Name is required");
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return errorResponse("Valid email is required");
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const userId = nanoid(10);

  await env.DB.prepare(
    `INSERT INTO users (id, name, email) VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET name = excluded.name`
  )
    .bind(userId, trimmedName, trimmedEmail)
    .run();

  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(trimmedEmail)
    .first<{ id: string; name: string; email: string }>();

  if (!user) {
    return errorResponse("Failed to create user", 500);
  }

  return jsonResponse({ id: user.id, name: user.name, email: user.email });
};
