/**
 * Correo transaccional de notificaciones in-app (vía webhook → Resend).
 * - Asunto: `GOTIA | {título}` (título = `notifications.title`, sanitizado).
 * - HTML: preheader oculto (snippet), título en H1, bloque "Detalle" si hay body, CTA.
 * - El `actionUrl` debe armarse en la ruta con `NEXT_PUBLIC_APP_URL` (no en este archivo).
 */
type Input = {
  title: string;
  body: string | null;
  actionUrl: string;
};

/**
 * Quita marcadores de prueba / ruido que empujan filtros o previews raros.
 * Los datos reales vienen de `notifications.title` / `body`; esto solo limpia la capa de envío.
 */
export function sanitizeNotificationEmailCopy(value: string): string {
  let s = String(value ?? "");
  // Asteriscos “raros” → * para que fallen patrones tipo ***SPAM***
  s = s.replace(/\u2217/g, "*").replace(/\uFF0A/g, "*");
  s = s
    .replace(/\*{0,5}\s*SPAM\s*\*{0,5}/gi, " ")
    .replace(/\[\s*\*?\s*SPAM\s*\*?\s*\]/gi, " ")
    .replace(/\(\s*SPAM\s*\)/gi, " ")
    .replace(/<\s*spam\s*>/gi, " ")
    .replace(/GOTIAAVISOS2222/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return s;
}

/** Texto corto para preheader (snippet en bandeja); una sola línea, ya saneado. */
function buildNotificationEmailPreheader(
  title: string,
  body: string | null,
  maxLen = 140,
): string {
  const t = sanitizeNotificationEmailCopy(title) || "Notificación";
  const b = body?.trim()
    ? sanitizeNotificationEmailCopy(String(body)).replace(/\s+/g, " ").trim()
    : "";
  const combined = b ? `${t} — ${b}` : t;
  return combined.length <= maxLen
    ? combined
    : `${combined.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Muestra texto multilínea en HTML de forma segura. */
function escapeHtmlWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br/>");
}

export function notificationInAppEmailSubject(title: string): string {
  const t = sanitizeNotificationEmailCopy(title);
  return `GOTIA | ${t || "Notificación"}`;
}

export function renderNotificationInAppEmailHtml(input: Input): string {
  const displayTitle =
    sanitizeNotificationEmailCopy(input.title) || "Notificación";
  const rawBody = input.body != null ? String(input.body) : "";
  const displayBodyNonEmpty =
    rawBody.trim().length > 0
      ? (() => {
          const s = sanitizeNotificationEmailCopy(rawBody);
          return s.length > 0 ? s : null;
        })()
      : null;
  const subject = notificationInAppEmailSubject(input.title);
  const preheader = buildNotificationEmailPreheader(
    input.title,
    displayBodyNonEmpty,
  );

  const detailBlock = displayBodyNonEmpty
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 8px 0;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Detalle</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;">
              <p style="margin:0;font-size:15px;line-height:1.55;color:#0f172a;">${escapeHtmlWithBreaks(displayBodyNonEmpty)}</p>
            </td>
          </tr>
        </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;width:0;height:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:24px 22px;">
          <tr><td>
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;">GOTIA · Alerta</p>
            <h1 style="margin:12px 0 0;font-size:20px;line-height:1.35;color:#0f172a;font-weight:700;">${escapeHtml(displayTitle)}</h1>
            ${detailBlock}
            <p style="margin:24px 0 0;">
              <a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">Abrir en GOTIA</a>
            </p>
            <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#64748b;">Si el botón no funciona, copia y pega este enlace en el navegador:</p>
            <p style="margin:6px 0 0;font-size:12px;word-break:break-all;color:#0f766e;">${escapeHtml(input.actionUrl)}</p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;line-height:1.45;color:#94a3b8;max-width:520px;">Este correo resume una notificación de tu workspace. Para responder o ver el contexto completo, abre GOTIA.</p>
      </td></tr>
  </table>
</body>
</html>`;
}

/** Versión texto plano (mejor entregabilidad junto al HTML). */
export function renderNotificationInAppEmailText(input: Input): string {
  const displayTitle =
    sanitizeNotificationEmailCopy(input.title) || "Notificación";
  const rawBody = input.body != null ? String(input.body) : "";
  const displayBodyNonEmpty =
    rawBody.trim().length > 0
      ? (() => {
          const s = sanitizeNotificationEmailCopy(rawBody);
          return s.length > 0 ? s : null;
        })()
      : null;
  const subject = notificationInAppEmailSubject(input.title);
  const lines: string[] = [subject, "", displayTitle];
  if (displayBodyNonEmpty) {
    lines.push("", "— Detalle —", displayBodyNonEmpty);
  }
  lines.push("", "Abrir en GOTIA:", input.actionUrl, "", "Este mensaje resume una notificación de GOTIA.");
  return lines.join("\n");
}
