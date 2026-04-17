import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { jsonResponse, errorResponse, nanoid } from "../../../lib/server-utils";

export const POST: APIRoute = async ({ request }) => {

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
- specialMechanic should be "none" UNLESS the user explicitly asks for lives, a countdown/timer, or moving obstacles
- Be creative with obstacle names to match the theme (e.g. "asteroid" for space, "fish" for underwater)
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
};
