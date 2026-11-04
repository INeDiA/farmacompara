// Post-build step: write one static HTML file per indexable route.
//
// GitHub Pages has no SPA fallback that returns 200: any URL without a matching
// file is answered with HTTP 404 (public/404.html is served as the body). Browsers
// recover through the redirect trick, but Googlebot looks at the status code and
// drops the page — which is why only the home was indexed.
//
// For every principio attivo (/cerca/<slug>) and for /principi-attivi we copy the
// built dist/index.html to <route>.html — GitHub Pages serves /cerca/foo from
// cerca/foo.html with a 200 and no trailing-slash redirect — with the route's own
// <title>, description, canonical, Open Graph tags and an h1 + intro inside #root.
// React replaces #root on mount (createRoot, not hydrate), so nothing else changes.
//
// The texts below must stay identical to the ones set at runtime in
// src/pages/Search.tsx and src/pages/PrincipiAttivi.tsx.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SITE = "https://farmacompara.it";

const template = readFileSync(join(DIST, "index.html"), "utf8");

// ---------- Source of truth: the molecule list used by the app ----------

const listSource = readFileSync(join(ROOT, "src/lib/principiAttivi.ts"), "utf8");
if (!listSource.includes("encodeURIComponent(name.toLowerCase())")) {
  throw new Error("prerender: toSlug() in src/lib/principiAttivi.ts changed — update scripts/prerender.mjs");
}
const block = listSource.match(/export const ALL_PRINCIPI_ATTIVI = \[([\s\S]*?)\];/);
if (!block) throw new Error("prerender: ALL_PRINCIPI_ATTIVI not found in src/lib/principiAttivi.ts");
const molecules = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
if (molecules.length === 0) throw new Error("prerender: ALL_PRINCIPI_ATTIVI is empty");

const toSlug = (name) => encodeURIComponent(name.toLowerCase());

// ---------- Helpers ----------

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function replaceOnce(html, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error(`prerender: ${pattern} not found in dist/index.html — did the template change?`);
  }
  return html.replace(pattern, () => replacement);
}

// Replace the content of <div id="root">…</div>, matching nested divs by depth.
function replaceRootContent(html, inner) {
  const open = '<div id="root">';
  const start = html.indexOf(open);
  if (start === -1) throw new Error('prerender: <div id="root"> not found in dist/index.html');
  const contentStart = start + open.length;
  const tokens = /<div\b|<\/div>/g;
  tokens.lastIndex = contentStart;
  let depth = 1;
  let m;
  while ((m = tokens.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return html.slice(0, contentStart) + inner + html.slice(m.index);
  }
  throw new Error('prerender: unbalanced <div id="root"> in dist/index.html');
}

function render({ title, description, url, body }) {
  let html = template;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = replaceOnce(html, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}">`);
  html = replaceOnce(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}" />`);
  html = replaceOnce(html, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(description)}" />`);
  html = replaceOnce(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`);
  html = replaceOnce(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(title)}">`);
  html = replaceOnce(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(description)}">`);
  html = replaceOnce(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`);
  return replaceRootContent(html, body);
}

// Same look as the loading placeholder in index.html, so there is no visual jump
// before the app mounts.
function shell(inner) {
  return (
    '<main style="min-height:100vh;background:#f5faf7;font-family:system-ui,sans-serif;padding:3rem 1.5rem;box-sizing:border-box">' +
    '<div style="max-width:42rem;margin:0 auto;text-align:center">' +
    '<div style="font-size:1.25rem;font-weight:700;color:#1a7a4a">FarmaCompara</div>' +
    inner +
    "</div></main>"
  );
}

function write(routePath, html) {
  const file = join(DIST, `${routePath}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ---------- /cerca/<principio attivo> ----------

const generated = [];
for (const name of molecules) {
  const lower = name.toLowerCase();
  const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
  const slug = toSlug(name);

  const html = render({
    title: `${capitalized} — prezzo al grammo | FarmaCompara`,
    description: `Confronta il prezzo al grammo di ${capitalized} tra farmacie online italiane. Trova la confezione più conveniente.`,
    url: `${SITE}/cerca/${slug}`,
    body: shell(
      `<h1 style="font-size:1.75rem;line-height:1.2;margin:1.5rem 0 .75rem;color:#0f2a1c">${esc(capitalized)}: prezzo al grammo di principio attivo</h1>` +
        `<p style="color:#4a7a5a;margin:0">Confronta il costo normalizzato per grammo di ${esc(capitalized)} tra farmacie online italiane. Stessa molecola, confezioni diverse: trova quella che conviene.</p>` +
        `<p style="margin-top:1.5rem"><a href="/principi-attivi" style="color:#1a7a4a">Tutti i principi attivi</a></p>`,
    ),
  });
  // File name is the decoded slug: GitHub Pages decodes %20 before the lookup.
  write(`cerca/${lower}`, html);
  generated.push(slug);
}

// ---------- /principi-attivi ----------

const sorted = [...molecules].sort((a, b) => a.localeCompare(b, "it"));
const items = sorted
  .map((n) => `<li style="margin:.35rem 0"><a href="/cerca/${toSlug(n)}" style="color:#1a7a4a">${esc(n)}</a></li>`)
  .join("");

write(
  "principi-attivi",
  render({
    title: "Principi attivi — prezzo al grammo | FarmaCompara",
    description: "Elenco completo dei principi attivi. Confronta il costo al grammo di ogni molecola tra farmacie online italiane.",
    url: `${SITE}/principi-attivi`,
    body: shell(
      `<h1 style="font-size:1.75rem;line-height:1.2;margin:1.5rem 0 .75rem;color:#0f2a1c">Tutti i principi attivi</h1>` +
        `<p style="color:#4a7a5a;margin:0">Confronta il costo al grammo di principio attivo tra farmacie online italiane. Seleziona una molecola per vedere i prezzi.</p>` +
        `<ul style="list-style:none;padding:0;margin:1.5rem 0 0">${items}</ul>`,
    ),
  }),
);

// ---------- Sanity check against the hand-written sitemap ----------

try {
  const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
  const inSitemap = new Set(
    [...sitemap.matchAll(/<loc>https:\/\/farmacompara\.it\/cerca\/([^<]+)<\/loc>/g)].map((m) => m[1]),
  );
  const missing = generated.filter((s) => !inSitemap.has(s));
  const extra = [...inSitemap].filter((s) => !generated.includes(s));
  if (missing.length) console.warn(`prerender: not in sitemap.xml: ${missing.join(", ")}`);
  if (extra.length) console.warn(`prerender: in sitemap.xml but not generated (will be 404): ${extra.join(", ")}`);
} catch {
  console.warn("prerender: public/sitemap.xml not readable, skipping sitemap check");
}

console.log(`prerender: wrote ${generated.length} /cerca pages + /principi-attivi`);
