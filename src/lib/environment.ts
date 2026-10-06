export type AppEnvironment = "development" | "staging" | "production";

export function getAppEnvironment(): AppEnvironment {
  const configured = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV;
  if (configured === "development" || configured === "staging" || configured === "production") {
    return configured;
  }

  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "staging";
  return "development";
}

export function isProductionEnvironment() {
  return getAppEnvironment() === "production";
}

export function isStagingEnvironment() {
  return getAppEnvironment() === "staging";
}

export function isIndexingAllowed() {
  if (!isProductionEnvironment()) return false;

  try {
    const hostname = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").hostname;
    return hostname === "amaree.cz" || hostname === "www.amaree.cz";
  } catch {
    return false;
  }
}

export function getEnvironmentSafetyReport() {
  const environment = getAppEnvironment();
  const expectedSupabaseEnvironment = environment === "production" ? "production" : "development";
  const configuredSupabaseEnvironment = process.env.SUPABASE_ENVIRONMENT;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const problems: string[] = [];

  if (!siteUrl) problems.push("NEXT_PUBLIC_SITE_URL is missing");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) problems.push("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) problems.push("SUPABASE_SERVICE_ROLE_KEY is missing");
  if (configuredSupabaseEnvironment !== expectedSupabaseEnvironment) {
    problems.push(`SUPABASE_ENVIRONMENT must be ${expectedSupabaseEnvironment}`);
  }
  const stagingHostnameAllowed = (() => {
    try {
      const hostname = new URL(siteUrl).hostname;
      return siteUrl === "https://test.amaree.cz" ||
        (process.env.DEPLOY_TARGET === "cloudflare" && hostname.endsWith(".workers.dev"));
    } catch {
      return false;
    }
  })();
  if (environment === "staging" && !stagingHostnameAllowed) {
    problems.push("Staging NEXT_PUBLIC_SITE_URL must use test.amaree.cz or the assigned Cloudflare workers.dev hostname");
  }
  if (environment === "production" && siteUrl !== "https://amaree.cz" && siteUrl !== "https://www.amaree.cz") {
    problems.push("Production NEXT_PUBLIC_SITE_URL must use the AMARÉE production domain");
  }
  if (environment !== "production" && process.env.GOPAY_ENVIRONMENT === "production") {
    problems.push("Production GoPay is forbidden outside production");
  }
  if (environment !== "production" && process.env.PACKETA_ENVIRONMENT === "production") {
    problems.push("Production Packeta is forbidden outside production");
  }
  if (environment !== "production" && process.env.PACKETA_API_ENABLED === "true" && process.env.PACKETA_ENVIRONMENT !== "test") {
    problems.push("Enabled Packeta API must use a test sender outside production");
  }
  if (environment !== "production" && process.env.GOPAY_CHECKOUT_ENABLED === "true" && process.env.GOPAY_ENVIRONMENT !== "sandbox") {
    problems.push("Enabled GoPay checkout must use sandbox outside production");
  }
  if (environment !== "production" && process.env.TRANSACTIONAL_EMAIL_SEND_ENABLED === "true" && !process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT) {
    problems.push("Enabled staging e-mail requires TRANSACTIONAL_EMAIL_TEST_RECIPIENT");
  }
  if (process.env.TRANSACTIONAL_EMAIL_SEND_ENABLED === "true" && process.env.TRANSACTIONAL_EMAIL_PROVIDER !== "resend") {
    problems.push("Transactional sending is currently approved only for the Resend provider");
  }
  if (process.env.AI_PRODUCT_ASSISTANT_ENABLED === "true" && !process.env.OPENAI_API_KEY) {
    problems.push("Enabled AI product assistant requires the server-only OPENAI_API_KEY secret");
  }

  return { environment, ok: problems.length === 0, problems };
}
