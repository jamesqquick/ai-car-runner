/// <reference path="../.astro/types.d.ts" />

interface Env {
  DB: D1Database;
  AI: Ai;
  SPECTATOR_HUB: DurableObjectNamespace;
  ASSETS: Fetcher;
}
