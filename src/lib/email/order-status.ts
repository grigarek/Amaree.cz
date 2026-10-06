import "server-only";
import { randomUUID } from "node:crypto";
import { company } from "@/lib/config/company";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminOrder, type AdminOrderDetail } from "@/lib/admin/orders";
import { deliverRecordedEmail } from "@/lib/email/delivery";
import { buildCurrentOrderTermsSnapshot, buildOrderTermsAttachment, isOrderTermsSnapshot, shouldAttachOrderTerms } from "@/lib/email/order-terms";
import type { EmailLocale } from "@/lib/email/provider";
import type { OrderTemplateKey } from "@/lib/orders/statuses";
import { defaultOrderEmailSettings, getOrderEmailSettings, type OrderEmailSettings } from "@/lib/admin/email-template-settings";
import { localizedPaths } from "@/i18n/routing";
import { customerGreeting } from "@/lib/email/salutation";
export { templateForOrderStatus } from "@/lib/orders/statuses";

type TemplateCopy = { subject: string; status: string; intro: string };

const templateCopy: Record<OrderTemplateKey, Record<EmailLocale, TemplateCopy>> = {
  order_received: {
    cs: { subject: "Objednávku jsme přijali", status: "Objednávka přijata", intro: "Děkujeme za vaši objednávku. Níže najdete její potvrzený souhrn." },
    sk: { subject: "Objednávku sme prijali", status: "Objednávka prijatá", intro: "Ďakujeme za vašu objednávku. Nižšie nájdete jej potvrdený súhrn." }
  },
  awaiting_online_payment: {
    cs: { subject: "Dokončete prosím online platbu", status: "Čeká na online platbu", intro: "Objednávku evidujeme, ale online platba zatím nebyla dokončena. K platbě se můžete bezpečně vrátit tlačítkem níže." },
    sk: { subject: "Dokončite prosím online platbu", status: "Čaká na online platbu", intro: "Objednávku evidujeme, ale online platba zatiaľ nebola dokončená. K platbe sa môžete bezpečne vrátiť tlačidlom nižšie." }
  },
  awaiting_bank_transfer: {
    cs: { subject: "Čekáme na bankovní převod", status: "Čeká na bankovní převod", intro: "Objednávku odešleme po přijetí bankovního převodu." },
    sk: { subject: "Čakáme na bankový prevod", status: "Čaká na bankový prevod", intro: "Objednávku odošleme po prijatí bankového prevodu." }
  },
  payment_confirmed: {
    cs: { subject: "Platba byla potvrzena", status: "Zaplaceno", intro: "Děkujeme za vaši objednávku i úspěšnou platbu. Vaše šperky nyní pečlivě připravíme k odeslání." },
    sk: { subject: "Platba bola potvrdená", status: "Zaplatené", intro: "Ďakujeme za vašu objednávku aj úspešnú platbu. Vaše šperky teraz starostlivo pripravíme na odoslanie." }
  },
  payment_failed: {
    cs: { subject: "Platba se nezdařila nebo vypršela", status: "Platba nepotvrzena", intro: "Platbu se nepodařilo potvrdit. Pokud jste částku odeslali, napište nám prosím." },
    sk: { subject: "Platba zlyhala alebo vypršala", status: "Platba nepotvrdená", intro: "Platbu sa nepodarilo potvrdiť. Ak ste sumu odoslali, napíšte nám prosím." }
  },
  order_processing: {
    cs: { subject: "Objednávku připravujeme", status: "Připravuje se", intro: "Vaše šperky právě pečlivě připravujeme." },
    sk: { subject: "Objednávku pripravujeme", status: "Pripravuje sa", intro: "Vaše šperky práve starostlivo pripravujeme." }
  },
  ready_for_pickup: {
    cs: { subject: "Objednávka je připravena k osobnímu odběru", status: "Připraveno k osobnímu odběru", intro: "Objednávka je připravena. Termín převzetí si prosím předem potvrďte." },
    sk: { subject: "Objednávka je pripravená na osobný odber", status: "Pripravené na osobný odber", intro: "Objednávka je pripravená. Termín prevzatia si prosím vopred potvrďte." }
  },
  order_shipped: {
    cs: { subject: "Zásilka byla předána dopravci", status: "Předáno dopravci", intro: "Zásilku jsme předali Zásilkovně. Její cestu můžete sledovat přes odkaz níže." },
    sk: { subject: "Zásielka bola odovzdaná dopravcovi", status: "Odovzdané dopravcovi", intro: "Zásielku sme odovzdali dopravcovi Packeta. Jej cestu môžete sledovať cez odkaz nižšie." }
  },
  shipment_ready_for_collection: {
    cs: { subject: "Zásilka je připravena k vyzvednutí", status: "Připraveno k vyzvednutí", intro: "Zásilkovna oznámila, že zásilka je připravena na zvoleném výdejním místě nebo v Z-BOXu." },
    sk: { subject: "Zásielka je pripravená na vyzdvihnutie", status: "Pripravené na vyzdvihnutie", intro: "Packeta oznámila, že zásielka je pripravená na zvolenom výdajnom mieste alebo v Z-BOXe." }
  },
  order_delivered: {
    cs: { subject: "Objednávka byla doručena", status: "Doručeno", intro: "Vaše objednávka byla úspěšně doručena. Věříme, že vám šperk AMARÉE udělá radost." },
    sk: { subject: "Objednávka bola doručená", status: "Doručené", intro: "Vaša objednávka bola úspešne doručená. Veríme, že vám šperk AMARÉE urobí radosť." }
  },
  order_cancelled: {
    cs: { subject: "Objednávka byla zrušena", status: "Zrušeno", intro: "Vaše objednávka byla zrušena. Pokud je to neočekávané, kontaktujte nás." },
    sk: { subject: "Objednávka bola zrušená", status: "Zrušené", intro: "Vaša objednávka bola zrušená. Ak je to neočakávané, kontaktujte nás." }
  },
  payment_refunded: {
    cs: { subject: "Platba byla vrácena", status: "Platba vrácena", intro: "Vrácení platby jsme zpracovali. Připsání částky závisí na vaší bance nebo platební metodě." },
    sk: { subject: "Platba bola vrátená", status: "Platba vrátená", intro: "Vrátenie platby sme spracovali. Pripísanie sumy závisí od vašej banky alebo platobnej metódy." }
  },
  withdrawal_received: {
    cs: { subject: "Odstoupení od smlouvy jsme přijali", status: "Odstoupení přijato", intro: "Potvrzujeme přijetí vašeho oznámení o odstoupení od smlouvy. O dalším postupu vás budeme informovat." },
    sk: { subject: "Odstúpenie od zmluvy sme prijali", status: "Odstúpenie prijaté", intro: "Potvrdzujeme prijatie vášho oznámenia o odstúpení od zmluvy. O ďalšom postupe vás budeme informovať." }
  }
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function safeImageUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function emailLocale(order: AdminOrderDetail): EmailLocale {
  return order.shippingCountry === "SK" ? "sk" : "cs";
}

function money(amount: number, currency: "CZK" | "EUR", locale: EmailLocale) {
  return new Intl.NumberFormat(locale === "sk" ? "sk-SK" : "cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "EUR" ? 2 : 0,
    maximumFractionDigits: currency === "EUR" ? 2 : 0
  }).format(amount / 100);
}

function address(value: Record<string, string>) {
  return [value.street, `${value.postalCode ?? ""} ${value.city ?? ""}`.trim(), value.countryCode].filter(Boolean).join(", ");
}

function paymentName(value: string, locale: EmailLocale) {
  const labels: Record<string, Record<EmailLocale, string>> = {
    gopay: { cs: "Online platba kartou", sk: "Online platba kartou" },
    bank_transfer: { cs: "Bankovní převod", sk: "Bankový prevod" },
    cash_on_delivery: { cs: "Dobírka", sk: "Dobierka" },
    cash_on_pickup: { cs: "Hotově při osobním odběru", sk: "V hotovosti pri osobnom odbere" }
  };
  return labels[value]?.[locale] ?? value;
}

function shippingName(value: string, locale: EmailLocale) {
  const labels: Record<string, Record<EmailLocale, string>> = {
    packeta_home: { cs: "Zásilkovna – doručení na adresu", sk: "Packeta – doručenie na adresu" },
    packeta_pickup: { cs: "Zásilkovna – výdejní místo nebo Z-BOX", sk: "Packeta – výdajné miesto alebo Z-BOX" },
    personal_pickup: { cs: "osobní odběr", sk: "osobný odber" }
  };
  return labels[value]?.[locale] ?? value;
}

function carrierName(shippingMethod: string, locale: EmailLocale) {
  return shippingMethod.startsWith("packeta_") ? (locale === "cs" ? "Zásilkovna" : "Packeta") : shippingMethod;
}

function editableCopy(settings: OrderEmailSettings, templateKey: OrderTemplateKey, locale: EmailLocale): TemplateCopy | null {
  if (!(templateKey in settings.templates)) return null;
  const item = settings.templates[templateKey as keyof OrderEmailSettings["templates"]];
  return locale === "sk"
    ? { subject: item.subjectSk, status: item.statusSk, intro: item.introSk }
    : { subject: item.subjectCs, status: item.statusCs, intro: item.introCs };
}

export function buildOrderStatusEmail(
  order: AdminOrderDetail,
  templateKey: OrderTemplateKey,
  settings: OrderEmailSettings = defaultOrderEmailSettings
) {
  const locale = emailLocale(order);
  const copy = editableCopy(settings, templateKey, locale) ?? templateCopy[templateKey][locale];
  const subject = `${copy.subject} – ${order.orderNumber}`;
  if (templateKey === "order_shipped" && (!order.shipment?.trackingNumber || !order.shipment.trackingUrl)) {
    throw new Error("shipment_tracking_missing");
  }

  const hello = customerGreeting(locale, order.firstName);
  const labels = locale === "sk"
    ? { order: "Objednávka", status: "Aktuálny stav", products: "Produkty", subtotal: "Medzisúčet", discount: "Zľava", shipping: "Doprava", fee: "Platobný poplatok", total: "Celkom", method: "Platba", delivery: "Spôsob doručenia", address: "Dodacia adresa", point: "Výdajné miesto", carrier: "Dopravca", tracking: "Sledovanie zásielky", account: "Účet", variable: "Variabilný symbol", due: "Splatnosť", terms: "Obchodné podmienky platné pri objednávke nájdete v prílohe tohto e-mailu." }
    : { order: "Objednávka", status: "Aktuální stav", products: "Produkty", subtotal: "Mezisoučet", discount: "Sleva", shipping: "Doprava", fee: "Platební poplatek", total: "Celkem", method: "Platba", delivery: "Způsob doručení", address: "Dodací adresa", point: "Výdejní místo", carrier: "Dopravce", tracking: "Sledování zásilky", account: "Účet", variable: "Variabilní symbol", due: "Splatnost", terms: "Obchodní podmínky platné při objednávce najdete v příloze tohoto e-mailu." };
  const attachTerms = shouldAttachOrderTerms(templateKey);
  const termsSnapshot = isOrderTermsSnapshot(order.termsSnapshot) ? order.termsSnapshot : buildCurrentOrderTermsSnapshot(locale);
  const attachments = attachTerms ? [buildOrderTermsAttachment(termsSnapshot)] : undefined;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://amaree.cz").replace(/\/$/, "");
  const termsUrl = `${siteUrl}${localizedPaths[locale].terms}`;
  const invoiceUrl = templateKey === "payment_confirmed"
    ? safeImageUrl(order.accountingDocument?.publicUrl ?? order.accountingDocument?.pdfUrl ?? null)
    : null;
  const pendingGoPay = order.payments.find((payment) => payment.provider === "gopay" && payment.status === "pending" && payment.checkoutUrl);
  const paymentActionUrl = templateKey === "awaiting_online_payment" ? pendingGoPay?.checkoutUrl ?? null : null;

  const text: string[] = [hello, "", copy.intro, "", `${labels.order}: ${order.orderNumber}`, `${labels.status}: ${copy.status}`, "", `${labels.products}:`];
  order.lines.forEach((line) => text.push(`${line.quantity}× ${line.name} – ${money(line.lineTotalMinor, order.currency, locale)}`));
  text.push("", `${labels.subtotal}: ${money(order.subtotalMinor, order.currency, locale)}`);
  if (order.discountMinor > 0) text.push(`${labels.discount}: −${money(order.discountMinor, order.currency, locale)}`);
  text.push(`${labels.shipping}: ${money(order.shippingMinor, order.currency, locale)}`);
  if (order.paymentFeeMinor > 0) text.push(`${labels.fee}: ${money(order.paymentFeeMinor, order.currency, locale)}`);
  text.push(`${labels.total}: ${money(order.totalMinor, order.currency, locale)}`, "", `${labels.method}: ${paymentName(order.paymentMethod, locale)}`, `${labels.delivery}: ${shippingName(order.shippingMethod, locale)}`);
  if (order.packetaPoint.name) text.push(`${labels.point}: ${order.packetaPoint.name}`);
  text.push(`${labels.address}: ${address(order.shippingAddress)}`);

  if (templateKey === "awaiting_bank_transfer") {
    text.push("", `${labels.account}: ${company.bankAccount}`);
    const variableSymbol = order.payments.find((payment) => payment.provider === "bank_transfer")?.variableSymbol;
    if (variableSymbol) text.push(`${labels.variable}: ${variableSymbol}`);
    if (order.reservationExpiresAt) text.push(`${labels.due}: ${new Intl.DateTimeFormat(locale === "sk" ? "sk-SK" : "cs-CZ", { dateStyle: "long" }).format(new Date(order.reservationExpiresAt))}`);
  }
  if (order.shipment?.trackingNumber && order.shipment.trackingUrl && ["order_shipped", "shipment_ready_for_collection", "order_delivered"].includes(templateKey)) {
    text.push("", `${labels.carrier}: ${carrierName(order.shippingMethod, locale)}`, `${labels.tracking}: ${order.shipment.trackingNumber}`, order.shipment.trackingUrl);
  }
  if (paymentActionUrl) {
    text.push("", locale === "sk" ? "Dokončiť platbu:" : "Dokončit platbu:", paymentActionUrl);
  }
  if (invoiceUrl) {
    text.push("", locale === "sk" ? "Faktúra k objednávke:" : "Faktura k objednávce:", invoiceUrl);
  }
  const reviewEnabled = templateKey === "order_delivered" && settings.review.enabled && Boolean(settings.review.url);
  if (reviewEnabled) {
    text.push(
      "",
      locale === "sk" ? settings.review.headingSk : settings.review.headingCs,
      locale === "sk" ? settings.review.textSk : settings.review.textCs,
      settings.review.url
    );
  }
  text.push("", locale === "sk" ? "Obchodné podmienky k objednávke:" : "Obchodní podmínky k objednávce:", termsUrl);
  if (attachTerms) text.push(labels.terms);
  text.push("", "AMARÉE", company.email, company.phone);

  const rows = order.lines.map((line) => {
    const imageUrl = safeImageUrl(line.imageUrl);
    const image = imageUrl
      ? `<td width="104" valign="top" style="padding:0 16px 0 0"><img src="${escapeHtml(imageUrl)}" width="88" height="88" alt="${escapeHtml(line.name)}" style="display:block;width:88px;height:88px;border:0;border-radius:4px;object-fit:cover;background:#f7f4f3"></td>`
      : "";
    return `<tr><td style="padding:18px 0;border-bottom:1px solid #eadfe0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${image}<td valign="middle"><div style="font-family:Georgia,serif;font-size:18px;line-height:1.35;color:#171313">${escapeHtml(line.name)}</div>${line.variant ? `<div style="margin-top:4px;font-size:13px;line-height:1.45;color:#766b6b">${escapeHtml(line.variant)}</div>` : ""}<div style="margin-top:7px;font-size:11px;line-height:1.4;letter-spacing:1px;color:#9a8e8e">${escapeHtml(line.sku)} · ${line.quantity} ks</div></td><td width="110" valign="middle" align="right" style="padding-left:12px;font-size:15px;font-weight:700;white-space:nowrap;color:#171313">${escapeHtml(money(line.lineTotalMinor, order.currency, locale))}</td></tr></table></td></tr>`;
  }).join("");
  const tracking = order.shipment?.trackingNumber && order.shipment.trackingUrl && ["order_shipped", "shipment_ready_for_collection", "order_delivered"].includes(templateKey)
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr><td style="padding:20px;background:#f8eeee;border-radius:4px"><div style="font-size:13px;line-height:1.7;color:#655b5b"><strong style="color:#171313">${labels.carrier}:</strong> ${escapeHtml(carrierName(order.shippingMethod, locale))}<br><strong style="color:#171313">${labels.tracking}:</strong> ${escapeHtml(order.shipment.trackingNumber)}</div><table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:16px"><tr><td bgcolor="#bc2227" style="border-radius:4px"><a href="${escapeHtml(order.shipment.trackingUrl)}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">${labels.tracking}</a></td></tr></table></td></tr></table>`
    : "";
  const bank = templateKey === "awaiting_bank_transfer"
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr><td style="padding:20px;background:#f8eeee;border-left:4px solid #bc2227"><div style="margin-bottom:10px;font-family:Georgia,serif;font-size:20px;color:#bc2227">${escapeHtml(copy.status)}</div><div style="font-size:14px;line-height:1.8;color:#4f4545"><strong>${labels.account}:</strong> ${escapeHtml(company.bankAccount)}${order.payments.find((payment) => payment.provider === "bank_transfer")?.variableSymbol ? `<br><strong>${labels.variable}:</strong> ${escapeHtml(order.payments.find((payment) => payment.provider === "bank_transfer")?.variableSymbol ?? "")}` : ""}${order.reservationExpiresAt ? `<br><strong>${labels.due}:</strong> ${escapeHtml(new Intl.DateTimeFormat(locale === "sk" ? "sk-SK" : "cs-CZ", { dateStyle: "long" }).format(new Date(order.reservationExpiresAt)))}` : ""}</div></td></tr></table>`
    : "";
  const paymentAction = paymentActionUrl
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr><td align="center" style="padding:22px 18px;background:#f8eeee"><div style="font-family:Georgia,serif;font-size:21px;line-height:1.35;color:#171313">${escapeHtml(locale === "sk" ? "Platbu môžete bezpečne dokončiť" : "Platbu můžete bezpečně dokončit")}</div><table role="presentation" cellspacing="0" cellpadding="0" style="margin:16px auto 0"><tr><td bgcolor="#bc2227" style="border-radius:4px"><a href="${escapeHtml(paymentActionUrl)}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(locale === "sk" ? "Dokončiť platbu" : "Dokončit platbu")}</a></td></tr></table></td></tr></table>`
    : "";
  const discountRow = order.discountMinor > 0 ? `<tr><td style="padding:5px 0;color:#655b5b">${labels.discount}</td><td align="right" style="padding:5px 0;color:#bc2227">−${escapeHtml(money(order.discountMinor, order.currency, locale))}</td></tr>` : "";
  const paymentFeeRow = order.paymentFeeMinor > 0 ? `<tr><td style="padding:5px 0;color:#655b5b">${labels.fee}</td><td align="right" style="padding:5px 0;color:#655b5b">${escapeHtml(money(order.paymentFeeMinor, order.currency, locale))}</td></tr>` : "";
  const termsNotice = attachTerms ? `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #eadfe0;font-size:13px;line-height:1.7;color:#655b5b">${escapeHtml(labels.terms)}</p>` : "";
  const invoiceNotice = invoiceUrl
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr><td align="center" style="padding:22px 18px;background:#f8eeee"><div style="font-family:Georgia,serif;font-size:21px;line-height:1.35;color:#171313">${escapeHtml(locale === "sk" ? "Faktúra k vašej objednávke" : "Faktura k vaší objednávce")}</div><table role="presentation" cellspacing="0" cellpadding="0" style="margin:16px auto 0"><tr><td bgcolor="#bc2227" style="border-radius:4px"><a href="${escapeHtml(invoiceUrl)}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(locale === "sk" ? "Zobraziť faktúru" : "Zobrazit fakturu")}</a></td></tr></table></td></tr></table>`
    : "";
  const termsLink = `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #eadfe0;font-size:13px;line-height:1.7;color:#655b5b">${escapeHtml(locale === "sk" ? "Obchodné podmienky k objednávke nájdete" : "Obchodní podmínky k objednávce najdete")} <a href="${escapeHtml(termsUrl)}" style="color:#bc2227;font-weight:700">${escapeHtml(locale === "sk" ? "na tejto stránke" : "na této stránce")}</a>.</p>`;
  const review = reviewEnabled
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr><td align="center" style="padding:24px 20px;background:#f8eeee;border-top:3px solid #bc2227"><div style="font-family:Georgia,serif;font-size:23px;line-height:1.3;color:#171313">${escapeHtml(locale === "sk" ? settings.review.headingSk : settings.review.headingCs)}</div><p style="margin:10px auto 0;max-width:500px;font-size:14px;line-height:1.7;color:#655b5b">${escapeHtml(locale === "sk" ? settings.review.textSk : settings.review.textCs)}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px auto 0"><tr><td bgcolor="#bc2227" style="border-radius:4px"><a href="${escapeHtml(settings.review.url)}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(locale === "sk" ? settings.review.buttonSk : settings.review.buttonCs)}</a></td></tr></table></td></tr></table>`
    : "";
  const html = `<!doctype html><html lang="${locale}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:#f7f4f3;color:#171313;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(copy.intro)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f7f4f3"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width:680px;background:#ffffff;border:1px solid #eadfe0;border-radius:4px;overflow:hidden"><tr><td height="8" bgcolor="#bc2227" style="height:8px;background:#bc2227;font-size:0;line-height:0">&nbsp;</td></tr><tr><td align="center" style="padding:30px 24px 24px"><div style="font-family:Georgia,serif;font-size:32px;line-height:1;color:#bc2227;letter-spacing:4px">AMARÉE</div><div style="margin-top:8px;font-family:Arial,sans-serif;font-size:9px;line-height:1;color:#bc2227;letter-spacing:3px">EST. 2025</div></td></tr><tr><td style="padding:8px 36px 38px"><p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4f4545">${escapeHtml(hello)}</p><h1 style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:1.2;font-weight:400;color:#171313">${escapeHtml(copy.subject)}</h1><p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#655b5b">${escapeHtml(copy.intro)}</p>${paymentAction}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 8px"><tr><td bgcolor="#f8eeee" style="padding:18px 20px;background:#f8eeee;border-radius:4px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="font-size:12px;line-height:1.5;color:#8a7c7c;letter-spacing:1px;text-transform:uppercase">${labels.order}<div style="margin-top:4px;font-size:16px;line-height:1.4;font-weight:700;letter-spacing:0;text-transform:none;color:#171313">${escapeHtml(order.orderNumber)}</div></td><td align="right" style="padding-left:16px"><span style="display:inline-block;padding:8px 12px;border-radius:3px;background:#bc2227;color:#ffffff;font-size:12px;font-weight:700;line-height:1.2">${escapeHtml(copy.status)}</span></td></tr></table></td></tr></table><div style="margin-top:28px;font-size:12px;font-weight:700;line-height:1.4;color:#bc2227;letter-spacing:1.5px;text-transform:uppercase">${labels.products}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#fbf9f8" style="margin-top:20px;background:#fbf9f8"><tr><td style="padding:18px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:5px 0;color:#655b5b">${labels.subtotal}</td><td align="right" style="padding:5px 0;color:#655b5b">${escapeHtml(money(order.subtotalMinor, order.currency, locale))}</td></tr>${discountRow}<tr><td style="padding:5px 0;color:#655b5b">${labels.shipping}</td><td align="right" style="padding:5px 0;color:#655b5b">${escapeHtml(money(order.shippingMinor, order.currency, locale))}</td></tr>${paymentFeeRow}<tr><td colspan="2" style="padding-top:10px;border-top:1px solid #eadfe0"></td></tr><tr><td style="font-size:17px;font-weight:700;color:#171313">${labels.total}</td><td align="right" style="font-size:19px;font-weight:700;color:#171313">${escapeHtml(money(order.totalMinor, order.currency, locale))}</td></tr></table></td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr><td valign="top" width="50%" style="padding:0 16px 0 0"><div style="font-size:11px;font-weight:700;line-height:1.4;color:#bc2227;letter-spacing:1px;text-transform:uppercase">${labels.method}</div><div style="margin-top:7px;font-size:14px;line-height:1.6;color:#4f4545">${escapeHtml(paymentName(order.paymentMethod, locale))}</div></td><td valign="top" width="50%" style="padding:0 0 0 16px;border-left:1px solid #eadfe0"><div style="font-size:11px;font-weight:700;line-height:1.4;color:#bc2227;letter-spacing:1px;text-transform:uppercase">${labels.delivery}</div><div style="margin-top:7px;font-size:14px;line-height:1.6;color:#4f4545">${escapeHtml(shippingName(order.shippingMethod, locale))}${order.packetaPoint.name ? `<br>${escapeHtml(order.packetaPoint.name)}` : ""}<br>${escapeHtml(address(order.shippingAddress))}</div></td></tr></table>${bank}${tracking}${invoiceNotice}${review}${termsLink}${termsNotice}</td></tr><tr><td align="center" bgcolor="#f8eeee" style="padding:26px 24px;background:#f8eeee"><div style="font-family:Georgia,serif;font-size:20px;color:#bc2227;letter-spacing:2px">AMARÉE</div><div style="margin-top:10px;font-size:12px;line-height:1.8;color:#655b5b"><a href="mailto:${escapeHtml(company.email)}" style="color:#bc2227;text-decoration:none">${escapeHtml(company.email)}</a>&nbsp;&nbsp;·&nbsp;&nbsp;${escapeHtml(company.phone)}<br><a href="https://www.instagram.com/amaree_cz" style="color:#655b5b;text-decoration:none">Instagram @amaree_cz</a></div></td></tr></table></td></tr></table></body></html>`;
  return { subject, text: text.join("\n"), html, attachments, templateKey, locale };
}

export async function sendOrderStatusEmail(orderId: string, templateKey: OrderTemplateKey, options: {
  manualResend?: boolean;
  triggeredBy?: string | null;
  triggerSource?: "checkout" | "payment_webhook" | "admin_status" | "admin_manual" | "shipment" | "system";
} = {}) {
  const order = await getAdminOrder(orderId, { service: true });
  if (!order) throw new Error("order_not_found");
  const settings = await getOrderEmailSettings();
  const content = buildOrderStatusEmail(order, templateKey, settings);
  const dedupeKey = options.manualResend
    ? `order:${order.id}:${templateKey}:manual:${randomUUID()}`
    : `order:${order.id}:${templateKey}`;
  const provider = process.env.TRANSACTIONAL_EMAIL_PROVIDER ?? "resend";
  const supabase = createSupabaseAdminClient();
  const { data: email, error: insertError } = await supabase.from("email_messages").insert({
    order_id: order.id,
    template_key: templateKey,
    recipient: order.email,
    locale: content.locale,
    subject: content.subject,
    body_text: content.text,
    body_html: content.html,
    provider,
    dedupe_key: dedupeKey,
    status: "queued",
    triggered_by: options.triggeredBy ?? null,
    trigger_source: options.triggerSource ?? "system",
    payload: { orderNumber: order.orderNumber, manualResend: Boolean(options.manualResend) }
  }).select("id").single();
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing } = await supabase.from("email_messages").select("id,status").eq("dedupe_key", dedupeKey).maybeSingle();
      return { status: "duplicate" as const, messageId: existing?.id ?? null, existingStatus: existing?.status ?? null };
    }
    throw new Error(insertError.message);
  }

  return deliverRecordedEmail(email.id, {
    to: order.email,
    toName: order.customer,
    subject: content.subject,
    text: content.text,
    html: content.html,
    attachments: content.attachments,
    replyTo: company.email,
    idempotencyKey: dedupeKey,
    metadata: { order_id: order.id, order_number: order.orderNumber, template: templateKey }
  });
}

export async function sendOrderLifecycleTestEmails(orderId: string, recipient: string, triggeredBy: string) {
  const order = await getAdminOrder(orderId, { service: true });
  if (!order) throw new Error("order_not_found");
  const testOrder: AdminOrderDetail = {
    ...order,
    email: recipient,
    shipment: order.shipment?.trackingNumber && order.shipment.trackingUrl
      ? order.shipment
      : {
          id: "email-preview",
          status: "shipped",
          providerPacketId: "TEST-AMAREE",
          trackingNumber: "TEST-AMAREE-2026",
          trackingUrl: "https://tracking.packeta.com/cs/?id=TEST-AMAREE-2026",
          labelStoragePath: null
        }
  };
  const templates = ["order_received", "order_shipped", "order_delivered"] as const satisfies readonly OrderTemplateKey[];
  const supabase = createSupabaseAdminClient();
  const provider = process.env.TRANSACTIONAL_EMAIL_PROVIDER ?? "resend";
  const settings = await getOrderEmailSettings();
  const results = [];

  for (const templateKey of templates) {
    const content = buildOrderStatusEmail(testOrder, templateKey, settings);
    const dedupeKey = `order:${order.id}:${templateKey}:test:${randomUUID()}`;
    const { data: email, error } = await supabase.from("email_messages").insert({
      order_id: order.id,
      template_key: templateKey,
      recipient,
      locale: content.locale,
      subject: content.subject,
      body_text: content.text,
      body_html: content.html,
      provider,
      dedupe_key: dedupeKey,
      status: "queued",
      triggered_by: triggeredBy,
      trigger_source: "admin_manual",
      payload: { orderNumber: order.orderNumber, testSuite: true }
    }).select("id").single();
    if (error || !email) throw new Error(error?.message ?? "email_test_record_failed");
    results.push(await deliverRecordedEmail(email.id, {
      to: recipient,
      toName: order.customer,
      subject: content.subject,
      text: content.text,
      html: content.html,
      attachments: content.attachments,
      replyTo: company.email,
      idempotencyKey: dedupeKey,
      metadata: { order_id: order.id, order_number: order.orderNumber, template: templateKey, test_suite: "true" }
    }));
  }
  return { sent: results.filter((result) => result.status === "sent").length, total: templates.length, results };
}
