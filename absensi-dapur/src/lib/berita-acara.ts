// Helper bersama untuk fitur Berita Acara akuntan tersimpan.
// `sanitizeBaHtml` membersihkan HTML dokumen (hasil serialisasi contentEditable
// milik kita sendiri) sebelum disimpan & sebelum di-render ulang via
// dangerouslySetInnerHTML, sebagai lapisan pertahanan terhadap XSS.

// Buang elemen berbahaya beserta isinya.
const DANGEROUS_TAGS = /<(script|style|iframe|object|embed|link|meta|base)\b[^>]*>[\s\S]*?<\/\1>/gi;
// Buang tag pembuka berbahaya yang tidak berpasangan (mis. <script src=...>).
const DANGEROUS_SELF = /<(script|style|iframe|object|embed|link|meta|base)\b[^>]*\/?>/gi;
// Buang atribut event handler inline: on*="..." / on*='...' / on*=nilai.
const EVENT_ATTR = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// Buang skema javascript: pada href/src.
const JS_URI = /(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*/gi;

export function sanitizeBaHtml(html: string): string {
  return String(html ?? "")
    .replace(DANGEROUS_TAGS, "")
    .replace(DANGEROUS_SELF, "")
    .replace(EVENT_ATTR, "")
    .replace(JS_URI, "$1=#");
}
