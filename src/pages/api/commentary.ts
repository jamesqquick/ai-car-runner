import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { jsonResponse, errorResponse } from "../../lib/server-utils";

export const POST: APIRoute = async ({ request }) => {

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
};
