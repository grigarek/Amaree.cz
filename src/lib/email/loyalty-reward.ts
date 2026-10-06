import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deliverRecordedEmail } from "@/lib/email/delivery";
import { czechVocative } from "@/lib/email/salutation";
import { localizedPaths, type Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/types/domain";

type RewardEmailInput = {
  code: string;
  currency: Currency;
  expiresAt: string;
  firstName?: string | null;
  locale: Locale;
  minimumOrderMinor: number;
  rewardPercent: number;
  rewardType: "threshold" | "birthday";
  siteUrl: string;
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function greeting(locale: Locale, firstName?: string | null) {
  const name = firstName?.trim();
  if (locale === "cs") return name ? `Dobrý den ${czechVocative(name)},` : "Dobrý den,";
  if (locale === "sk") return name ? `Dobrý deň ${name},` : "Dobrý deň,";
  if (locale === "de") return name ? `Hallo ${name},` : "Hallo,";
  return name ? `Hello ${name},` : "Hello,";
}

export function buildLoyaltyRewardEmail(input: RewardEmailInput) {
  const isBirthday = input.rewardType === "birthday";
  const accountUrl = `${input.siteUrl.replace(/\/$/, "")}${localizedPaths[input.locale].account}`;
  const expiry = new Intl.DateTimeFormat({ cs: "cs-CZ", sk: "sk-SK", en: "en-GB", de: "de-DE" }[input.locale]).format(new Date(input.expiresAt));
  const minimum = formatMoney(input.minimumOrderMinor, input.locale, input.currency);
  const copy = {
    cs: {
      subject: isBirthday ? `Narozeninová odměna ${input.rewardPercent} % od AMARÉE` : `Získali jste odměnu ${input.rewardPercent} % v AMARÉE Clubu`,
      title: isBirthday ? "Máme pro vás narozeninovou odměnu" : "Získali jste klubovou odměnu",
      intro: isBirthday ? "Přejeme vám krásné narozeniny. Jako poděkování jsme vám připravili osobní voucher na další šperk." : "Děkujeme, že se k AMARÉE vracíte. Ve vašem účtu je připravený osobní voucher na další nákup.",
      code: "Váš kód",
      value: "Hodnota odměny",
      minimum: "Minimální hodnota nákupu",
      valid: "Platí do",
      cta: "Zobrazit odměnu v mém účtu",
      note: "Voucher je osobní, jednorázový a lze jej použít pouze po přihlášení ke stejnému zákaznickému účtu. V jedné objednávce lze použít jeden slevový kód."
    },
    sk: {
      subject: isBirthday ? `Narodeninová odmena ${input.rewardPercent} % od AMARÉE` : `Získali ste odmenu ${input.rewardPercent} % v AMARÉE Clube`,
      title: isBirthday ? "Máme pre vás narodeninovú odmenu" : "Získali ste klubovú odmenu",
      intro: isBirthday ? "Prajeme vám krásne narodeniny. Ako poďakovanie sme vám pripravili osobný voucher na ďalší šperk." : "Ďakujeme, že sa k AMARÉE vraciate. Vo vašom účte je pripravený osobný voucher na ďalší nákup.",
      code: "Váš kód", value: "Hodnota odmeny", minimum: "Minimálna hodnota nákupu", valid: "Platí do", cta: "Zobraziť odmenu v mojom účte",
      note: "Voucher je osobný, jednorazový a možno ho použiť iba po prihlásení do rovnakého zákazníckeho účtu. V jednej objednávke možno použiť jeden zľavový kód."
    },
    en: {
      subject: isBirthday ? `Your ${input.rewardPercent}% birthday reward from AMARÉE` : `You earned a ${input.rewardPercent}% AMARÉE Club reward`,
      title: isBirthday ? "A birthday reward for you" : "You earned a Club reward",
      intro: isBirthday ? "Happy birthday. As a thank you, we have prepared a personal voucher for your next piece of jewelry." : "Thank you for returning to AMARÉE. A personal voucher is now waiting in your account.",
      code: "Your code", value: "Reward value", minimum: "Minimum purchase", valid: "Valid until", cta: "View reward in my account",
      note: "The voucher is personal, single-use and can only be used while signed in to the same customer account. One discount code may be used per order."
    },
    de: {
      subject: isBirthday ? `Ihre ${input.rewardPercent}% Geburtstagsprämie von AMARÉE` : `Sie haben ${input.rewardPercent}% Prämie im AMARÉE Club erhalten`,
      title: isBirthday ? "Eine Geburtstagsprämie für Sie" : "Sie haben eine Club-Prämie erhalten",
      intro: isBirthday ? "Alles Gute zum Geburtstag. Als Dankeschön haben wir einen persönlichen Gutschein für Ihr nächstes Schmuckstück vorbereitet." : "Vielen Dank, dass Sie zu AMARÉE zurückkehren. In Ihrem Konto wartet jetzt ein persönlicher Gutschein.",
      code: "Ihr Code", value: "Wert der Prämie", minimum: "Mindestbestellwert", valid: "Gültig bis", cta: "Prämie in meinem Konto ansehen",
      note: "Der Gutschein ist persönlich, einmalig nutzbar und gilt nur bei Anmeldung mit demselben Kundenkonto. Pro Bestellung kann ein Rabattcode verwendet werden."
    }
  }[input.locale];
  const hello = greeting(input.locale, input.firstName);
  const text = [hello, "", copy.title, copy.intro, "", `${copy.code}: ${input.code}`, `${copy.value}: ${input.rewardPercent} %`, `${copy.minimum}: ${minimum}`, `${copy.valid}: ${expiry}`, "", copy.note, "", `${copy.cta}: ${accountUrl}`].join("\n");
  const html = `<!doctype html><html lang="${input.locale}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(copy.subject)}</title></head><body style="margin:0;background:#f7f4f3;font-family:Arial,sans-serif;color:#171313"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #eadfe0"><tr><td style="height:7px;background:#bc2227"></td></tr><tr><td align="center" style="padding:30px 24px 20px"><div style="font-family:Georgia,serif;font-size:31px;letter-spacing:4px;color:#bc2227">AMARÉE</div><div style="margin-top:7px;font-size:9px;letter-spacing:3px;color:#bc2227">EST. 2025</div></td></tr><tr><td style="padding:14px 34px 38px"><p style="margin:0 0 22px;font-size:16px">${escapeHtml(hello)}</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:34px;line-height:1.2;font-weight:400">${escapeHtml(copy.title)}</h1><p style="margin:0 0 26px;font-size:15px;line-height:1.7;color:#655d5d">${escapeHtml(copy.intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8eeee"><tr><td style="padding:22px 24px"><div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#8b7f80">${escapeHtml(copy.code)}</div><div style="margin-top:8px;font-family:monospace;font-size:24px;font-weight:700;color:#bc2227">${escapeHtml(input.code)}</div><div style="margin-top:16px;font-size:14px;line-height:1.8"><strong>${escapeHtml(copy.value)}:</strong> ${input.rewardPercent} %<br><strong>${escapeHtml(copy.minimum)}:</strong> ${escapeHtml(minimum)}<br><strong>${escapeHtml(copy.valid)}:</strong> ${escapeHtml(expiry)}</div></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0"><tr><td bgcolor="#bc2227"><a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(copy.cta)}</a></td></tr></table><p style="margin:0;font-size:12px;line-height:1.7;color:#8b7f80">${escapeHtml(copy.note)}</p></td></tr><tr><td style="padding:20px 34px;background:#f8eeee;font-size:12px;color:#655d5d">AMARÉE · info@amaree.cz · +420 777 705 682</td></tr></table></td></tr></table></body></html>`;
  return { subject: copy.subject, text, html };
}

export async function sendPendingLoyaltyRewardEmails(limit = 100) {
  const supabase = createSupabaseAdminClient();
  const { data: rewards, error } = await supabase.from("loyalty_rewards").select("id,customer_user_id,discount_code_id,currency,reward_percent,reward_type,expires_at,notification_email_message_id,notification_sent_at").eq("status", "available").is("notification_sent_at", null).order("created_at").limit(Math.min(Math.max(limit, 1), 500));
  if (error) throw new Error(`loyalty_notification_query_failed:${error.message}`);
  if (!rewards?.length) return { processed: 0, sent: 0, failed: 0 };

  const userIds = [...new Set(rewards.map((reward) => reward.customer_user_id))];
  const discountIds = [...new Set(rewards.map((reward) => reward.discount_code_id))];
  const [{ data: profiles, error: profileError }, { data: discounts, error: discountError }] = await Promise.all([
    supabase.from("customer_profiles").select("user_id,email,first_name,locale").in("user_id", userIds),
    supabase.from("discount_codes").select("id,code,minimum_order_minor").in("id", discountIds)
  ]);
  if (profileError) throw new Error(`loyalty_profile_query_failed:${profileError.message}`);
  if (discountError) throw new Error(`loyalty_discount_query_failed:${discountError.message}`);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const discountMap = new Map((discounts ?? []).map((discount) => [discount.id, discount]));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amaree.cz";
  let sent = 0;
  let failed = 0;

  for (const reward of rewards) {
    const profile = profileMap.get(reward.customer_user_id);
    const discount = discountMap.get(reward.discount_code_id);
    if (!profile?.email || !discount?.code) { failed += 1; continue; }
    const locale = (["cs", "sk", "en", "de"].includes(profile.locale) ? profile.locale : "cs") as Locale;
    const content = buildLoyaltyRewardEmail({ code: discount.code, currency: reward.currency as Currency, expiresAt: reward.expires_at, firstName: profile.first_name, locale, minimumOrderMinor: Number(discount.minimum_order_minor), rewardPercent: Number(reward.reward_percent), rewardType: reward.reward_type as "threshold" | "birthday", siteUrl });
    const dedupeKey = `loyalty-reward:${reward.id}:issued`;
    try {
      let messageId = reward.notification_email_message_id as string | null;
      let messageStatus: string | null = null;
      if (!messageId) {
        const inserted = await supabase.from("email_messages").insert({ template_key: reward.reward_type === "birthday" ? "loyalty_birthday_reward" : "loyalty_reward", recipient: profile.email, locale, subject: content.subject, body_text: content.text, body_html: content.html, provider: process.env.TRANSACTIONAL_EMAIL_PROVIDER ?? "resend", dedupe_key: dedupeKey, status: "queued", trigger_source: "system", payload: { loyaltyRewardId: reward.id, customerUserId: reward.customer_user_id, rewardType: reward.reward_type } }).select("id,status").single();
        if (inserted.error?.code === "23505") {
          const existing = await supabase.from("email_messages").select("id,status").eq("dedupe_key", dedupeKey).maybeSingle();
          messageId = existing.data?.id ?? null;
          messageStatus = existing.data?.status ?? null;
        } else if (inserted.error) throw new Error(inserted.error.message);
        else { messageId = inserted.data.id; messageStatus = inserted.data.status; }
        if (messageId) await supabase.from("loyalty_rewards").update({ notification_email_message_id: messageId }).eq("id", reward.id);
      } else {
        const existing = await supabase.from("email_messages").select("status,attempt_count").eq("id", messageId).maybeSingle();
        messageStatus = existing.data?.status ?? null;
        if (Number(existing.data?.attempt_count ?? 0) >= 5 && messageStatus === "failed") { failed += 1; continue; }
      }
      if (!messageId) { failed += 1; continue; }
      if (messageStatus !== "sent") {
        const result = await deliverRecordedEmail(messageId, { to: profile.email, toName: profile.first_name ?? undefined, subject: content.subject, text: content.text, html: content.html, idempotencyKey: dedupeKey, metadata: { loyalty_reward_id: reward.id, reward_type: reward.reward_type } });
        if (result.status !== "sent") continue;
      }
      await supabase.from("loyalty_rewards").update({ notification_sent_at: new Date().toISOString() }).eq("id", reward.id).is("notification_sent_at", null);
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { processed: rewards.length, sent, failed };
}
