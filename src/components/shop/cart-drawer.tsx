"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { localizedPaths, type Locale } from "@/i18n/routing";
import { calculateOrderTotal } from "@/lib/cart";
import { commerceConfig } from "@/lib/commerce/config";
import { formatMoney } from "@/lib/money";
import { useCartStore } from "@/store/cart-store";

export function CartDrawer({ locale }: { locale: Locale }) {
  const t = useTranslations("cart");
  const { isOpen, close, lines, setQuantity, removeItem, discountCode, setDiscountCode } = useCartStore();
  const totals = calculateOrderTotal(lines, discountCode);
  const freeLeft = Math.max(commerceConfig.freeShipping.threshold - (totals.subtotal - totals.discount), 0);

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
                    <p className="mt-1 font-redhat text-sm font-semibold">{formatMoney(line.lineTotal, locale)}</p>
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
            </div>
          )}
        </div>
        <div className="border-t border-line p-5">
          <label className="amaree-ui text-muted" htmlFor="discount-code">
            {t("coupon")}
          </label>
          <input
            id="discount-code"
            name="discountCode"
            className="mt-2 w-full rounded-brand border border-line px-3 py-3"
            value={discountCode}
            onChange={(event) => setDiscountCode(event.target.value)}
          />
          <p className="mt-4 font-redhat text-sm text-muted">
            {freeLeft > 0 ? t("freeShippingLeft", { amount: formatMoney(freeLeft, locale) }) : t("freeShippingReached")}
          </p>
          <dl className="mt-4 grid gap-2 font-redhat text-sm">
            <div className="flex justify-between">
              <dt>{t("subtotal")}</dt>
              <dd>{formatMoney(totals.subtotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("discount")}</dt>
              <dd>-{formatMoney(totals.discount, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("shipping")}</dt>
              <dd>{formatMoney(totals.shipping, locale)}</dd>
            </div>
            {totals.paymentFee > 0 ? (
              <div className="flex justify-between">
                <dt>{t("paymentFee")}</dt>
                <dd>{formatMoney(totals.paymentFee, locale)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>{t("total")}</dt>
              <dd>{formatMoney(totals.total, locale)}</dd>
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
