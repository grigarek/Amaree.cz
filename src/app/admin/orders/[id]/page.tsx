import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderActions } from "@/components/admin/order-actions";
import { ShipmentActions } from "@/components/admin/shipment-actions";
import { InternalNote } from "@/components/admin/internal-note";
import { EmailMessageAction } from "@/components/admin/email-message-action";
import { OrderDeleteAction } from "@/components/admin/order-delete-action";
import { FakturoidActions } from "@/components/admin/fakturoid-actions";
import { getAdminOrder, orderStatusLabels } from "@/lib/admin/orders";
import { formatMoney } from "@/lib/money";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getTransactionalEmailUsage } from "@/lib/email/delivery";
import { orderTemplateKeys, type OrderTemplateKey } from "@/lib/orders/statuses";
import { auditActionLabel, emailSourceLabel, emailStatusLabel, emailTemplateLabel, paymentMethodLabel, paymentStatusLabel, shippingMethodLabel } from "@/lib/admin/order-display-labels";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrderAdmin();
  const { id } = await params;
  const [order, emailUsage] = await Promise.all([getAdminOrder(id), getTransactionalEmailUsage()]);
  if (!order) notFound();
  const address = (value: Record<string, string>) => Object.values(value).filter(Boolean).join(", ");
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <Link className="font-redhat text-sm font-semibold text-ruby" href="/admin/orders">
          ← Objednávky
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Objednávka</p>
            <h1 className="mt-2 font-newsreader text-5xl">{order.orderNumber}</h1>
          </div>
          <span className="bg-blush px-3 py-2 font-redhat text-sm font-semibold text-ruby">{orderStatusLabels[order.status]}</span>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-8">
            <section className="border-y border-line py-6">
              <h2 className="font-newsreader text-3xl">Položky</h2>
              <div className="mt-4 divide-y divide-line">
                {order.lines.map((line) => (
                  <div className="grid grid-cols-[1fr_auto] gap-4 py-4 font-redhat text-sm" key={line.id}>
                    <div>
                      <p className="font-semibold">
                        {line.quantity}× {line.name}
                      </p>
                      {line.variant ? <p className="text-muted">{line.variant}</p> : null}
                      <p className="text-xs text-muted">{line.sku}</p>
                    </div>
                    <p className="font-semibold">{formatMoney(line.lineTotalMinor, "cs", order.currency)}</p>
                  </div>
                ))}
              </div>
              <dl className="ml-auto mt-4 grid max-w-sm gap-2 font-redhat text-sm">
                <div className="flex justify-between">
                  <dt>Mezisoučet</dt>
                  <dd>{formatMoney(order.subtotalMinor, "cs", order.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Sleva</dt>
                  <dd>−{formatMoney(order.discountMinor, "cs", order.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Doprava</dt>
                  <dd>{formatMoney(order.shippingMinor, "cs", order.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Platební poplatek</dt>
                  <dd>{formatMoney(order.paymentFeeMinor, "cs", order.currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
                  <dt>Celkem</dt>
                  <dd>{formatMoney(order.totalMinor, "cs", order.currency)}</dd>
                </div>
              </dl>
            </section>
            <OrderActions currentStatus={order.status} orderId={order.id} />
            <section>
              <h2 className="font-newsreader text-3xl">Historie stavů</h2>
              <div className="mt-4 divide-y divide-line border-y border-line">
                {order.history.map((entry) => (
                  <div className="grid gap-2 py-4 font-redhat text-sm md:grid-cols-[10rem_1fr_auto]" key={entry.id}>
                    <span className="font-semibold">{orderStatusLabels[entry.newStatus as keyof typeof orderStatusLabels] ?? entry.newStatus}</span>
                    <span className="text-muted">
                      {entry.note ?? "Bez poznámky"}
                      {entry.emailMessageId ? " · e-mail zaznamenán" : entry.emailRequested ? " · e-mail požadován" : ""}
                    </span>
                    <time className="text-xs text-muted">
                      {new Intl.DateTimeFormat("cs-CZ", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(entry.createdAt))}
                    </time>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-newsreader text-3xl">Komunikace se zákazníkem</h2>
                  <p className="mt-2 font-redhat text-sm text-muted">
                    Odeslané e-maily: dnes {emailUsage.daily} z {emailUsage.dailyLimit}, tento měsíc {emailUsage.monthly} z {emailUsage.monthlyLimit}. Na odeslání čeká {emailUsage.queued}.
                  </p>
                </div>
                {emailUsage.daily >= emailUsage.dailyLimit || emailUsage.monthly >= emailUsage.monthlyLimit ? <strong className="bg-blush px-3 py-2 font-redhat text-xs text-ruby">Dosažen interní limit, zprávy zůstávají ve frontě.</strong> : null}
              </div>
              <div className="mt-4 divide-y divide-line border-y border-line">
                {order.emails.map((email) => {
                  const validTemplate = orderTemplateKeys.includes(email.templateKey as OrderTemplateKey) ? (email.templateKey as OrderTemplateKey) : null;
                  return (
                    <details className="py-4 font-redhat text-sm" key={email.id}>
                      <summary className="grid cursor-pointer gap-2 md:grid-cols-[1fr_auto]">
                        <div>
                          <p className="font-semibold">{email.subject}</p>
                          <p className="text-xs text-muted">
                            Příjemce: {email.recipient} · {emailTemplateLabel(email.templateKey)}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Vytvořeno{" "}
                            {new Intl.DateTimeFormat("cs-CZ", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(email.createdAt))}
                            {email.sentAt ? ` · odesláno ${new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(email.sentAt))}` : ""} · {emailSourceLabel(email.triggerSource)} · počet pokusů: {email.attemptCount}
                          </p>
                          {email.errorMessage ? <p className="mt-1 text-xs font-semibold text-ruby">{email.errorMessage}</p> : null}
                        </div>
                        <span className="text-xs font-semibold text-ruby">{emailStatusLabel(email.status)}</span>
                      </summary>
                      <div className="mt-4 grid gap-4">
                        <div>
                          <h3 className="text-xs font-semibold uppercase text-ruby">Textová verze</h3>
                          <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{email.text}</pre>
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase text-ruby">HTML náhled</h3>
                          <iframe className="mt-2 min-h-96 w-full border border-line bg-white" sandbox="" srcDoc={email.html} title={`Uložený e-mail ${email.subject}`} />
                        </div>
                        {validTemplate ? <EmailMessageAction failed={email.status === "failed" || email.status === "queued"} messageId={email.id} orderId={order.id} template={validTemplate} /> : null}
                      </div>
                    </details>
                  );
                })}
                {!order.emails.length ? <p className="py-4 font-redhat text-sm text-muted">Zatím nebyl zaznamenán žádný e-mail.</p> : null}
              </div>
            </section>
            <details className="border-y border-line py-4">
              <summary className="cursor-pointer font-redhat text-sm font-semibold text-muted">
                Historie změn
              </summary>
              <p className="mt-2 font-redhat text-xs leading-5 text-muted">
                Interní záznam změn objednávky. Slouží pouze k dohledání, co upravil správce nebo systém.
              </p>
              <div className="mt-3 divide-y divide-line border-t border-line">
                {order.audit.map((entry) => (
                  <div className="grid gap-2 py-4 font-redhat text-sm md:grid-cols-[10rem_1fr_auto]" key={entry.id}>
                    <span className="font-semibold">{auditActionLabel(entry.action)}</span>
                    <span className="text-muted">{entry.actorUserId ? "Upravil správce" : "Automatická změna systému"}</span>
                    <time className="text-xs text-muted">
                      {new Intl.DateTimeFormat("cs-CZ", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(entry.createdAt))}
                    </time>
                  </div>
                ))}
                {!order.audit.length ? <p className="py-4 font-redhat text-sm text-muted">Zatím bez zaznamenaných změn.</p> : null}
              </div>
            </details>
          </div>

          <aside className="space-y-7 font-redhat text-sm">
            <section className="border border-line bg-white p-5">
              <h2 className="font-newsreader text-2xl">Fakturace</h2>
              {order.accountingDocument ? (
                <dl className="mt-4 grid gap-2">
                  <div><dt className="font-semibold">Stav</dt><dd className="text-muted">{{ pending: "Čeká", creating: "Vytváří se", created: "Vytvořená", sent: "Odeslaná", failed: "Chyba", cancelled: "Zrušená" }[order.accountingDocument.status] ?? order.accountingDocument.status}</dd></div>
                  <div><dt className="font-semibold">Číslo faktury</dt><dd className="text-muted">{order.accountingDocument.documentNumber ?? "zatím nepřiděleno"}</dd></div>
                  {order.accountingDocument.variableSymbol ? <div><dt className="font-semibold">Variabilní symbol</dt><dd className="text-muted">{order.accountingDocument.variableSymbol}</dd></div> : null}
                  {order.accountingDocument.htmlUrl ? <a className="mt-2 font-semibold text-ruby" href={order.accountingDocument.htmlUrl} rel="noreferrer" target="_blank">Otevřít ve Fakturoidu</a> : null}
                  {order.accountingDocument.errorMessage ? <p className="mt-2 text-xs font-semibold leading-5 text-ruby">Poslední chyba: {order.accountingDocument.errorMessage}</p> : null}
                </dl>
              ) : <p className="mt-4 text-muted">Faktura zatím nebyla vytvořena.</p>}
              <FakturoidActions hasDocument={Boolean(order.accountingDocument?.documentNumber)} orderId={order.id} wasSent={order.accountingDocument?.status === "sent"} />
            </section>
            <section className="border border-line bg-white p-5">
              <h2 className="font-newsreader text-2xl">Zákazník</h2>
              <p className="mt-4 font-semibold">{order.customer}</p>
              <a className="mt-1 block text-ruby" href={`mailto:${order.email}`}>
                {order.email}
              </a>
              {order.phone ? (
                <a className="mt-1 block" href={`tel:${order.phone}`}>
                  {order.phone}
                </a>
              ) : null}
              <p className="mt-4 text-muted">Doručení: {address(order.shippingAddress)}</p>
              <p className="mt-2 text-muted">Fakturace: {address(order.billingAddress)}</p>
            </section>
            <section className="border border-line bg-white p-5">
              <h2 className="font-newsreader text-2xl">Platba a doprava</h2>
              <dl className="mt-4 grid gap-2">
                <div>
                  <dt className="font-semibold">Platba</dt>
                  <dd className="text-muted">
                    {paymentMethodLabel(order.paymentMethod)} · {paymentStatusLabel(order.paymentStatus)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Doprava</dt>
                  <dd className="text-muted">{shippingMethodLabel(order.shippingMethod)}</dd>
                </div>
                {order.packetaPoint.id ? (
                  <div>
                    <dt className="font-semibold">Výdejní místo</dt>
                    <dd className="text-muted">
                      {order.packetaPoint.name} ({order.packetaPoint.id})
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
            <section className="border border-line bg-white p-5">
              <h2 className="font-newsreader text-2xl">Souhlas s podmínkami</h2>
              {order.termsAcceptedAt ? (
                <dl className="mt-4 grid gap-2">
                  <div>
                    <dt className="font-semibold">Odsouhlaseno</dt>
                    <dd className="text-muted">
                      {new Intl.DateTimeFormat("cs-CZ", { dateStyle: "long", timeStyle: "short" }).format(new Date(order.termsAcceptedAt))}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Verze obchodních podmínek</dt>
                    <dd className="text-muted">{order.termsVersion ?? "neuvedena"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Uložený obsah</dt>
                    <dd className="text-muted">{order.termsSnapshot ? "ano, přesný snapshot je uložen u objednávky" : "chybí"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-muted">Historická objednávka bez uloženého souhlasu.</p>
              )}
            </section>
            <section className="border border-line bg-white p-5">
              <h2 className="font-newsreader text-2xl">Sledování zásilky</h2>
              {order.shipment ? (
                <dl className="mt-4 grid gap-2">
                  <div>
                    <dt className="font-semibold">ID zásilky v Zásilkovně</dt>
                    <dd className="text-muted">{order.shipment.providerPacketId ?? "čeká"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Odkaz pro sledování</dt>
                    <dd>
                      {order.shipment.trackingUrl ? (
                        <a className="text-ruby" href={order.shipment.trackingUrl} rel="noreferrer" target="_blank">
                          {order.shipment.trackingNumber}
                        </a>
                      ) : (
                        "zatím není"
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-muted">Zásilka zatím nebyla vytvořena.</p>
              )}
              <ShipmentActions hasPacket={Boolean(order.shipment?.providerPacketId)} hasTracking={Boolean(order.shipment?.trackingNumber && order.shipment?.trackingUrl)} isPacketa={order.shippingMethod.startsWith("packeta_")} isShipped={order.status === "shipped"} orderId={order.id} />
            </section>
            <section className="border border-line bg-white p-5">
              <h2 className="font-newsreader text-2xl">Poznámky</h2>
              <p className="mt-4">
                <strong>Zákazník:</strong> {order.customerNote ?? "bez poznámky"}
              </p>
              <InternalNote initialValue={order.internalNote ?? ""} orderId={order.id} />
            </section>
            <section className="border border-ruby/40 bg-blush/40 p-5">
              <h2 className="font-newsreader text-2xl">Nebezpečná zóna</h2>
              <p className="mt-3 text-xs leading-5 text-muted">
                Trvale odstranit lze pouze zrušenou testovací nebo chybnou objednávku bez dokončené platby, pohybu skladu, zásilky či reklamace.
              </p>
              <div className="mt-4">
                <OrderDeleteAction canDelete={order.status === "cancelled"} orderId={order.id} orderNumber={order.orderNumber} />
              </div>
            </section>
          </aside>
        </div>
      </main>
    </AdminShell>
  );
}
