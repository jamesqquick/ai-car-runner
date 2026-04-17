import { requestCommentaryFromAPI } from "../api";

export class CommentaryService {
  enabled = false;
  ttsEnabled = false;
  inFlight = false;

  private lastSpeedMilestone = 0;
  private lastDistanceMilestone = 0;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.ttsEnabled = enabled;
  }

  async request(
    event: string,
    context?: Record<string, unknown>
  ): Promise<string | null> {
    if (!this.enabled || this.inFlight) return null;

    this.inFlight = true;
    try {
      const text = await requestCommentaryFromAPI(event, context ?? {});
      if (text && this.ttsEnabled) {
        this.speak(text);
      }
      return text;
    } finally {
      this.inFlight = false;
    }
  }

  private speak(text: string): void {
    if (!("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;

    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.name.includes("Daniel")
    );
    if (preferred) {
      utterance.voice = preferred;
    }

    speechSynthesis.speak(utterance);
  }

  checkMilestones(speed: number, distance: number): void {
    if (!this.enabled) return;

    // Speed milestones every 50 km/h starting at 100
    const speedBucket = Math.floor(speed / 50) * 50;
    if (speedBucket >= 100 && speedBucket > this.lastSpeedMilestone) {
      this.lastSpeedMilestone = speedBucket;
      this.request("speed_milestone", {
        speed: speedBucket,
      });
    }

    // Distance milestones every 500
    const distBucket = Math.floor(distance / 500) * 500;
    if (distBucket > 0 && distBucket > this.lastDistanceMilestone) {
      this.lastDistanceMilestone = distBucket;
      this.request("distance_milestone", {
        distance: distBucket,
      });
    }
  }

  static preloadVoices(): void {
    if ("speechSynthesis" in window) {
      speechSynthesis.getVoices();
    }
  }
}
