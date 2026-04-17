/// <reference path="../.astro/types.d.ts" />

interface WorkerStub {
  getEntrypoint<T extends Rpc.WorkerEntrypointBranded | undefined>(
    name?: string,
  ): Fetcher<T>;
}

interface WorkerLoaderModule {
  js?: string;
  text?: string;
  data?: ArrayBuffer;
  json?: unknown;
  wasm?: ArrayBuffer;
}

interface WorkerLoaderWorkerCode {
  compatibilityDate: string;
  compatibilityFlags?: string[];
  mainModule: string;
  modules: Record<string, WorkerLoaderModule | string>;
  env?: unknown;
  globalOutbound?: Fetcher | null;
}

interface WorkerLoader {
  get(
    name: string | null,
    getCode: () => WorkerLoaderWorkerCode | Promise<WorkerLoaderWorkerCode>,
  ): WorkerStub;
  load(code: WorkerLoaderWorkerCode): WorkerStub;
}

interface Env {
  DB: D1Database;
  AI: Ai;
  SPECTATOR_HUB: DurableObjectNamespace;
  ASSETS: Fetcher;
  LOADER: WorkerLoader;
}
