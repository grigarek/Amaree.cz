import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The catalog is rendered from Supabase at request time, so the initial free
// deployment does not need R2/D1-backed ISR or on-demand cache invalidation.
export default defineCloudflareConfig({
  routePreloadingBehavior: "none"
});
