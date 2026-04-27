import { BRANDS } from "@/lib/brands/brands";

type InvitationEmailInput = {
  recipientEmail: string;
  rol: "gerente" | "interno" | "externo";
  brandIds?: string[];
  link: string;
  expiresAt: string | null;
  invitedByName?: string | null;
  invitedByEmail?: string | null;
};

const ROL_LABEL: Record<InvitationEmailInput["rol"], string> = {
  gerente: "Gerente",
  interno: "Interno",
  externo: "Externo",
};

const ROL_DESC: Record<InvitationEmailInput["rol"], string> = {
  gerente:
    "Verás todo el workspace y podrás administrar accesos, clientes, casos y agentes.",
  interno:
    "Verás los casos que tú crees y los que otros miembros te compartan explícitamente.",
  externo:
    "Verás solo casos relacionados con las marcas que te asignaron.",
};

const FECHA_FMT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatExpires(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return FECHA_FMT.format(new Date(iso));
  } catch {
    return null;
  }
}

function brandLabel(id: string): string {
  return BRANDS.find((b) => b.id === id)?.label ?? id;
}

export function renderInvitationEmail(input: InvitationEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const expiresLine = formatExpires(input.expiresAt);
  const invitedBy =
    input.invitedByName?.trim() || input.invitedByEmail || "El equipo";
  const brandsLabel =
    input.rol === "externo" && input.brandIds && input.brandIds.length > 0
      ? input.brandIds.map(brandLabel).join(", ")
      : null;

  const subject = "Te invitaron a GOTIA — workspace de Sadama y Amadeus";

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f1f5f9;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:32px 32px 24px 32px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;color:#0e7490;">
                  GOTIA · Invitación
                </p>
                <h1 style="margin:0;font-size:24px;line-height:1.3;color:#0f172a;">
                  Te invitaron al workspace
                </h1>
                <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#475569;">
                  Gestión de Oportunidades y Soporte Técnico con Inteligencia Artificial
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#0f172a;">
                  ${escapeHtml(invitedBy)} te invitó como
                  <strong>${ROL_LABEL[input.rol]}</strong> al workspace de GOTIA.
                </p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#475569;">
                  ${escapeHtml(ROL_DESC[input.rol])}
                </p>
                ${
                  brandsLabel
                    ? `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#475569;">
                  <strong>Marcas asignadas:</strong> ${escapeHtml(brandsLabel)}
                </p>`
                    : ""
                }
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:16px 0;">
                  <tr>
                    <td style="padding:12px 16px;">
                      <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;color:#64748b;">
                        Correo invitado
                      </p>
                      <p style="margin:4px 0 0 0;font-size:14px;color:#0f172a;font-family:'SFMono-Regular',Consolas,monospace;">
                        ${escapeHtml(input.recipientEmail)}
                      </p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(input.link)}"
                         style="display:inline-block;background:#0e7490;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;">
                        Aceptar invitación
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:#64748b;">
                  Si el botón no funciona, copia este link en tu navegador:<br/>
                  <a href="${escapeHtml(input.link)}" style="color:#0e7490;word-break:break-all;">${escapeHtml(input.link)}</a>
                </p>
                ${
                  expiresLine
                    ? `<p style="margin:16px 0 0 0;font-size:12px;color:#64748b;">
                  Este link expira el ${escapeHtml(expiresLine)}.
                </p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                  Si no esperabas esta invitación, ignora este correo.<br/>
                  — GOTIA, equipo de Sadama y Amadeus
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textParts = [
    `GOTIA · Invitación`,
    ``,
    `${invitedBy} te invitó como ${ROL_LABEL[input.rol]} al workspace de GOTIA.`,
    ROL_DESC[input.rol],
  ];
  if (brandsLabel) textParts.push(`Marcas asignadas: ${brandsLabel}`);
  textParts.push(``);
  textParts.push(`Correo invitado: ${input.recipientEmail}`);
  textParts.push(``);
  textParts.push(`Aceptar invitación:`);
  textParts.push(input.link);
  if (expiresLine) {
    textParts.push(``);
    textParts.push(`Este link expira el ${expiresLine}.`);
  }
  textParts.push(``);
  textParts.push(`Si no esperabas esta invitación, ignora este correo.`);
  textParts.push(`— GOTIA, equipo de Sadama y Amadeus`);

  return { subject, html, text: textParts.join("\n") };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
