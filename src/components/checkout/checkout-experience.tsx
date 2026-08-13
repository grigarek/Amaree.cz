"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Banknote, Check, CreditCard, Globe2, Landmark, LoaderCircle, MapPin, TicketPercent, Trash2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { localizedPaths, type Locale } from "@/i18n/routing";
import {
  DELIVERY_COUNTRY_CODES,
  getAllowedPaymentMethods,
  getPaymentQuote,
  getShippingMethods,
  getShippingQuote,
  paymentLabels,
  shippingLabels,
  type DeliveryCountryCode
} from "@/lib/commerce/config";
import { calculateOrderTotal } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { mockPacketaPoint, type PacketaPickupPoint, type PacketaValidationResult } from "@/lib/shipping/packeta";
import { disabledPacketaCodCapabilities, isPacketaCodSupported, type PacketaCodCapabilities } from "@/lib/shipping/capabilities";
import { useCartStore } from "@/store/cart-store";
import type { PaymentMethodId, ShippingMethodId } from "@/types/domain";
import { getGiftCardLineName } from "@/lib/gift-cards";
import { GiftCardSelector } from "@/components/shop/gift-card-selector";

type PacketaWidgetPoint = { id?: string; name?: string; street?: string; city?: string; zip?: string; country?: string; group?: string };

declare global {
  interface Window {
    Packeta?: { Widget: { pick: (apiKey: string, callback: (point: PacketaWidgetPoint | null) => void, options: Record<string, unknown>) => void } };
  }
}

const copy = {
  cs: {
    contact: "1. Kontaktní údaje", address: "2. Doručovací údaje", shipping: "3. Jak vám máme zboží doručit?",
    point: "4. Výdejní místo", payment: "5. Jak chcete objednávku zaplatit?", summary: "6. Souhrn objednávky",
    consent: "7. Souhlasy a odeslání objednávky", email: "E-mail", phone: "Telefon", name: "Jméno a příjmení",
    country: "Země doručení", street: "Ulice a číslo", city: "Město", postalCode: "PSČ", selectPoint: "Vybrat výdejní místo nebo Z-BOX",
    changePoint: "Změnit výdejní místo", widgetLoading: "Načítám výběr výdejního místa…", validating: "Ověřuji výdejní místo…", validationFailed: "Výdejní místo se nepodařilo ověřit.",
    widgetFailed: "Widget Zásilkovny se zatím nenačetl.", mock: "Lokální testovací režim: skutečná zásilka nevznikne.",
    bank: "Objednávka bude odeslána až po přijetí platby. Platební údaje a variabilní symbol obdržíte v potvrzení objednávky.",
    bankAccount: "Účet", itemSubtotal: "Mezisoučet", discount: "Sleva", shippingPrice: "Doprava", paymentFee: "Platební poplatek",
    total: "Celkem", selectedShipping: "Zvolená doprava", selectedPayment: "Zvolená platba", selectedPoint: "Vybrané místo",
    pricePending: "Čeká na potvrzené EUR ceny produktů",
    empty: "Košík je prázdný.", terms: "Souhlasím s obchodními podmínkami a beru na vědomí zásady ochrany osobních údajů.",
    orderPay: "Objednat a zaplatit", orderObligation: "Objednat s povinností platby", demo: "Cena a dostupnost budou před vytvořením objednávky znovu ověřeny.",
    submitting: "Vytvářím objednávku…", submitFailed: "Objednávku se nepodařilo vytvořit. Zkontrolujte údaje a zkuste to znovu.",
    euPending: "Doprava na Slovensko stojí 8,50 EUR. Doprava zdarma se na Slovensko zatím neposkytuje.",
    marketChangeConfirm: "Změna země vyprázdní košík, protože slovenské ceny jsou v eurech. Chcete pokračovat?",
    paymentUnavailable: "Pro zvolenou dopravu nyní není dostupná žádná platební metoda.",
    deliveryEstimate: "Doručení obvykle do 1–2 pracovních dnů.",
    methods: { PAYMENT_CARD: "Online platba kartou", APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", BANK_ACCOUNT: "Online bankovní převod" }
  },
  sk: {
    contact: "1. Kontaktné údaje", address: "2. Doručovacie údaje", shipping: "3. Ako vám máme tovar doručiť?",
    point: "4. Výdajné miesto", payment: "5. Ako chcete objednávku zaplatiť?", summary: "6. Súhrn objednávky",
    consent: "7. Súhlasy a odoslanie objednávky", email: "E-mail", phone: "Telefón", name: "Meno a priezvisko",
    country: "Krajina doručenia", street: "Ulica a číslo", city: "Mesto", postalCode: "PSČ", selectPoint: "Vybrať výdajné miesto alebo Z-BOX",
    changePoint: "Zmeniť výdajné miesto", widgetLoading: "Načítavam výber výdajného miesta…", validating: "Overujem výdajné miesto…", validationFailed: "Výdajné miesto sa nepodarilo overiť.",
    widgetFailed: "Widget Packety sa zatiaľ nenačítal.", mock: "Lokálny testovací režim: skutočná zásielka nevznikne.",
    bank: "Objednávka bude odoslaná až po prijatí platby. Platobné údaje a variabilný symbol dostanete v potvrdení objednávky.",
    bankAccount: "Účet", itemSubtotal: "Medzisúčet", discount: "Zľava", shippingPrice: "Doprava", paymentFee: "Platobný poplatok",
    total: "Celkom", selectedShipping: "Zvolená doprava", selectedPayment: "Zvolená platba", selectedPoint: "Vybrané miesto",
    pricePending: "Cena nie je dostupná", empty: "Košík je prázdny.",
    terms: "Súhlasím s obchodnými podmienkami a beriem na vedomie zásady ochrany osobných údajov.",
    orderPay: "Objednať a zaplatiť", orderObligation: "Objednať s povinnosťou platby", demo: "Cena a dostupnosť budú pred vytvorením objednávky znova overené.",
    submitting: "Vytváram objednávku…", submitFailed: "Objednávku sa nepodarilo vytvoriť. Skontrolujte údaje a skúste to znova.",
    euPending: "Doprava na Slovensko stojí 8,50 €. Doprava zdarma sa na Slovensko zatiaľ neposkytuje.",
    marketChangeConfirm: "Zmena krajiny vyprázdni košík, pretože slovenské ceny sú v eurách. Chcete pokračovať?",
    paymentUnavailable: "Platba pre Slovensko bude dostupná po aktivácii GoPay alebo overenej dobierky.",
    deliveryEstimate: "Doručenie zvyčajne do 1–2 pracovných dní.",
    methods: { PAYMENT_CARD: "Online platba kartou", APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", BANK_ACCOUNT: "Online bankový prevod" }
  },
  en: {
    contact: "1. Contact details", address: "2. Delivery details", shipping: "3. How should we deliver your order?",
    point: "4. Pickup point", payment: "5. How would you like to pay?", summary: "6. Order summary", consent: "7. Consent and order submission",
    email: "E-mail", phone: "Phone", name: "Full name", country: "Delivery country", street: "Street and number", city: "City", postalCode: "Postcode",
    selectPoint: "Select a pickup point or Z-BOX", changePoint: "Change pickup point", widgetLoading: "Loading pickup-point selection…", validating: "Validating pickup point…",
    validationFailed: "The pickup point could not be validated.", widgetFailed: "The Packeta widget has not loaded yet.", mock: "Local test mode: no real shipment will be created.",
    bank: "The order will be dispatched after payment is received. Payment details and the variable symbol will be sent in the confirmation.",
    bankAccount: "Account", itemSubtotal: "Subtotal", discount: "Discount", shippingPrice: "Shipping", paymentFee: "Payment fee", total: "Total",
    selectedShipping: "Selected shipping", selectedPayment: "Selected payment", selectedPoint: "Selected point", empty: "Your cart is empty.",
    pricePending: "Awaiting confirmed EUR product prices",
    terms: "I agree to the terms and conditions and acknowledge the privacy policy.", orderPay: "Order and pay", orderObligation: "Order with obligation to pay",
    demo: "Price and availability will be verified again before the order is created.", submitting: "Creating order…", submitFailed: "The order could not be created. Check the details and try again.", euPending: "Shipping to Slovakia costs EUR 8.50. Free shipping is not currently available for Slovakia.",
    marketChangeConfirm: "Changing the delivery country clears the cart because prices use a different currency. Continue?",
    paymentUnavailable: "No payment method is currently available for this delivery option.",
    deliveryEstimate: "Delivery usually takes 1–2 business days.",
    methods: { PAYMENT_CARD: "Online card payment", APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", BANK_ACCOUNT: "Online bank transfer" }
  },
  de: {
    contact: "1. Kontaktdaten", address: "2. Lieferdaten", shipping: "3. Wie sollen wir Ihre Bestellung liefern?", point: "4. Abholstelle",
    payment: "5. Wie möchten Sie bezahlen?", summary: "6. Bestellübersicht", consent: "7. Zustimmung und Bestellung", email: "E-Mail", phone: "Telefon",
    name: "Vor- und Nachname", country: "Lieferland", street: "Straße und Hausnummer", city: "Ort", postalCode: "PLZ",
    selectPoint: "Abholstelle oder Z-BOX auswählen", changePoint: "Abholstelle ändern", widgetLoading: "Abholstellenauswahl wird geladen…", validating: "Abholstelle wird geprüft…",
    validationFailed: "Die Abholstelle konnte nicht geprüft werden.", widgetFailed: "Das Packeta-Widget wurde noch nicht geladen.", mock: "Lokaler Testmodus: Es wird keine echte Sendung erstellt.",
    bank: "Der Versand erfolgt erst nach Zahlungseingang. Zahlungsdaten und Verwendungszweck erhalten Sie in der Bestätigung.",
    bankAccount: "Konto", itemSubtotal: "Zwischensumme", discount: "Rabatt", shippingPrice: "Versand", paymentFee: "Zahlungsgebühr", total: "Gesamt",
    selectedShipping: "Gewählter Versand", selectedPayment: "Gewählte Zahlung", selectedPoint: "Gewählte Abholstelle", empty: "Ihr Warenkorb ist leer.",
    pricePending: "Bestätigte EUR-Produktpreise stehen noch aus",
    terms: "Ich stimme den Geschäftsbedingungen zu und habe die Datenschutzerklärung zur Kenntnis genommen.", orderPay: "Bestellen und bezahlen",
    orderObligation: "Zahlungspflichtig bestellen", demo: "Preis und Verfügbarkeit werden vor der Bestellung erneut geprüft.", submitting: "Bestellung wird erstellt…", submitFailed: "Die Bestellung konnte nicht erstellt werden. Prüfen Sie die Angaben und versuchen Sie es erneut.",
    euPending: "Der Versand in die Slowakei kostet 8,50 EUR. Kostenloser Versand ist für die Slowakei derzeit nicht verfügbar.",
    marketChangeConfirm: "Beim Wechsel des Lieferlandes wird der Warenkorb wegen der anderen Währung geleert. Fortfahren?",
    paymentUnavailable: "Für diese Lieferoption ist derzeit keine Zahlungsart verfügbar.",
    deliveryEstimate: "Die Lieferung erfolgt gewöhnlich innerhalb von 1–2 Werktagen.",
    methods: { PAYMENT_CARD: "Online-Kartenzahlung", APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", BANK_ACCOUNT: "Online-Banküberweisung" }
  }
} as const;

const consentLinkCopy: Record<Locale, { prefix: string; terms: string; middle: string; privacy: string; suffix: string }> = {
  cs: { prefix: "Souhlasím s ", terms: "obchodními podmínkami", middle: " a beru na vědomí ", privacy: "zásady ochrany osobních údajů", suffix: "." },
  sk: { prefix: "Súhlasím s ", terms: "obchodnými podmienkami", middle: " a beriem na vedomie ", privacy: "zásady ochrany osobných údajov", suffix: "." },
  en: { prefix: "I agree to the ", terms: "terms and conditions", middle: " and acknowledge the ", privacy: "privacy policy", suffix: "." },
  de: { prefix: "Ich stimme den ", terms: "Geschäftsbedingungen", middle: " zu und habe die ", privacy: "Datenschutzerklärung", suffix: " zur Kenntnis genommen." }
};

export function CheckoutExperience({ gopayEnabled = false, locale, packetaCodCapabilities = disabledPacketaCodCapabilities }: { gopayEnabled?: boolean; locale: Locale; packetaCodCapabilities?: PacketaCodCapabilities }) {
  const c = copy[locale];
  const cartCopy = useTranslations("cart");
  const consentCopy = consentLinkCopy[locale];
  const { lines, giftCardDesignId, setGiftCardDesign, discountCode, discountAmount, discountFreeShipping, discountMessage, discountValid, clear, clearDiscount, setDiscountCode, setDiscountResult } = useCartStore();
  const marketCountry: DeliveryCountryCode = locale === "sk" ? "SK" : "CZ";
  const [countryCode] = useState<DeliveryCountryCode>(marketCountry);
  const [shippingMethodId, setShippingMethodId] = useState<ShippingMethodId>("packeta_pickup");
  const [paymentMethodId, setPaymentMethodId] = useState<PaymentMethodId>(gopayEnabled ? "gopay" : locale === "sk" ? "cash_on_delivery" : "bank_transfer");
  const [selectedPoint, setSelectedPoint] = useState<PacketaPickupPoint | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetLoadFailed, setWidgetLoadFailed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const widgetKey = process.env.NEXT_PUBLIC_PACKETA_WIDGET_API_KEY;
  const regionNames = useMemo(() => new Intl.DisplayNames(locale === "cs" ? "cs-CZ" : locale === "sk" ? "sk-SK" : locale, { type: "region" }), [locale]);
  const shippingMethods = getShippingMethods(countryCode);
  const getAvailablePaymentMethods = (shipping: ShippingMethodId, country: DeliveryCountryCode, point = selectedPoint) => getAllowedPaymentMethods(shipping, country).filter((method) => {
    if (method === "gopay") return gopayEnabled;
    if (method === "cash_on_delivery") return isPacketaCodSupported(packetaCodCapabilities, country, shipping, point?.type);
    return true;
  });
  const paymentMethods = getAvailablePaymentMethods(shippingMethodId, countryCode);
  const effectivePaymentMethod = paymentMethods.includes(paymentMethodId) ? paymentMethodId : "gopay";
  const totals = calculateOrderTotal(lines, discountCode, { countryCode, shippingMethodId, paymentMethodId: effectivePaymentMethod, discountAmount, freeShipping: discountFreeShipping, giftCardDesignId });

  function changeCountry(nextCountry: DeliveryCountryCode) {
    if (nextCountry === countryCode) return;
    if (lines.length && !window.confirm(c.marketChangeConfirm)) return;
    clear();
    const targetLocale = nextCountry === "SK" ? "sk" : "cs";
    window.location.assign(localizedPaths[targetLocale].collection);
  }

  function changeShipping(nextShipping: ShippingMethodId) {
    setShippingMethodId(nextShipping);
    setPaymentMethodId(getAvailablePaymentMethods(nextShipping, countryCode, null)[0] ?? "bank_transfer");
    if (nextShipping !== "packeta_pickup") setSelectedPoint(null);
  }

  async function applyDiscount() {
    if (!discountCode.trim() || !lines.length) return;
    setCheckingDiscount(true);
    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountCode,
          currency: countryCode === "SK" ? "EUR" : "CZK",
          locale,
          lines: lines.map(({ productId, quantity }) => ({ productId, quantity }))
        })
      });
      const result = await response.json() as { valid?: boolean; amountMinor?: number; freeShipping?: boolean; message?: string; error?: string };
      setDiscountResult(
        response.ok && result.valid ? result.amountMinor ?? 0 : 0,
        result.message ?? result.error ?? cartCopy("couponError"),
        Boolean(response.ok && result.valid),
        Boolean(response.ok && result.valid && result.freeShipping)
      );
    } catch {
      setDiscountResult(0, cartCopy("couponError"), false);
    } finally {
      setCheckingDiscount(false);
    }
  }

  async function validateSelection(point: PacketaPickupPoint) {
    setValidating(true);
    setValidationError(null);
    try {
      const response = await fetch("/api/shipping/packeta/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, point }) });
      const result = (await response.json()) as PacketaValidationResult;
      if (!response.ok || !result.valid || !result.point) throw new Error("invalid_point");
      setSelectedPoint(result.point);
      if (paymentMethodId === "cash_on_delivery" && !isPacketaCodSupported(packetaCodCapabilities, countryCode, shippingMethodId, result.point.type)) {
        setPaymentMethodId(gopayEnabled ? "gopay" : "bank_transfer");
      }
    } catch {
      setSelectedPoint(null);
      setValidationError(c.validationFailed);
    } finally {
      setValidating(false);
    }
  }

  function openPacketaWidget() {
    if (!widgetKey) return void validateSelection(mockPacketaPoint);
    if (!widgetReady || !window.Packeta?.Widget) return setValidationError(widgetLoadFailed ? c.widgetFailed : c.widgetLoading);
    window.Packeta.Widget.pick(widgetKey, (point) => {
      if (!point?.id || !point.name || !point.street || !point.city || !point.zip || !point.country) return;
      void validateSelection({ id: point.id, name: point.name, street: point.street, city: point.city, zip: point.zip, country: point.country, type: point.group === "zbox" ? "zbox" : "pickup-point" });
    }, { language: locale, country: countryCode.toLowerCase(), vendors: [{ country: countryCode.toLowerCase() }], appIdentity: "amaree-nextjs-0.1" });
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !termsAccepted || !lines.length || (shippingMethodId === "packeta_pickup" && !selectedPoint)) return;
    setSubmitting(true);
    setSubmitError("");
    idempotencyKey.current ??= crypto.randomUUID();
    const form = new FormData(event.currentTarget);
    const billingAddress = {
      street: String(form.get("street") ?? ""),
      city: String(form.get("city") ?? ""),
      postalCode: String(form.get("postalCode") ?? "")
    };
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current,
          locale,
          email: form.get("email"),
          phone: form.get("phone"),
          name: form.get("name"),
          countryCode,
          shippingMethodId,
          paymentMethodId,
          billingAddress,
          shippingAddress: billingAddress,
          packetaPoint: selectedPoint ?? undefined,
          discountCode: discountValid && discountCode ? discountCode : undefined,
          giftCardDesignId: giftCardDesignId ?? undefined,
          termsAccepted: true,
          lines: lines.map(({ productId, quantity }) => ({ productId, quantity }))
        })
      });
      const result = await response.json() as { redirectUrl?: string; thankYouUrl?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "checkout_failed");
      clear();
      window.location.assign(result.redirectUrl ?? result.thankYouUrl ?? `/${locale}/dekujeme`);
    } catch {
      setSubmitError(c.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = paymentMethodId === "gopay" ? c.orderPay : c.orderObligation;

  return (
    <>
      {widgetKey ? (
        <Script
          onError={() => {
            setWidgetLoadFailed(true);
            setWidgetReady(false);
          }}
          onReady={() => {
            setWidgetLoadFailed(false);
            setWidgetReady(Boolean(window.Packeta?.Widget));
          }}
          src="https://widget.packeta.com/v6/www/js/library.js"
          strategy="afterInteractive"
        />
      ) : null}
      <form className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]" onSubmit={submitCheckout}>
        <div className="grid gap-6">
          <CheckoutSection legend={c.contact}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field autoComplete="email" label={c.email} name="email" type="email" />
              <Field autoComplete="tel" label={c.phone} name="phone" />
              <Field autoComplete="name" className="md:col-span-2" label={c.name} name="name" />
            </div>
          </CheckoutSection>

          <CheckoutSection legend={c.address}>
            <label className="grid gap-2 font-redhat text-sm font-semibold">
              {c.country}
              <select className="rounded-brand border border-line bg-white px-4 py-3" value={countryCode} onChange={(event) => changeCountry(event.target.value as DeliveryCountryCode)}>
                {DELIVERY_COUNTRY_CODES.map((code) => <option key={code} value={code}>{regionNames.of(code) ?? code}</option>)}
              </select>
            </label>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field autoComplete="street-address" className="md:col-span-2" label={c.street} name="street" />
              <Field autoComplete="address-level2" label={c.city} name="city" />
              <Field autoComplete="postal-code" label={c.postalCode} name="postalCode" />
            </div>
          </CheckoutSection>

          <CheckoutSection legend={c.shipping}>
            <div className="grid gap-3">
              {shippingMethods.map((method) => {
                const Icon = method === "packeta_home"
                  ? Truck
                  : method === "packeta_pickup"
                    ? MapPin
                    : Globe2;

                return (
                  <label key={method} className="flex items-center justify-between gap-4 rounded-brand border border-line p-4 font-redhat text-sm">
                    <span className="flex min-w-0 items-center gap-3">
                      <input className="shrink-0" checked={shippingMethodId === method} name="shipping" onChange={() => changeShipping(method)} type="radio" />
                      <Icon aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.7} />
                      <span>
                        <span className="block">{shippingLabels[method][locale]}</span>
                        <span className="mt-1 block text-xs font-normal leading-5 text-muted">{c.deliveryEstimate}</span>
                      </span>
                    </span>
                    <strong className="shrink-0">{formatMoney(getShippingQuote(method, countryCode).amount, locale, getShippingQuote(method, countryCode).currency)}</strong>
                  </label>
                );
              })}
            </div>
            {countryCode === "SK" ? <p className="mt-4 font-redhat text-sm text-ruby">{c.euPending}</p> : null}
          </CheckoutSection>

          {shippingMethodId === "packeta_pickup" ? (
            <CheckoutSection legend={c.point}>
              <button className="inline-flex items-center gap-2 rounded-brand bg-ruby px-4 py-3 font-redhat text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-65" disabled={validating || Boolean(widgetKey && !widgetReady)} onClick={openPacketaWidget} type="button">
                {widgetKey && !widgetReady ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <MapPin aria-hidden="true" size={18} />}
                {widgetKey && !widgetReady ? c.widgetLoading : validating ? c.validating : selectedPoint ? c.changePoint : c.selectPoint}
              </button>
              {!widgetKey ? <p className="mt-3 font-redhat text-xs text-muted">{c.mock}</p> : null}
              {selectedPoint ? <div className="mt-4 font-redhat text-sm"><p className="font-semibold">{selectedPoint.name}</p><p className="text-muted">{selectedPoint.street}, {selectedPoint.zip} {selectedPoint.city}</p></div> : null}
              {widgetLoadFailed ? <p className="mt-3 font-redhat text-sm text-ruby" role="alert">{c.widgetFailed}</p> : null}
              {validationError ? <p className="mt-3 font-redhat text-sm text-ruby" role="alert">{validationError}</p> : null}
            </CheckoutSection>
          ) : null}

          <CheckoutSection legend={c.payment}>
            <div className="grid gap-3">
              {paymentMethods.map((method) => {
                const Icon = method === "gopay"
                  ? CreditCard
                  : method === "cash_on_delivery"
                    ? Banknote
                    : Landmark;

                return (
                  <label key={method} className="rounded-brand border border-line p-4 font-redhat text-sm">
                    <span className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-3">
                        <input checked={paymentMethodId === method} name="payment" onChange={() => setPaymentMethodId(method)} type="radio" />
                        {method === "gopay" ? (
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <CreditCard aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.7} />
                            <span>{c.methods.PAYMENT_CARD}</span>
                            <span className="inline-flex min-h-6 items-center" title={c.methods.APPLE_PAY}>
                              <Image alt={c.methods.APPLE_PAY} className="h-6 w-auto" height={106} src="/payment-methods/apple-pay.svg" width={166} />
                            </span>
                            <span className="inline-flex min-h-6 items-center" title={c.methods.GOOGLE_PAY}>
                              <Image alt={c.methods.GOOGLE_PAY} className="h-8 w-auto" height={742} src="/payment-methods/google-pay.svg" width={1094} />
                            </span>
                          </span>
                        ) : (
                          <>
                            <Icon aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.7} />
                            <span>{paymentLabels[method][locale]}</span>
                          </>
                        )}
                      </span>
                      {method === "cash_on_delivery" ? <strong>{formatMoney(getPaymentQuote(method, countryCode).amount, locale, getPaymentQuote(method, countryCode).currency)}</strong> : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {paymentMethods.length === 0 ? <p className="font-redhat text-sm font-semibold text-ruby">{c.paymentUnavailable}</p> : null}
          </CheckoutSection>
        </div>

        <aside className="self-start rounded-brand border border-line bg-white p-6 lg:sticky lg:top-28">
          <h2 className="amaree-subtitle">{c.summary}</h2>
          {totals.lines.length ? <div className="mt-5 grid gap-3">{totals.lines.map((line) => <div className="flex justify-between gap-4 font-redhat text-sm" key={line.product.id}><span>{line.quantity}× {line.product.name[locale]}</span><strong>{formatMoney(line.lineTotal, locale, totals.currency)}</strong></div>)}</div> : <p className="mt-5 font-redhat text-sm text-muted">{c.empty}</p>}
          {giftCardDesignId && totals.giftCard ? <div className="mt-3 flex items-center justify-between gap-4 font-redhat text-sm"><span>1× {getGiftCardLineName(giftCardDesignId, locale)}</span><strong>{formatMoney(totals.giftCardPrice, locale, totals.currency)}</strong></div> : null}
          {totals.lines.length ? <div className="mt-5"><GiftCardSelector locale={locale} onSelect={setGiftCardDesign} selectedId={giftCardDesignId} /></div> : null}
          <section aria-labelledby="checkout-discount-title" className="mt-5 border-t border-line pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-redhat text-sm font-semibold" id="checkout-discount-title">
                <TicketPercent aria-hidden="true" className="text-ruby" size={18} />
                {cartCopy("coupon")}
              </h3>
              {discountValid ? (
                <button className="inline-flex items-center gap-1.5 font-redhat text-xs font-semibold text-muted transition hover:text-ruby" onClick={() => { clearDiscount(); setDiscountCode(""); }} type="button">
                  <Trash2 aria-hidden="true" size={15} /> {cartCopy("removeCoupon")}
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex gap-2">
              <div className="relative min-w-0 flex-1">
                {discountValid ? <Check aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700" size={18} /> : <TicketPercent aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />}
                <input aria-label={cartCopy("coupon")} autoCapitalize="characters" autoComplete="off" className="w-full rounded-brand border border-line py-3 pl-10 pr-3 font-mono text-sm uppercase" disabled={discountValid} id="checkout-discount-code" name="discountCode" placeholder={cartCopy("couponPlaceholder")} value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void applyDiscount(); } }} />
              </div>
              <button className="shrink-0 rounded-brand border border-ruby px-3 font-redhat text-sm font-semibold text-ruby transition hover:bg-ruby hover:text-white disabled:opacity-50" disabled={checkingDiscount || discountValid || !discountCode.trim() || !lines.length} onClick={() => void applyDiscount()} type="button">{checkingDiscount ? <LoaderCircle aria-label={cartCopy("checkingCoupon")} className="mx-auto animate-spin" size={18} /> : cartCopy("applyCoupon")}</button>
            </div>
            {discountMessage ? <p className={`mt-2 font-redhat text-xs font-semibold ${discountValid ? "text-emerald-700" : "text-red-700"}`} role="status">{discountMessage}</p> : null}
          </section>
          <dl className="mt-5 grid gap-2 border-t border-line pt-5 font-redhat text-sm">
            <SummaryRow label={c.itemSubtotal} value={formatMoney(totals.subtotal, locale, totals.currency)} />
            <SummaryRow label={c.discount} value={`-${formatMoney(totals.discount, locale, totals.currency)}`} />
            <SummaryRow label={c.shippingPrice} value={formatMoney(totals.shipping, locale, totals.currency)} />
            <SummaryRow label={c.paymentFee} value={formatMoney(totals.paymentFee, locale, totals.currency)} />
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>{c.total}</dt><dd>{formatMoney(totals.total, locale, totals.currency)}</dd></div>
          </dl>
          <div className="mt-5 grid gap-2 border-t border-line pt-5 font-redhat text-sm text-muted">
            <p><strong className="text-ink">{c.selectedShipping}:</strong> {shippingLabels[shippingMethodId][locale]}</p>
            <p><strong className="text-ink">{c.selectedPayment}:</strong> {paymentMethods.includes(paymentMethodId) ? paymentLabels[paymentMethodId][locale] : c.paymentUnavailable}</p>
            {selectedPoint ? <p><strong className="text-ink">{c.selectedPoint}:</strong> {selectedPoint.name}, {selectedPoint.street}, {selectedPoint.city}</p> : null}
          </div>
          <h2 className="amaree-subtitle mt-6">{c.consent}</h2>
          <label className="mt-4 flex gap-3 font-redhat text-sm text-muted">
            <input checked={termsAccepted} name="terms" onChange={(event) => setTermsAccepted(event.target.checked)} required type="checkbox" />
            <span>
              {consentCopy.prefix}
              <Link className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-ruby" href={localizedPaths[locale].terms} rel="noreferrer" target="_blank">{consentCopy.terms}</Link>
              {consentCopy.middle}
              <Link className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-ruby" href={localizedPaths[locale].privacy} rel="noreferrer" target="_blank">{consentCopy.privacy}</Link>
              {consentCopy.suffix}
            </span>
          </label>
          <button className="mt-6 w-full rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting || !termsAccepted || !lines.length || !paymentMethods.includes(paymentMethodId) || (shippingMethodId === "packeta_pickup" && !selectedPoint)} type="submit">{submitting ? c.submitting : submitLabel}</button>
          <p className="mt-3 font-redhat text-xs text-muted">{c.demo}</p>
          {submitError ? <p className="mt-3 font-redhat text-sm font-semibold text-ruby" role="alert">{submitError}</p> : null}
        </aside>
      </form>
    </>
  );
}

function CheckoutSection({ legend, children }: { legend: string; children: React.ReactNode }) {
  return <fieldset className="rounded-brand border border-line bg-white p-6"><legend className="amaree-subtitle">{legend}</legend><div className="mt-5">{children}</div></fieldset>;
}

function Field({ label, name, className = "", ...props }: { label: string; name: string; className?: string; type?: string; autoComplete?: string }) {
  return <label className={`grid gap-2 font-redhat text-sm font-semibold ${className}`}>{label}<input {...props} className="rounded-brand border border-line px-4 py-3" name={name} required /></label>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt>{label}</dt><dd>{value}</dd></div>;
}
