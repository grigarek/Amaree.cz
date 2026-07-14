export class WebhookIdempotencyStore {
  private seen = new Set<string>();

  process(eventId: string): "new" | "duplicate" {
    if (this.seen.has(eventId)) return "duplicate";
    this.seen.add(eventId);
    return "new";
  }
}
