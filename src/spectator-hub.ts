import { DurableObject } from "cloudflare:workers";

interface RacerState {
  userId: string;
  name: string;
  distance: number;
  speed: number;
  startedAt: number;
}

type ClientType = "game" | "spectator";

export class SpectatorHub extends DurableObject {
  activeRacers: Map<string, RacerState> = new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Restore state from hibernated WebSockets
    for (const ws of this.ctx.getWebSockets()) {
      const tags = this.ctx.getTags(ws);
      if (tags.includes("game")) {
        const attachment = ws.deserializeAttachment() as { clientType?: string; racer?: RacerState } | null;
        if (attachment?.racer) {
          this.activeRacers.set(attachment.racer.userId, attachment.racer);
        }
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get("Upgrade");

    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const clientType = (url.searchParams.get("type") || "spectator") as ClientType;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server, [clientType]);
    server.serializeAttachment({ clientType });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketOpen(ws: WebSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as { clientType?: string } | null;
    if (attachment?.clientType === "spectator") {
      // Send all active racers to newly connected spectator
      ws.send(JSON.stringify({
        type: "init",
        racers: Array.from(this.activeRacers.values()),
      }));
    }
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message !== "string") return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    const msgType = data.type as string;

    switch (msgType) {
      case "race_start": {
        const racer: RacerState = {
          userId: data.userId as string,
          name: data.name as string,
          distance: 0,
          speed: 0,
          startedAt: Date.now(),
        };
        this.activeRacers.set(racer.userId, racer);
        ws.serializeAttachment({ clientType: "game", racer });
        this.broadcastToSpectators({
          type: "race_start",
          racer,
        });
        break;
      }

      case "race_update": {
        const userId = data.userId as string;
        let racer = this.activeRacers.get(userId);
        if (!racer) {
          // Self-heal: recreate racer entry from update data
          racer = {
            userId,
            name: (data.name as string) || "Racer",
            distance: 0,
            speed: 0,
            startedAt: Date.now(),
          };
          this.activeRacers.set(userId, racer);
          // Notify spectators of the new racer
          this.broadcastToSpectators({ type: "race_start", racer });
        }
        racer.distance = data.distance as number;
        racer.speed = data.speed as number;
        ws.serializeAttachment({ clientType: "game", racer });
        this.broadcastToSpectators({
          type: "race_update",
          userId,
          distance: racer.distance,
          speed: racer.speed,
        });
        break;
      }

      case "race_end": {
        const endUserId = data.userId as string;
        const endRacer = this.activeRacers.get(endUserId);
        const finalData = {
          type: "race_end",
          userId: endUserId,
          name: (data.name as string) || endRacer?.name || "Unknown",
          score: data.score as number,
          rank: data.rank as number,
        };
        this.activeRacers.delete(endUserId);
        ws.serializeAttachment({ clientType: "game" });
        this.broadcastToSpectators(finalData);
        break;
      }

      case "leaderboard_update": {
        this.broadcastToSpectators({
          type: "leaderboard_update",
          entries: data.entries,
        });
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const tags = this.ctx.getTags(ws);
    ws.close(code, reason);

    // If a game client disconnected, remove their racer
    if (tags.includes("game")) {
      const attachment = ws.deserializeAttachment() as { clientType?: string; racer?: RacerState } | null;
      if (attachment?.racer) {
        this.activeRacers.delete(attachment.racer.userId);
        this.broadcastToSpectators({
          type: "race_end_disconnect",
          userId: attachment.racer.userId,
        });
      }
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("SpectatorHub WebSocket error:", error);
  }

  private broadcastToSpectators(data: Record<string, unknown>): void {
    const message = JSON.stringify(data);
    const spectators = this.ctx.getWebSockets("spectator");
    for (const client of spectators) {
      try {
        client.send(message);
      } catch {
        // Client likely disconnected
      }
    }
  }
}
