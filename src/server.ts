// Re-export the Durable Object so wrangler can find it
export { SpectatorHub } from "./spectator-hub";

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function nanoid(length = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ─── WebSocket: /ws/spectator ────────────────────────────
    if (path === "/ws/spectator") {
      const id = env.SPECTATOR_HUB.idFromName("global");
      const hub = env.SPECTATOR_HUB.get(id);
      // Forward with ?type= param
      const wsUrl = new URL(request.url);
      wsUrl.searchParams.set("type", wsUrl.searchParams.get("type") || "spectator");
      return hub.fetch(new Request(wsUrl.toString(), request));
    }

    // ─── POST /api/login ─────────────────────────────────────
    if (path === "/api/login" && request.method === "POST") {
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
    }

    // ─── POST /api/score ─────────────────────────────────────
    if (path === "/api/score" && request.method === "POST") {
      let body: { user_id?: string; score?: number };
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON");
      }

      const { user_id, score } = body;
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

      await env.DB.prepare(
        "INSERT INTO scores (user_id, score) VALUES (?, ?)"
      )
        .bind(user_id, roundedScore)
        .run();

      const rankResult = await env.DB.prepare(
        "SELECT COUNT(*) as rank FROM scores WHERE score > ?"
      )
        .bind(roundedScore)
        .first<{ rank: number }>();

      return jsonResponse({
        score: roundedScore,
        rank: (rankResult?.rank || 0) + 1,
      });
    }

    // ─── GET /api/leaderboard ────────────────────────────────
    if (path === "/api/leaderboard" && request.method === "GET") {
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "10", 10),
        50
      );

      const results = await env.DB.prepare(
        `SELECT s.score, s.created_at, u.name
         FROM scores s
         JOIN users u ON u.id = s.user_id
         ORDER BY s.score DESC
         LIMIT ?`
      )
        .bind(limit)
        .all<{ score: number; created_at: string; name: string }>();

      return jsonResponse({
        entries: results.results || [],
      });
    }

    // ─── POST /api/commentary ────────────────────────────────
    if (path === "/api/commentary" && request.method === "POST") {
      let body: { event: string; context?: Record<string, unknown> };
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON");
      }

      const { event, context: ctx } = body;
      if (!event || typeof event !== "string") {
        return errorResponse("event is required");
      }

      const systemPrompt = `You are a race commentator. Reply with ONLY a short phrase — maximum 8 words. No hashtags, no emojis, no quotes. Be punchy and dramatic.`;

      let userPrompt = "";

      switch (event) {
        case "race_start":
          userPrompt = `${ctx?.name || "A racer"} just started a new race. Give an exciting opening line.`;
          break;
        case "speed_milestone":
          userPrompt = `The racer just hit ${ctx?.speed || "high"} km/h! React to the speed.`;
          break;
        case "distance_milestone":
          userPrompt = `The racer just passed ${ctx?.distance || 0} distance! Comment on how far they've gone.`;
          break;
        case "near_miss":
          userPrompt = `The racer just barely dodged an obstacle at ${ctx?.speed || "high"} km/h! React to the close call.`;
          break;
        case "crash":
          userPrompt = `The racer crashed with a final score of ${ctx?.score || 0}${ctx?.rank ? `, ranking #${ctx.rank}` : ""}. ${ctx?.name || "They"} is out. Deliver the final call.`;
          break;
        case "top10":
          userPrompt = `${ctx?.name || "The racer"} just placed #${ctx?.rank || "?"} on the leaderboard with a score of ${ctx?.score || 0}! Celebrate the achievement.`;
          break;
        default:
          userPrompt = `Something happened in the race. Give a generic exciting comment.`;
      }

      try {
        const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 20,
          temperature: 0.9,
        });

        const text = (result as { response?: string }).response || "";
        return jsonResponse({ commentary: text.trim() });
      } catch (err) {
        console.error("AI commentary error:", err);
        return jsonResponse({ commentary: "" });
      }
    }

    // 404 for unknown API/WS routes
    if (path.startsWith("/api/") || path.startsWith("/ws/")) {
      return errorResponse("Not found", 404);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
