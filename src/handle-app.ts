/**
 * Serves remix game configs via Worker Loaders (Dynamic Workers).
 *
 * Each remix gets its own isolated worker instance keyed by remix ID.
 * The dynamic worker returns the remix config as JSON — fully sandboxed
 * with no outbound network access.
 */
export async function handleApp(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const remixId = url.pathname.split("/app/")[1];

  if (!remixId) {
    return new Response("Remix not found", { status: 404 });
  }

  // Fetch the remix config from D1
  const remix = await env.DB.prepare(
    "SELECT id, prompt, config FROM remixes WHERE id = ?"
  )
    .bind(remixId)
    .first<{ id: string; prompt: string; config: string }>();

  if (!remix) {
    return new Response("Remix not found", { status: 404 });
  }

  // Parse and enrich the config
  const config = JSON.parse(remix.config);
  config.id = remix.id;
  config.prompt = remix.prompt;
  const configJson = JSON.stringify(config);

  // Load (or reuse warm) a dynamic worker keyed by remix ID
  const worker = env.LOADER.get(remixId, async () => ({
    compatibilityDate: "2025-04-01",
    mainModule: "index.js",
    modules: {
      "index.js": `
        export default {
          fetch() {
            return new Response(${JSON.stringify(configJson)}, {
              headers: {
                "content-type": "application/json; charset=utf-8",
                "access-control-allow-origin": "*",
                "cache-control": "public, max-age=60"
              }
            });
          }
        };
      `,
    },
    globalOutbound: null, // fully sandboxed — no outbound network access
  }));

  return worker.getEntrypoint().fetch(request);
}
