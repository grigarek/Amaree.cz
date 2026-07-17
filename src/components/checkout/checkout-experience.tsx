"use client";

import Script from "next/script";
import { Banknote, CreditCard, Globe2, Landmark, MapPin, Store, Truck } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/routing";
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
import { company, companyAddressLines } from "@/lib/config/company";
import { formatMoney } from "@/lib/money";
import { mockPacketaPoint, type PacketaPickupPoint, type PacketaValidationResult } from "@/lib/shipping/packeta";
import { useCartStore } from "@/store/cart-store";
import type { PaymentMethodId, ShippingMethodId } from "@/types/domain";

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
    changePoint: "Změnit výdejní místo", validating: "Ověřuji výdejní místo…", validationFailed: "Výdejní místo se nepodařilo ověřit.",
    widgetFailed: "Widget Zásilkovny se zatím nenačetl.", mock: "Lokální testovací režim: skutečná zásilka nevznikne.",
    pickupReady: "Objednávku si můžete vyzvednout až po obdržení potvrzení, že je připravena k osobnímu odběru.",
    bank: "Objednávka bude odeslána až po přijetí platby. Platební údaje a variabilní symbol obdržíte v potvrzení objednávky.",
    bankAccount: "Účet", itemSubtotal: "Mezisoučet", discount: "Sleva", shippingPrice: "Doprava", paymentFee: "Platební poplatek",
    total: "Celkem", selectedShipping: "Zvolená doprava", selectedPayment: "Zvolená platba", selectedPoint: "Vybrané místo",
    pricePending: "Čeká na potvrzené EUR ceny produktů",
    empty: "Košík je prázdný.", terms: "Souhlasím s obchodními podmínkami a beru na vědomí zásady ochrany osobních údajů.",
    orderPay: "Objednat a zaplatit", orderObligation: "Objednat s povinností platby", demo: "Cena a dostupnost budou před vytvořením objednávky znovu ověřeny.",
    submitting: "Vytvářím objednávku…", submitFailed: "Objednávku se nepodařilo vytvořit. Zkontrolujte údaje a zkuste to znovu.",
    euPending: "Doprava do EU je připravena za 14,50 EUR. Objednání zůstává vypnuté do doplnění EUR cen produktů a ověření cílových služeb.",
    methods: { PAYMENT_CARD: "Online platba kartou", APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", BANK_ACCOUNT: "Online bankovní převod" }
  },
  en: {
    contact: "1. Contact details", address: "2. Delivery details", shipping: "3. How should we deliver your order?",
    point: "4. Pickup point", payment: "5. How would you like to pay?", summary: "6. Order summary", consent: "7. Consent and order submission",
    email: "E-mail", phone: "Phone", name: "Full name", country: "Delivery country", street: "Street and number", city: "City", postalCode: "Postcode",
    selectPoint: "Select a pickup point or Z-BOX", changePoint: "Change pickup point", validating: "Validating pickup point…",
    validationFailed: "The pickup point could not be validated.", widgetFailed: "The Packeta widget has not loaded yet.", mock: "Local test mode: no real shipment will be created.",
    pickupReady: "Collect your order only after receiving confirmation that it is ready for pickup.",
    bank: "The order will be dispatched after payment is received. Payment details and the variable symbol will be sent in the confirmation.",
    bankAccount: "Account", itemSubtotal: "Subtotal", discount: "Discount", shippingPrice: "Shipping", paymentFee: "Payment fee", total: "Total",
    selectedShipping: "Selected shipping", selectedPayment: "Selected payment", selectedPoint: "Selected point", empty: "Your cart is empty.",
    pricePending: "Awaiting confirmed EUR product prices",
    terms: "I agree to the terms and conditions and acknowledge the privacy policy.", orderPay: "Order and pay", orderObligation: "Order with obligation to pay",
    demo: "Price and availability will be verified again before the order is created.", submitting: "Creating order…", submitFailed: "The order could not be created. Check the details and try again.", euPending: "EU delivery is prepared at EUR 14.50. Ordering remains disabled until EUR product prices and destination services are verified.",
    methods: { PAYMENT_CARD: "Online card payment", APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", BANK_ACCOUNT: "Online bank transfer" }
  },
  de: {
    contact: "1. Kontaktdaten", address: "2. Lieferdaten", shipping: "3. Wie sollen wir Ihre Bestellung liefern?", point: "4. Abholstelle",
    payment: "5. Wie möchten Sie bezahlen?", summary: "6. Bestellübersicht", consent: "7. Zustimmung und Bestellung", email: "E-Mail", phone: "Telefon",
    name: "Vor- und Nachname", country: "Lieferland", street: "Straße und Hausnummer", city: "Ort", postalCode: "PLZ",
    selectPoint: "Abholstelle oder Z-BOX auswählen", changePoint: "Abholstelle ändern", validating: "Abholstelle wird geprüft…",
    validationFailed: "Die Abholstelle konnte nicht geprüft werden.", widgetFailed: "Das Packeta-Widget wurde noch nicht geladen.", mock: "Lokaler Testmodus: Es wird keine echte Sendung erstellt.",
    pickupReady: "Holen Sie die Bestellung erst ab, nachdem Sie die Bestätigung der Abholbereitschaft erhalten haben.",
    bank: "Der Versand erfolgt erst nach Zahlungseingang. Zahlungsdaten und Verwendungszweck erhalten Sie in der Bestätigung.",
    bankAccount: "Konto", itemSubtotal: "Zwischensumme", discount: "Rabatt", shippingPrice: "Versand", paymentFee: "Zahlungsgebühr", total: "Gesamt",
    selectedShipping: "Gewählter Versand", selectedPayment: "Gewählte Zahlung", selectedPoint: "Gewählte Abholstelle", empty: "Ihr Warenkorb ist leer.",
    pricePending: "Bestätigte EUR-Produktpreise stehen noch aus",
    terms: "Ich stimme den Geschäftsbedingungen zu und habe die Datenschutzerklärung zur Kenntnis genommen.", orderPay: "Bestellen und bezahlen",
    orderObligation: "Zahlungspflichtig bestellen", demo: "Preis und Verfügbarkeit werden vor der Bestellung erneut geprüft.", submitting: "Bestellung wird erstellt…", submitFailed: "Die Bestellung konnte nicht erstellt werden. Prüfen Sie die Angaben und versuchen Sie es erneut.",
    euPending: "EU-Lieferung ist für 14,50 EUR vorbereitet. Die Bestellung bleibt bis zur Prüfung der EUR-Produktpreise und Zieldienste deaktiviert.",
    methods: { PAYMENT_CARD: "Online-Kartenzahlung", APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay", BANK_ACCOUNT: "Online-Banküberweisung" }
  }
} as const;

export function CheckoutExperience({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const { lines, discountCode, clear } = useCartStore();
  const [countryCode, setCountryCode] = useState<DeliveryCountryCode>("CZ");
  const [shippingMethodId, setShippingMethodId] = useState<ShippingMethodId>("packeta_pickup");
  const [paymentMethodId, setPaymentMethodId] = useState<PaymentMethodId>("gopay");
  const [selectedPoint, setSelectedPoint] = useState<PacketaPickupPoint | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const widgetKey = process.env.NEXT_PUBLIC_PACKETA_WIDGET_API_KEY;
  const enabledGoPayMethods = (process.env.NEXT_PUBLIC_GOPAY_ENABLED_METHODS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const regionNames = useMemo(() => new Intl.DisplayNames(locale === "cs" ? "cs-CZ" : locale, { type: "region" }), [locale]);
  const shippingMethods = getShippingMethods(countryCode);
  const paymentMethods = getAllowedPaymentMethods(shippingMethodId);
  const domestic = countryCode === "CZ";
  const totals = domestic ? calculateOrderTotal(lines, discountCode, { countryCode, shippingMethodId, paymentMethodId }) : null;

  function changeCountry(nextCountry: DeliveryCountryCode) {
    const countryShipping = getShippingMethods(nextCountry)[0];
    setCountryCode(nextCountry);
    setShippingMethodId(countryShipping);
    setPaymentMethodId(getAllowedPaymentMethods(countryShipping)[0]);
    setSelectedPoint(null);
  }

  function changeShipping(nextShipping: ShippingMethodId) {
    setShippingMethodId(nextShipping);
    setPaymentMethodId(getAllowedPaymentMethods(nextShipping)[0]);
    if (nextShipping !== "packeta_pickup") setSelectedPoint(null);
  }

  async function validateSelection(point: PacketaPickupPoint) {
    setValidating(true);
    setValidationError(null);
    try {
      const response = await fetch("/api/shipping/packeta/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, point }) });
      const result = (await response.json()) as PacketaValidationResult;
      if (!response.ok || !result.valid || !result.point) throw new Error("invalid_point");
      setSelectedPoint(result.point);
    } catch {
      setSelectedPoint(null);
      setValidationError(c.validationFailed);
    } finally {
      setValidating(false);
    }
  }

  function openPacketaWidget() {
    if (!widgetKey) return void validateSelection(mockPacketaPoint);
    if (!window.Packeta?.Widget) return setValidationError(c.widgetFailed);
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
          discountCode: discountCode || undefined,
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
      <Script src="https://widget.packeta.com/v6/www/js/library.js" strategy="afterInteractive" />
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
                    : method === "personal_pickup"
                      ? Store
                      : Globe2;

                return (
                  <label key={method} className="flex items-center justify-between gap-4 rounded-brand border border-line p-4 font-redhat text-sm">
                    <span className="flex min-w-0 items-center gap-3">
                      <input className="shrink-0" checked={shippingMethodId === method} name="shipping" onChange={() => changeShipping(method)} type="radio" />
                      <Icon aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.7} />
                      <span>{shippingLabels[method][locale]}</span>
                    </span>
                    <strong className="shrink-0">{formatMoney(getShippingQuote(method, countryCode).amount, locale, getShippingQuote(method, countryCode).currency)}</strong>
                  </label>
                );
              })}
            </div>
            {shippingMethodId === "personal_pickup" ? <div className="mt-4 font-redhat text-sm text-muted">{companyAddressLines.map((line) => <p key={line}>{line}</p>)}<p className="mt-3 font-semibold text-ink">{c.pickupReady}</p></div> : null}
            {!domestic ? <p className="mt-4 font-redhat text-sm text-ruby">{c.euPending}</p> : null}
          </CheckoutSection>

          {shippingMethodId === "packeta_pickup" ? (
            <CheckoutSection legend={c.point}>
              <button className="inline-flex items-center gap-2 rounded-brand bg-ruby px-4 py-3 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={validating} onClick={openPacketaWidget} type="button">
                <MapPin size={18} />{validating ? c.validating : selectedPoint ? c.changePoint : c.selectPoint}
              </button>
              {!widgetKey ? <p className="mt-3 font-redhat text-xs text-muted">{c.mock}</p> : null}
              {selectedPoint ? <div className="mt-4 font-redhat text-sm"><p className="font-semibold">{selectedPoint.name}</p><p className="text-muted">{selectedPoint.street}, {selectedPoint.zip} {selectedPoint.city}</p></div> : null}
              {validationError ? <p className="mt-3 font-redhat text-sm text-ruby" role="alert">{validationError}</p> : null}
            </CheckoutSection>
          ) : null}

          <CheckoutSection legend={c.payment}>
            <div className="grid gap-3">
              {paymentMethods.map((method) => {
                const Icon = method === "gopay" ? CreditCard : method === "cash_on_delivery" ? Banknote : Landmark;

                return (
                  <label key={method} className="rounded-brand border border-line p-4 font-redhat text-sm">
                    <span className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-3">
                        <input checked={paymentMethodId === method} name="payment" onChange={() => setPaymentMethodId(method)} type="radio" />
                        <Icon aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.7} />
                        <span>{paymentLabels[method][locale]}</span>
                      </span>
                      {method === "cash_on_delivery" ? <strong>{formatMoney(getPaymentQuote(method, countryCode).amount, locale, getPaymentQuote(method, countryCode).currency)}</strong> : null}
                    </span>
                    {method === "bank_transfer" ? <span className="mt-2 block pl-[3.75rem] text-muted">{c.bank}</span> : null}
                    {method === "gopay" && enabledGoPayMethods.length ? <span className="mt-2 block pl-[3.75rem] text-muted">{enabledGoPayMethods.map((methodName) => c.methods[methodName as keyof typeof c.methods]).filter(Boolean).join(" · ")}</span> : null}
                    {method === "bank_transfer" ? <span className="mt-2 block pl-[3.75rem] font-semibold">{c.bankAccount}: {company.bankAccount}</span> : null}
                  </label>
                );
              })}
            </div>
          </CheckoutSection>
        </div>

        <aside className="self-start rounded-brand border border-line bg-white p-6 lg:sticky lg:top-28">
          <h2 className="amaree-subtitle">{c.summary}</h2>
          {totals?.lines.length ? <div className="mt-5 grid gap-3">{totals.lines.map((line) => <div className="flex justify-between gap-4 font-redhat text-sm" key={line.product.id}><span>{line.quantity}× {line.product.name[locale]}</span><strong>{formatMoney(line.lineTotal, locale)}</strong></div>)}</div> : <p className="mt-5 font-redhat text-sm text-muted">{domestic ? c.empty : c.euPending}</p>}
          <dl className="mt-5 grid gap-2 border-t border-line pt-5 font-redhat text-sm">
            <SummaryRow label={c.itemSubtotal} value={totals ? formatMoney(totals.subtotal, locale) : c.pricePending} />
            <SummaryRow label={c.discount} value={totals ? `-${formatMoney(totals.discount, locale)}` : "—"} />
            <SummaryRow label={c.shippingPrice} value={totals ? formatMoney(totals.shipping, locale) : formatMoney(getShippingQuote(shippingMethodId, countryCode).amount, locale, getShippingQuote(shippingMethodId, countryCode).currency)} />
            <SummaryRow label={c.paymentFee} value={totals ? formatMoney(totals.paymentFee, locale) : formatMoney(0, locale, "EUR")} />
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>{c.total}</dt><dd>{totals ? formatMoney(totals.total, locale, totals.currency) : c.pricePending}</dd></div>
          </dl>
          <div className="mt-5 grid gap-2 border-t border-line pt-5 font-redhat text-sm text-muted">
            <p><strong className="text-ink">{c.selectedShipping}:</strong> {shippingLabels[shippingMethodId][locale]}</p>
            <p><strong className="text-ink">{c.selectedPayment}:</strong> {paymentLabels[paymentMethodId][locale]}</p>
            {selectedPoint ? <p><strong className="text-ink">{c.selectedPoint}:</strong> {selectedPoint.name}, {selectedPoint.street}, {selectedPoint.city}</p> : null}
          </div>
          <h2 className="amaree-subtitle mt-6">{c.consent}</h2>
          <label className="mt-4 flex gap-3 font-redhat text-sm text-muted"><input checked={termsAccepted} name="terms" onChange={(event) => setTermsAccepted(event.target.checked)} required type="checkbox" />{c.terms}</label>
          <button className="mt-6 w-full rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting || !termsAccepted || !lines.length || (shippingMethodId === "packeta_pickup" && !selectedPoint)} type="submit">{submitting ? c.submitting : submitLabel}</button>
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
