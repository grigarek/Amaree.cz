import "server-only";

type EcomailSubscribeInput = {
  email: string;
  locale: "cs" | "sk" | "en" | "de";
};

type FetchLike = typeof fetch;

export async function subscribeToEcomail(
  input: EcomailSubscribeInput,
  options: {
    apiKey?: string;
    listId?: string;
    fetcher?: FetchLike;
  } = {}
) {
  if (process.env.ECOMAIL_NEWSLETTER_ENABLED !== "true") throw new Error("ecomail_newsletter_disabled");

  const apiKey = options.apiKey ?? process.env.ECOMAIL_API_KEY;
  const listId = options.listId ?? process.env.ECOMAIL_LIST_ID;
  if (!apiKey || !listId) throw new Error("ecomail_newsletter_configuration_missing");

  const response = await (options.fetcher ?? fetch)(`https://api2.ecomailapp.cz/lists/${encodeURIComponent(listId)}/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      key: apiKey
    },
    body: JSON.stringify({
      subscriber_data: {
        email: input.email,
        source: "amaree.cz",
        tags: ["web-newsletter", input.locale]
      },
      trigger_autoresponders: true,
      trigger_notification: false,
      update_existing: true,
      skip_confirmation: false,
      resubscribe: false
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) throw new Error(`ecomail_subscribe_failed:${response.status}`);
  return { ok: true as const };
}
