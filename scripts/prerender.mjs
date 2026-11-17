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
//
// Prices: when PRERENDER_TOKEN is set (GitHub Actions secret, also set on the
// farma-search edge function), every /cerca page gets a static table with the
// cheapest packs per gram, fetched from farma-search exactly like the app does
// (principio attivo + brand aliases). The function serves its 48h cache when warm,
// so the nightly build does not hit the pharmacies more than real visitors would.
// A principio attivo with zero products gets <meta name="robots" content="noindex">
// and is left out of dist/sitemap.xml (Google treats empty pages as soft 404).
// If a request fails, the page is written without prices and stays indexable.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSync } from "esbuild";

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

// Brand aliases: reuse the app's own module (bundled on the fly) so the build
// searches exactly what /cerca/<slug> searches in the browser.
async function loadActiveToBrands() {
  const dir = mkdtempSync(join(tmpdir(), "prerender-"));
  try {
    const out = join(dir, "brandToActive.mjs");
    buildSync({ entryPoints: [join(ROOT, "src/lib/brandToActive.ts")], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
    return (await import(pathToFileURL(out).href)).activeToBrands;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const activeToBrands = await loadActiveToBrands();

// ---------- Prices from farma-search ----------

function readDotEnv() {
  try {
    return Object.fromEntries(
      readFileSync(join(ROOT, ".env"), "utf8")
        .split("\n")
        .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
    );
  } catch {
    return {};
  }
}
const dotEnv = readDotEnv();
const env = (k) => process.env[k] || dotEnv[k] || "";
const SUPABASE_URL = env("VITE_SUPABASE_URL");
const SUPABASE_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY");
const PRERENDER_TOKEN = env("PRERENDER_TOKEN");
const fetchPrices = Boolean(SUPABASE_URL && SUPABASE_KEY && PRERENDER_TOKEN);
if (!fetchPrices) console.warn("prerender: PRERENDER_TOKEN or Supabase env missing — pages written without prices");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns the products array, or null when the request failed.
async function searchProducts(name) {
  const q = name.trim().toLowerCase();
  const params = new URLSearchParams({ q });
  const aliases = activeToBrands(name).map((a) => a.trim().toLowerCase());
  if (aliases.length) params.set("aliases", aliases.join(","));
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/farma-search?${params}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "x-prerender-token": PRERENDER_TOKEN },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.products)) throw new Error("no products array");
      return data.products;
    } catch (err) {
      console.warn(`prerender: ${name}: attempt ${attempt} failed (${err.message})`);
      if (attempt < 2) await sleep(5000);
    }
  }
  return null;
}

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

function render({ title, description, url, body, noindex = false }) {
  let html = template;
  if (noindex) html = replaceOnce(html, /<\/head>/, '<meta name="robots" content="noindex">\n</head>');
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

const fmtEur = (v) => `€${v.toFixed(2).replace(".", ",")}`;
const fmtPerG = (v) => (v == null ? "N/D" : `€${(v * 1000).toFixed(2).replace(".", ",")}/g`);
const shippingFor = (p) => {
  const t = p.pharmacies?.free_shipping_threshold;
  if (t != null && p.price >= t) return 0;
  return p.pharmacies?.shipping_cost ?? 0;
};
function outbound(url, active) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.searchParams.delete("search");
    for (const [k, v] of Object.entries({ utm_source: "farmacompara", utm_medium: "referral", utm_campaign: "cerca", utm_content: active })) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return null;
  }
}

const td = "padding:.5rem .4rem;border-bottom:1px solid #dcebe2;vertical-align:top";
function priceSection(capitalized, products) {
  const sorted = [...products].sort((a, b) => (a.price_per_mg ?? Infinity) - (b.price_per_mg ?? Infinity));
  const top = sorted.slice(0, 10);
  const pharmacies = new Set(products.map((p) => p.pharmacies?.name).filter(Boolean));
  const perG = sorted.map((p) => p.price_per_mg).filter((v) => v != null);
  const today = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
  const rows = top
    .map((p) => {
      const href = p.product_url ? outbound(p.product_url, p.active_ingredient || capitalized.toLowerCase()) : null;
      const name = href ? `<a href="${esc(href)}" rel="nofollow noopener" target="_blank" style="color:#1a7a4a">${esc(p.name)}</a>` : esc(p.name);
      const ship = shippingFor(p);
      return `<tr><td style="${td}">${name}</td><td style="${td}">${esc(p.pharmacies?.name ?? "")}</td><td style="${td};white-space:nowrap">${fmtEur(p.price)}</td><td style="${td};white-space:nowrap;font-weight:600">${fmtPerG(p.price_per_mg)}</td><td style="${td};white-space:nowrap">${ship === 0 ? "Gratis" : fmtEur(ship)}</td></tr>`;
    })
    .join("");
  const range = perG.length ? ` Il prezzo al grammo di principio attivo va da ${fmtPerG(perG[0])} a ${fmtPerG(perG[perG.length - 1])}.` : "";
  return (
    `<p style="color:#0f2a1c;margin:1.25rem 0 0">Abbiamo confrontato ${products.length} ${products.length === 1 ? "confezione" : "confezioni"} di ${esc(capitalized)} in ${pharmacies.size} ${pharmacies.size === 1 ? "farmacia online" : "farmacie online"}.${range} Prezzi rilevati il ${today}.</p>` +
    `<h2 style="font-size:1.15rem;margin:1.5rem 0 .5rem;color:#0f2a1c">Le confezioni più convenienti al grammo</h2>` +
    `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.875rem;text-align:left">` +
    `<thead><tr><th style="${td}">Prodotto</th><th style="${td}">Farmacia</th><th style="${td}">Prezzo</th><th style="${td}">Prezzo/g</th><th style="${td}">Spedizione</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>`
  );
}

// Neighbouring molecules in list order, skipping the empty (noindex) ones.
function relatedLinks(name) {
  const i = molecules.indexOf(name);
  const others = [];
  for (let d = 1; others.length < 6 && d < molecules.length; d++) {
    for (const j of [i + d, i - d]) {
      const n = molecules[j];
      if (n && isEmptyName(n)) continue;
      if (n && n !== name && !others.includes(n) && others.length < 6) others.push(n);
    }
  }
  return (
    `<p style="margin:1.75rem 0 0;color:#4a7a5a">Altri principi attivi: ` +
    others.map((n) => `<a href="/cerca/${toSlug(n)}" style="color:#1a7a4a">${esc(n)}</a>`).join(" · ") +
    ` · <a href="/principi-attivi" style="color:#1a7a4a">tutti i principi attivi</a></p>`
  );
}

// Pass 1: fetch every molecule first, so links on all pages can skip the empty ones.
const results = new Map(); // name -> products[] | null (null = search failed or no token)
for (const [idx, name] of molecules.entries()) {
  if (fetchPrices && idx > 0) await sleep(1500);
  results.set(name, fetchPrices ? await searchProducts(name) : null);
}
// Empty = search succeeded with zero products. A failed search keeps the page indexable.
const isEmptyName = (n) => Array.isArray(results.get(n)) && results.get(n).length === 0;
const available = molecules.filter((n) => !isEmptyName(n));
const emptyNames = molecules.filter(isEmptyName);

// Pass 2: render.
const generated = [];
const empty = emptyNames.map(toSlug); // slugs dropped from the sitemap
let withPrices = 0;
for (const name of molecules) {
  const lower = name.toLowerCase();
  const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
  const slug = toSlug(name);

  const products = results.get(name);
  const isEmpty = isEmptyName(name);
  if (products?.length) withPrices++;

  const prices = products?.length
    ? priceSection(capitalized, products)
    : isEmpty
      ? `<p style="color:#4a7a5a;margin:1.25rem 0 0">Al momento nessuna delle farmacie online confrontate ha ${esc(capitalized)} disponibile.</p>`
      : "";

  const html = render({
    title: `${capitalized} — prezzo al grammo | FarmaCompara`,
    description: `Confronta il prezzo al grammo di ${capitalized} tra farmacie online italiane. Trova la confezione più conveniente.`,
    url: `${SITE}/cerca/${slug}`,
    noindex: isEmpty,
    body: shell(
      `<h1 style="font-size:1.75rem;line-height:1.2;margin:1.5rem 0 .75rem;color:#0f2a1c">${esc(capitalized)}: prezzo al grammo di principio attivo</h1>` +
        `<p style="color:#4a7a5a;margin:0">Confronta il costo normalizzato per grammo di ${esc(capitalized)} tra farmacie online italiane. Stessa molecola, confezioni diverse: trova quella che conviene.</p>` +
        prices +
        relatedLinks(name),
    ),
  });
  // File name is the decoded slug: GitHub Pages decodes %20 before the lookup.
  write(`cerca/${lower}`, html);
  generated.push(slug);
}

// Read by the React /principi-attivi page to hide the same molecules after hydration.
writeFileSync(join(DIST, "principi-vuoti.json"), JSON.stringify(emptyNames));

// ---------- /principi-attivi ----------

const sorted = [...available].sort((a, b) => a.localeCompare(b, "it"));
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
        `<ul style="list-style:none;padding:0;margin:1.5rem 0 0">${items}</ul>` +
        (emptyNames.length
          ? `<p style="color:#4a7a5a;margin:1.5rem 0 0">Al momento non disponibili nelle farmacie online confrontate: ` +
            [...emptyNames].sort((a, b) => a.localeCompare(b, "it")).map(esc).join(", ") +
            `.</p>`
          : ""),
    ),
  }),
);

// ---------- Home: static link list so crawlers find every /cerca page ----------
// Written last: the other pages use the untouched dist/index.html as template.

writeFileSync(
  join(DIST, "index.html"),
  replaceRootContent(
    template,
    shell(
      `<h1 style="font-size:1.75rem;line-height:1.2;margin:1.5rem 0 .75rem;color:#0f2a1c">Quanto costa davvero il tuo farmaco?</h1>` +
        `<p style="color:#4a7a5a;margin:0">Confronta il costo per grammo di principio attivo tra diverse farmacie online. Stessa molecola, confezioni diverse: scopri quale conviene davvero.</p>` +
        `<p style="margin:1.5rem 0 .5rem"><a href="/principi-attivi" style="color:#1a7a4a;font-weight:600">Tutti i principi attivi</a></p>` +
        `<p style="margin:0;line-height:1.9">${sorted.map((n) => `<a href="/cerca/${toSlug(n)}" style="color:#1a7a4a">${esc(n)}</a>`).join(" · ")}</p>`,
    ),
  ),
);

// ---------- dist/sitemap.xml: drop empty pages, check drift ----------

const sitemapSrc = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
const inSitemap = new Set(
  [...sitemapSrc.matchAll(/<loc>https:\/\/farmacompara\.it\/cerca\/([^<]+)<\/loc>/g)].map((m) => m[1]),
);
const missing = generated.filter((s) => !inSitemap.has(s));
const extra = [...inSitemap].filter((s) => !generated.includes(s));
if (missing.length) console.warn(`prerender: not in sitemap.xml: ${missing.join(", ")}`);
if (extra.length) console.warn(`prerender: in sitemap.xml but not generated (will be 404): ${extra.join(", ")}`);

const emptySet = new Set(empty);
const sitemapOut = sitemapSrc
  .split("\n")
  .filter((line) => {
    const m = line.match(/<loc>https:\/\/farmacompara\.it\/cerca\/([^<]+)<\/loc>/);
    return !(m && emptySet.has(m[1]));
  })
  .join("\n");
writeFileSync(join(DIST, "sitemap.xml"), sitemapOut);

console.log(
  `prerender: wrote ${generated.length} /cerca pages (${withPrices} with prices, ${empty.length} empty → noindex: ${empty.map(decodeURIComponent).join(", ") || "none"}) + /principi-attivi + home`,
);
