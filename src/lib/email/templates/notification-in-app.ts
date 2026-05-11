type Input = {
  title: string;
  body: string | null;
  actionUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderNotificationInAppEmailHtml(input: Input): string {
  const subject = `GOTIA — ${input.title}`;
  const bodyBlock = input.body
    ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#334155;">${escapeHtml(input.body)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:24px 20px;">
          <tr><td>
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">GOTIA · Notificación</p>
            <h1 style="margin:10px 0 0;font-size:18px;line-height:1.35;color:#0f172a;">${escapeHtml(input.title)}</h1>
            ${bodyBlock}
            <p style="margin:24px 0 0;">
              <a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#10b981;color:#042f2e;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px;">Abrir en GOTIA</a>
            </p>
            <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#64748b;">Si el botón no funciona, copia y pega este enlace en el navegador:</p>
            <p style="margin:6px 0 0;font-size:12px;word-break:break-all;color:#0f766e;">${escapeHtml(input.actionUrl)}</p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">Este correo es informativo. Responde en GOTIA si necesitas dar seguimiento.</p>
      </td></tr>
  </table>
</body>
</html>`;
}

export function notificationInAppEmailSubject(title: string): string {
  return `GOTIA — ${title}`;
}
