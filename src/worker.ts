import { handle } from "@astrojs/cloudflare/handler";
import { handleApp } from "./handle-app";

// Re-export the Durable Object class so workerd can find it
export { SpectatorHub } from "./spectator-hub";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Route /app/* to dynamic worker loader
    if (url.pathname.startsWith("/app/")) {
      return handleApp(request, env);
    }

    return handle(request, env, ctx);
  },
} satisfies ExportedHandler;
