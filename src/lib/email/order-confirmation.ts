import { paymentLabels, shippingLabels } from "@/lib/commerce/config";
import { company, companyAddressLines } from "@/lib/config/company";
import type { OrderEmailInput } from "./provider";

export function buildOrderConfirmationText(input: OrderEmailInput): string {
  const lines = [
    `AMARÉE – objednávka ${input.orderNumber}`,
    "",
    `Celkem: ${input.total} ${input.currency}`,
    `Doprava: ${shippingLabels[input.shippingMethodId][input.locale]}`,
    `Platba: ${paymentLabels[input.paymentMethodId][input.locale]}`
  ];

  if (input.paymentMethodId === "bank_transfer") {
    if (!input.variableSymbol || !input.bankTransferDueDate) throw new Error("bank_transfer_details_missing");
    lines.push(
      "",
      "Objednávka bude odeslána až po přijetí platby.",
      `Číslo účtu: ${company.bankAccount}`,
      `Variabilní symbol: ${input.variableSymbol}`,
      `Splatnost: ${input.bankTransferDueDate}`
    );
  }

  lines.push(
    "",
    "Adresa pro odstoupení, vrácení a reklamace:",
    ...companyAddressLines,
    "",
    `${company.email} | ${company.phone}`,
    `${company.legalName}, IČO ${company.companyId}, společnost není plátcem DPH.`,
    `Zápis: ${company.registerEntry}`
  );

  return lines.join("\n");
}
