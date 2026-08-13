import { NextResponse } from "next/server";
import { ResendProvider } from "@/lib/email/resend";
import { contactMessageSchema, isPlausibleHumanSubmission } from "@/lib/forms/public-forms";

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

export async function POST(request: Request) {
  const parsed = contactMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isPlausibleHumanSubmission(parsed.data.startedAt)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { name, email, orderNumber, message, locale } = parsed.data;
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const orderLine = orderNumber ? `\nČíslo objednávky: ${orderNumber}` : "";

  try {
    const result = await new ResendProvider().sendTransactionalEmail({
      to: "info@amaree.cz",
      replyTo: email,
      subject: `Nový dotaz z webu AMARÉE – ${name}`,
      text: `Jméno: ${name}\nE-mail: ${email}${orderLine}\nJazyk webu: ${locale}\n\n${message}`,
      html: `<!doctype html><html><body style="margin:0;background:#f7f4f3;font-family:Arial,sans-serif;color:#171313"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #eadfe0"><tr><td height="7" bgcolor="#bc2227"></td></tr><tr><td align="center" style="padding:28px 24px 20px"><div style="font-family:Georgia,serif;font-size:29px;letter-spacing:4px;color:#bc2227">AMARÉE</div><div style="margin-top:7px;font-size:9px;letter-spacing:3px;color:#bc2227">EST. 2025</div></td></tr><tr><td style="padding:10px 34px 38px"><h1 style="margin:0;font-family:Georgia,serif;font-size:30px;font-weight:400">Nový dotaz z webu</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:#f8eeee"><tr><td style="padding:18px 20px;font-size:14px;line-height:1.8"><strong>Jméno:</strong> ${escapeHtml(name)}<br><strong>E-mail:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#bc2227">${escapeHtml(email)}</a>${orderNumber ? `<br><strong>Číslo objednávky:</strong> ${escapeHtml(orderNumber)}` : ""}<br><strong>Jazyk webu:</strong> ${locale.toUpperCase()}</td></tr></table><div style="margin-top:24px;padding-top:20px;border-top:1px solid #eadfe0;font-size:15px;line-height:1.75">${safeMessage}</div></td></tr></table></td></tr></table></body></html>`,
      idempotencyKey: `contact/${crypto.randomUUID()}`,
      metadata: { message_type: "contact_form", locale }
    });
    return NextResponse.json({ ok: true, mode: result.mode });
  } catch (error) {
    console.error("contact_form_send_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
