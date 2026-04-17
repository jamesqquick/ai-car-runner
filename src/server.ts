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

    // ─── GET /remix/ — serve the remix creation page ────────
    if ((path === "/remix" || path === "/remix/") && request.method === "GET") {
      const assetUrl = new URL("/remix/index.html", request.url);
      return env.ASSETS.fetch(new Request(assetUrl.toString()));
    }

    // ─── GET /remix/:id — serve themed game ─────────────────
    const remixMatch = path.match(/^\/remix\/([a-zA-Z0-9]+)$/);
    if (remixMatch && request.method === "GET") {
      const remixId = remixMatch[1];

      const remix = await env.DB.prepare(
        "SELECT id, prompt, config FROM remixes WHERE id = ?"
      )
        .bind(remixId)
        .first<{ id: string; prompt: string; config: string }>();

      if (!remix) {
        return new Response("Remix not found", { status: 404 });
      }

      // Fetch the base HTML from assets
      const assetUrl = new URL("/", request.url);
      const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString()));
      let html = await assetResponse.text();

      // Parse the stored config and add id/prompt
      const config = JSON.parse(remix.config);
      config.id = remix.id;
      config.prompt = remix.prompt;

      // Inject the config before the game script
      const configScript = `<script>window.__REMIX_CONFIG__ = ${JSON.stringify(config)};</script>`;
      html = html.replace("</head>", `${configScript}\n</head>`);

      return new Response(html, {
        headers: {
          "Content-Type": "text/html;charset=utf-8",
        },
      });
    }

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
    }

    // ─── GET /api/leaderboard ────────────────────────────────
    if (path === "/api/leaderboard" && request.method === "GET") {
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

    // ─── POST /api/remix ───────────────────────────────────────
    if (path === "/api/remix" && request.method === "POST") {
      let body: { prompt?: string; user_id?: string };
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON");
      }

      const { prompt, user_id } = body;
      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return errorResponse("Prompt is required");
      }
      if (!user_id || typeof user_id !== "string") {
        return errorResponse("user_id is required");
      }
      if (prompt.length > 100) {
        return errorResponse("Prompt must be 100 characters or less");
      }

      const remixSystemPrompt = `You generate JSON configs for a car racing game remix. The user describes a theme and you return ONLY valid JSON matching this exact schema — no markdown, no explanation, just the JSON object:

{
  "title": "short name, 2-3 words",
  "carColor": "#hex",
  "roadColor": "#hex",
  "skyColor": "#hex",
  "fogColor": "#hex (usually same as skyColor)",
  "curbColor": "#hex",
  "buildingHue": 0.0-1.0,
  "lightingColor": "#hex",
  "speedLineColor": "#hex",
  "obstacleColors": ["#hex", "#hex", "#hex"],
  "obstacleNames": { "car": "name", "barrier": "name", "cone": "name" },
  "initialSpeed": 15-25,
  "maxSpeed": 40-70,
  "speedIncrement": 0.5-1.5,
  "laneCount": 3-5,
  "minObstacleGap": 6-12,
  "multiLaneChance": 0.2-0.5,
  "triLaneRampMax": 0.1-0.3,
  "specialMechanic": "none" | "moving_obstacles" | "lives" | "countdown",
  "lives": 3 (only if specialMechanic is "lives"),
  "countdownSeconds": 30-90 (only if specialMechanic is "countdown"),
  "obstacleMovementSpeed": 1-4 (only if specialMechanic is "moving_obstacles")
}

Rules:
- All colors must be valid hex strings starting with #
- Choose colors that match the user's theme
- Pick a specialMechanic that fits the theme (or "none")
- Be creative with obstacle names to match the theme
- Return ONLY the JSON object, nothing else`;

      try {
        const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: remixSystemPrompt },
            { role: "user", content: prompt.trim() },
          ],
          max_tokens: 500,
          temperature: 0.7,
        });

        const responseText = ((result as { response?: string }).response || "").trim();

        // Extract JSON from response (handle potential markdown wrapping)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        let config: Record<string, unknown>;
        try {
          config = JSON.parse(jsonStr);
        } catch {
          return errorResponse("Failed to generate valid remix config", 500);
        }

        // Generate a short ID
        const remixId = nanoid(8);

        // Store in D1
        await env.DB.prepare(
          "INSERT INTO remixes (id, user_id, prompt, config) VALUES (?, ?, ?, ?)"
        )
          .bind(remixId, user_id, prompt.trim(), JSON.stringify(config))
          .run();

        return jsonResponse({
          id: remixId,
          config,
        });
      } catch (err) {
        console.error("Remix generation error:", err);
        return errorResponse("Failed to generate remix", 500);
      }
    }

    // ─── GET /api/remixes — list all remixes ────────────────
    if ((path === "/api/remixes" || path === "/api/remixes/") && request.method === "GET") {
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

      const remixes = (results.results || []).map((r) => ({
        id: r.id,
        prompt: r.prompt,
        config: JSON.parse(r.config),
        created_at: r.created_at,
        creator_name: r.creator_name,
      }));

      return jsonResponse({ remixes });
    }

    // ─── GET /api/remix/:id ──────────────────────────────────
    if (path.startsWith("/api/remix/") && request.method === "GET") {
      const remixId = path.replace("/api/remix/", "");
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
    }

    // 404 for unknown API/WS routes
    if (path.startsWith("/api/") || path.startsWith("/ws/")) {
      return errorResponse("Not found", 404);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
