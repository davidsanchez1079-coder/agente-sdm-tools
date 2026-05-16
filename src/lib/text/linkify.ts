export type LinkifyPart =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string };

/** Detecta URLs http(s) y www. en texto plano. */
const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;

export function splitTextWithUrls(text: string): LinkifyPart[] {
  if (!text) return [];
  const parts: LinkifyPart[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    const href = raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
    parts.push({ type: "url", value: raw, href });
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

export function normalizeUrlHref(raw: string): string {
  return raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
}
