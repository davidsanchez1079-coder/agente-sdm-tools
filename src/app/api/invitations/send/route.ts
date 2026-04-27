import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderInvitationEmail } from "@/lib/email/templates/invitation";

type Body = {
  memberId?: unknown;
};

type MemberRow = {
  id: string;
  workspace_id: string;
  email: string;
  rol: "gerente" | "interno" | "externo";
  invitation_token: string | null;
  invitation_expires_at: string | null;
  joined_at: string | null;
  invited_by: string | null;
};

type InviterRow = {
  nombre: string;
  apellido: string | null;
  email: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function resolveBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Fallback: derive from request headers (Vercel sets x-forwarded-host).
  const proto =
    request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body inválido.", 400);
  }

  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) return jsonError("memberId requerido.", 400);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return jsonError(
      "Servicio de email sin configurar (falta RESEND_API_KEY).",
      503,
    );
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) {
    return jsonError(
      "Servicio de email sin configurar (falta RESEND_FROM_EMAIL).",
      503,
    );
  }
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "GOTIA";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError("Supabase no configurado.", 503);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonError("Sin sesión.", 401);

  // Cliente con sesión del caller. RLS asegura que solo gerentes del
  // workspace puedan SELECT esta fila de workspace_members. Si el caller
  // no es gerente, el SELECT devuelve null y rechazamos.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: member, error: memberErr } = await supabase
    .from("workspace_members")
    .select(
      "id, workspace_id, email, rol, invitation_token, invitation_expires_at, joined_at, invited_by",
    )
    .eq("id", memberId)
    .maybeSingle<MemberRow>();

  if (memberErr) return jsonError(memberErr.message, 500);
  if (!member) {
    return jsonError(
      "No se encontró la invitación o no tienes permiso para enviarla.",
      404,
    );
  }

  if (member.joined_at) {
    return jsonError(
      "Esta persona ya aceptó su invitación; no se vuelve a mandar.",
      400,
    );
  }
  if (!member.invitation_token) {
    return jsonError(
      "Esta invitación no tiene token activo. Regenera el link primero.",
      400,
    );
  }

  // Datos del invitador para personalizar el email (opcional).
  let invitedByName: string | null = null;
  let invitedByEmail: string | null = null;
  if (member.invited_by) {
    const { data: inviter } = await supabase
      .from("users")
      .select("nombre, apellido, email")
      .eq("id", member.invited_by)
      .maybeSingle<InviterRow>();
    if (inviter) {
      const fullName = [inviter.nombre, inviter.apellido]
        .filter(Boolean)
        .join(" ")
        .trim();
      invitedByName = fullName || null;
      invitedByEmail = inviter.email;
    }
  }

  // Marcas asignadas si externo.
  let brandIds: string[] = [];
  if (member.rol === "externo") {
    const { data: brands } = await supabase
      .from("workspace_member_brands")
      .select("brand_id")
      .eq("member_id", member.id)
      .returns<{ brand_id: string }[]>();
    brandIds = (brands ?? []).map((b) => b.brand_id);
  }

  const baseUrl = resolveBaseUrl(request);
  const link = `${baseUrl}/invitacion/${member.invitation_token}`;

  const { subject, html, text } = renderInvitationEmail({
    recipientEmail: member.email,
    rol: member.rol,
    brandIds,
    link,
    expiresAt: member.invitation_expires_at,
    invitedByName,
    invitedByEmail,
  });

  const resend = new Resend(apiKey);
  const sendRes = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: member.email,
    subject,
    html,
    text,
  });

  if (sendRes.error) {
    return jsonError(
      `Resend: ${sendRes.error.message ?? "no se pudo enviar el correo"}`,
      502,
    );
  }

  return NextResponse.json({
    sent: true,
    to: member.email,
    providerMessageId: sendRes.data?.id ?? null,
  });
}
