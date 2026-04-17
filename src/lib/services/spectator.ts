export class SpectatorService {
  private ws: WebSocket | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private retryCount = 0;
  private maxRetries = 5;

  connect(): void {
    if (this.ws) return;
    if (this.retryCount >= this.maxRetries) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws/spectator?type=game`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      // WebSocket construction failed (e.g. dev mode without DO support)
      return;
    }

    this.ws.addEventListener("open", () => {
      this.retryCount = 0;
    });

    this.ws.addEventListener("close", () => {
      this.ws = null;
      this.retryCount++;
      if (this.retryCount < this.maxRetries) {
        const delay = Math.min(3000 * Math.pow(2, this.retryCount - 1), 30000);
        this.reconnectTimeout = setTimeout(() => this.connect(), delay);
      }
    });

    this.ws.addEventListener("error", () => {
      this.ws?.close();
    });
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  startUpdates(
    getUserData: () => {
      userId: string;
      name: string;
      distance: number;
      speed: number;
    }
  ): void {
    this.stopUpdates();
    this.updateInterval = setInterval(() => {
      const data = getUserData();
      this.send({
        type: "race_update",
        ...data,
      });
    }, 500);
  }

  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  disconnect(): void {
    this.stopUpdates();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
