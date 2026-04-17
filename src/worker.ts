import { handle } from "@astrojs/cloudflare/handler";

// Re-export the Durable Object class so workerd can find it
export { SpectatorHub } from "./spectator-hub";

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    return handle(request, env, ctx);
  },
} satisfies ExportedHandler;
