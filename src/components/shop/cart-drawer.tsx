"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, LoaderCircle, TicketPercent, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { localizedPaths, type Locale } from "@/i18n/routing";
import { calculateOrderTotal } from "@/lib/cart";
import { commerceConfig } from "@/lib/commerce/config";
import { formatMoney } from "@/lib/money";
import { useCartStore } from "@/store/cart-store";
import { GiftCardSelector } from "@/components/shop/gift-card-selector";

export function CartDrawer({ locale }: { locale: Locale }) {
  const t = useTranslations("cart");
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const { isOpen, close, lines, setQuantity, removeItem, giftCardDesignId, setGiftCardDesign, discountCode, discountAmount, discountFreeShipping, discountMessage, discountValid, setDiscountCode, setDiscountResult, clearDiscount } = useCartStore();
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const countryCode = locale === "sk" ? "SK" : "CZ";
  const currency = locale === "sk" ? "EUR" : "CZK";
  const totals = calculateOrderTotal(lines, discountCode, { countryCode, shippingMethodId: "packeta_pickup", paymentMethodId: "gopay", discountAmount, freeShipping: discountFreeShipping, giftCardDesignId });
  const freeLeft = countryCode === "CZ" ? Math.max(commerceConfig.freeShipping.threshold - (totals.productSubtotal - totals.discount), 0) : 0;

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      close();
      previousPathname.current = pathname;
    }
  }, [close, pathname]);

  async function applyDiscount() {
    if (!discountCode.trim() || !lines.length) return;
    setCheckingDiscount(true);
    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode, currency, locale, lines: lines.map(({ productId, quantity }) => ({ productId, quantity })) })
      });
      const result = await response.json() as { valid?: boolean; amountMinor?: number; freeShipping?: boolean; message?: string; error?: string };
      setDiscountResult(response.ok && result.valid ? result.amountMinor ?? 0 : 0, result.message ?? result.error ?? t("couponError"), Boolean(response.ok && result.valid), Boolean(response.ok && result.valid && result.freeShipping));
    } catch { setDiscountResult(0, t("couponError"), false); }
    finally { setCheckingDiscount(false); }
  }

  return (
    <aside
      aria-hidden={!isOpen}
      aria-labelledby="cart-drawer-title"
      aria-modal="true"
      inert={!isOpen}
      role="dialog"
      className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform border-l border-line bg-white shadow-soft transition md:w-[420px] ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="amaree-h3" id="cart-drawer-title">{t("title")}</h2>
          <button aria-label={t("close")} className="rounded-brand border border-line p-2" onClick={close} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {totals.lines.length === 0 ? (
            <p className="amaree-body">{t("empty")}</p>
          ) : (
            <div className="grid gap-5">
              <GiftCardSelector locale={locale} onSelect={setGiftCardDesign} selectedId={giftCardDesignId} />
              {totals.lines.map((line) => (
                <div key={line.product.id} className="grid grid-cols-[84px_1fr] gap-4">
                  <div className="relative aspect-square overflow-hidden rounded-brand bg-blush">
                    <Image src={line.product.images[0].url} alt={line.product.images[0].alt[locale]} fill sizes="84px" className="object-cover" />
                  </div>
                  <div>
                    <div className="flex justify-between gap-3">
                      <p className="font-newsreader text-xl">{line.product.name[locale]}</p>
                      <button className="font-redhat text-xs font-semibold text-ruby" onClick={() => removeItem(line.product.id)} type="button">
                        {t("remove")}
                      </button>
                    </div>
                    <p className="mt-1 font-redhat text-sm font-semibold">{formatMoney(line.lineTotal, locale, line.product.currency)}</p>
                    <input
                      aria-label={t("quantity")}
                      className="mt-3 w-20 rounded-brand border border-line px-3 py-2"
                      min={1}
                      max={line.product.stockQuantity}
                      type="number"
                      value={line.quantity}
                      onChange={(event) => setQuantity(line.product.id, Number(event.target.value))}
                    />
                  </div>
                </div>
              ))}
              <section aria-labelledby="cart-discount-title" className="border-t border-line pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-redhat text-sm font-semibold" id="cart-discount-title">
                    <TicketPercent aria-hidden="true" className="text-ruby" size={18} />
                    {t("coupon")}
                  </h3>
                  {discountValid ? (
                    <button className="inline-flex items-center gap-1.5 font-redhat text-xs font-semibold text-muted transition hover:text-ruby" onClick={() => { clearDiscount(); setDiscountCode(""); }} type="button">
                      <Trash2 aria-hidden="true" size={15} /> {t("removeCoupon")}
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    {discountValid ? <Check aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700" size={18} /> : <TicketPercent aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />}
                    <input aria-label={t("coupon")} autoCapitalize="characters" autoComplete="off" className="w-full rounded-brand border border-line py-3 pl-10 pr-3 font-mono uppercase" disabled={discountValid} id="discount-code" name="discountCode" placeholder={t("couponPlaceholder")} value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void applyDiscount(); } }} />
                  </div>
                  <button className="min-w-24 rounded-brand border border-ruby px-4 font-redhat text-sm font-semibold text-ruby transition hover:bg-ruby hover:text-white disabled:opacity-50" disabled={checkingDiscount || discountValid || !discountCode.trim() || !lines.length} onClick={() => void applyDiscount()} type="button">{checkingDiscount ? <LoaderCircle aria-label={t("checkingCoupon")} className="mx-auto animate-spin" size={18} /> : t("applyCoupon")}</button>
                </div>
                {discountMessage ? <p className={`mt-2 font-redhat text-xs font-semibold ${discountValid ? "text-emerald-700" : "text-red-700"}`} role="status">{discountMessage}</p> : null}
              </section>
            </div>
          )}
        </div>
        <div className="border-t border-line p-5">
          {countryCode === "CZ" ? <p className="mt-4 font-redhat text-sm text-muted">
            {freeLeft > 0 ? t("freeShippingLeft", { amount: formatMoney(freeLeft, locale, currency) }) : t("freeShippingReached")}
          </p> : <p className="mt-4 font-redhat text-sm text-muted">{t("slovakiaShipping")}</p>}
          <dl className="mt-4 grid gap-2 font-redhat text-sm">
            <div className="flex justify-between">
              <dt>{t("subtotal")}</dt>
              <dd>{formatMoney(totals.subtotal, locale, totals.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("discount")}</dt>
              <dd>-{formatMoney(totals.discount, locale, totals.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("shipping")}</dt>
              <dd>{formatMoney(totals.shipping, locale, totals.currency)}</dd>
            </div>
            {totals.paymentFee > 0 ? (
              <div className="flex justify-between">
                <dt>{t("paymentFee")}</dt>
                <dd>{formatMoney(totals.paymentFee, locale, totals.currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>{t("total")}</dt>
              <dd>{formatMoney(totals.total, locale, totals.currency)}</dd>
            </div>
          </dl>
          {totals.lines.length > 0 ? (
            <Link
              href={localizedPaths[locale].checkout}
              onClick={close}
              className="mt-5 block rounded-brand bg-ruby px-5 py-3 text-center font-redhat text-sm font-semibold text-white"
            >
              {t("checkout")}
            </Link>
          ) : (
            <span aria-disabled="true" className="mt-5 block cursor-not-allowed rounded-brand bg-ruby px-5 py-3 text-center font-redhat text-sm font-semibold text-white opacity-50">
              {t("checkout")}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
