import type { Locale } from "@/i18n/routing";

const copy = {
  cs: "Bezpečné platby zajišťuje GoPay",
  sk: "Bezpečné platby zabezpečuje GoPay",
  en: "Secure payments by GoPay",
  de: "Sichere Zahlungen über GoPay"
} as const;

export function PaymentTrustMarks({ locale }: { locale: Locale }) {
  const label = copy[locale];

  return (
    <div aria-label={label} className="mt-6 inline-flex flex-col items-start gap-2">
      <p className="font-redhat text-[11px] font-semibold text-muted">{label}</p>
      <a
        aria-label="GoPay"
        className="inline-block transition-opacity hover:opacity-70"
        href="https://www.gopay.com/cs/"
        rel="noreferrer"
        target="_blank"
      >
        <span
          aria-hidden="true"
          className="block h-[23px] w-[98px] bg-ruby"
          style={{
            WebkitMask: "url('/payment-methods/gopay.png') center / contain no-repeat",
            mask: "url('/payment-methods/gopay.png') center / contain no-repeat"
          }}
        />
      </a>
    </div>
  );
}
