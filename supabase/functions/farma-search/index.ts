import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

// API keys lette esclusivamente dai secret dell'edge function.
// Se mancanti, lo scraper della relativa fonte viene saltato.
const FARMACIE_1000_ALGOLIA_KEY = Deno.env.get("FARMACIE_1000_ALGOLIA_KEY") ?? "";

interface ProductResult {
  name: string;
  price: number;
  dosage_mg: number | null;
  quantity: number | null;
  total_mg: number | null;
  price_per_mg: number | null;
  product_url: string | null;
  image_url: string | null;
}

// ============ HELPERS ============

const TOPICAL_RE = /\b(gel|crema|cream|spray|unguento|schiuma|emulgel|pomata|lozione|soluzione\s*cutanea)\b/i;
const PATCH_RE = /\b(cerott[oi]|cer\.?\s*med|patch|patches)\b/i;

function isTopical(text: string): boolean {
  return TOPICAL_RE.test(text) || PATCH_RE.test(text);
}

/**
 * For topical products: extract total active ingredient in mg
 * from percentage + weight/volume (e.g. "2% 100g" → 2000mg)
 * For patches: extract mg per patch (e.g. "140mg 10 cerotti" → 140mg per unit)
 */
function extractTopicalTotalMg(text: string): { dosage_mg: number; quantity: number; total_mg: number } | null {
  // Patches: look for mg per patch + count
  if (PATCH_RE.test(text)) {
    const mgMatch = text.match(/(\d+[.,]?\d*)\s*mg/i);
    const qtyMatch = text.match(/(\d+)\s*(?:cerott[oi]|cer\.?\s*med|patch|patches)/i);
    if (mgMatch && qtyMatch) {
      const dosage = parseFloat(mgMatch[1].replace(",", "."));
      const qty = parseInt(qtyMatch[1]);
      return { dosage_mg: dosage, quantity: qty, total_mg: dosage * qty };
    }
    return null;
  }

  // Percentage-based: "2% 100g" or "1% 50ml"
  const pctMatch = text.match(/(\d+[.,]?\d*)\s*%/);
  if (!pctMatch) return null;
  const pct = parseFloat(pctMatch[1].replace(",", "."));

  const weightMatch = text.match(/(\d+[.,]?\d*)\s*(g|gr|ml)\b/i);
  if (!weightMatch) return null;
  const weight = parseFloat(weightMatch[1].replace(",", "."));

  // pct% of weight grams = (pct/100) * weight * 1000 mg
  const total_mg = (pct / 100) * weight * 1000;
  return { dosage_mg: total_mg, quantity: 1, total_mg };
}

function extractDosageMg(text: string): number | null {
  // Skip gram-weight capture for topicals (would catch tube weight)
  if (isTopical(text)) {
    // Only match explicit mg for topicals (used as fallback)
    const mgMatch = text.match(/(\d+[.,]?\d*)\s*mg/i);
    if (mgMatch) return parseFloat(mgMatch[1].replace(",", "."));
    return null;
  }

  const mgMatch = text.match(/(\d+[.,]?\d*)\s*mg/i);
  if (mgMatch) return parseFloat(mgMatch[1].replace(",", "."));
  const gMatch = text.match(/(\d+[.,]?\d*)\s*g(?:r)?(?:\b|$)/i);
  if (gMatch) return parseFloat(gMatch[1].replace(",", ".")) * 1000;
  return null;
}

function extractQuantity(text: string): number | null {
  const patterns = [
    /(\d+)\s*(?:compresse|cpr|cp\.?|com\.{0,2}|capsule|cps|cap\.?|caps\.?|bustine|bust\.?|buste|supposte|supp\.?|fiale|fl\.?|flaconi|tabs|tablets|sachets|granulato|conf|ovuli|cer\.?\s*med|cerott[oi]|patch|patches)/i,
    /x\s*(\d+)/i,
    /(\d+)\s*(?:pz|pezzi|unità)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]);
  }
  return null;
}

function computePricePerMg(price: number, dosage: number | null, qty: number | null) {
  const total_mg = dosage && qty ? dosage * qty : null;
  const price_per_mg = total_mg && total_mg > 0 ? price / total_mg : null;
  return { total_mg, price_per_mg };
}

function parseItalianPrice(text: string): number {
  const cleaned = text.replace(/[^\d,.]/g, "").trim();
  const match = cleaned.match(/(\d+)[,.](\d{2})$/);
  if (match) return parseFloat(`${match[1]}.${match[2]}`);
  return parseFloat(cleaned) || 0;
}

function buildProduct(name: string, price: number, url: string | null, image: string | null): ProductResult {
  // Try topical extraction first
  if (isTopical(name)) {
    const topical = extractTopicalTotalMg(name);
    if (topical) {
      const price_per_mg = topical.total_mg > 0 ? price / topical.total_mg : null;
      return { name, price, dosage_mg: topical.dosage_mg, quantity: topical.quantity, total_mg: topical.total_mg, price_per_mg, product_url: url, image_url: image };
    }
  }

  const dosage = extractDosageMg(name);
  const qty = extractQuantity(name);
  const { total_mg, price_per_mg } = computePricePerMg(price, dosage, qty);
  return { name, price, dosage_mg: dosage, quantity: qty, total_mg, price_per_mg, product_url: url, image_url: image };
}

function significantTokens(keyword: string): string[] {
  // Split su spazi, trattini, slash. Tieni i token "discriminanti":
  // - se contiene cifre → lunghezza ≥ 2 (es. "d3", "b12")
  // - altrimenti → lunghezza ≥ 6 (es. "acetilsalicilico", "ibuprofen", "diclofenac")
  // Fallback su token ≥ 3 chars se nessuno passa.
  const all = keyword.toLowerCase().split(/[\s\-/]+/).filter(Boolean);
  const significant = all.filter((t) => (/\d/.test(t) ? t.length >= 2 : t.length >= 6));
  if (significant.length > 0) return significant;
  return all.filter((t) => t.length >= 3);
}

function filterByQuery(products: ProductResult[], query: string): ProductResult[] {
  // query può contenere più keyword separate da "|" (principio attivo + brand alias).
  // Per ciascuna keyword estraiamo i token "discriminanti" e richiediamo che TUTTI
  // i token di almeno UNA keyword siano presenti nel nome prodotto.
  // Evita falsi positivi tipo "Acido folico" quando cerchi "Acido acetilsalicilico".
  const keywordTokens = query
    .toLowerCase()
    .split("|")
    .map((k) => significantTokens(k))
    .filter((toks) => toks.length > 0);
  if (keywordTokens.length === 0) return products.filter((p) => p.price > 0);
  return products.filter((p) => {
    if (p.price <= 0) return false;
    const name = p.name.toLowerCase();
    return keywordTokens.some((tokens) => tokens.every((t) => name.includes(t)));
  });
}

// ============ FARMAE (Shopify) ============
async function scrapeFarmae(query: string): Promise<ProductResult[]> {
  try {
    const url = `https://www.farmae.it/search/suggest.json?q=${encodeURIComponent(query)}&resources%5Btype%5D=product&resources%5Blimit%5D=20`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const data = await res.json();
    const products = data?.resources?.results?.products || [];
    return filterByQuery(
      products.map((p: any) => buildProduct(
        p.title || "", parseFloat(p.price) || 0,
        p.url ? `https://www.farmae.it${p.url}` : null, p.image || null,
      )), query,
    );
  } catch (err) { console.error("Farmae error:", err); return []; }
}

// ============ AMICAFARMACIA (Shopify) ============
async function scrapeAmicafarmacia(query: string): Promise<ProductResult[]> {
  try {
    const url = `https://www.amicafarmacia.com/search/suggest.json?q=${encodeURIComponent(query)}&resources%5Btype%5D=product&resources%5Blimit%5D=20`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const data = await res.json();
    const products = data?.resources?.results?.products || [];
    return filterByQuery(
      products.map((p: any) => buildProduct(
        p.title || "", parseFloat(p.price) || 0,
        p.url ? `https://www.amicafarmacia.com${p.url}` : null, p.image || null,
      )), query,
    );
  } catch (err) { console.error("Amicafarmacia error:", err); return []; }
}

// ============ OPENCART (generic HTML scraper) ============
async function scrapeOpenCart(baseUrl: string, query: string): Promise<ProductResult[]> {
  try {
    const url = `${baseUrl}/index.php?route=product/search&search=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok) return [];
    const html = await res.text();

    const results: ProductResult[] = [];
    const captionBlocks = html.split(/class="caption"/);
    for (const block of captionBlocks.slice(1)) {
      try {
        const nameMatch = block.match(/<h4[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/);
        if (!nameMatch) continue;
        const productUrl = nameMatch[1];
        const name = nameMatch[2].trim();

        let priceMatch = block.match(/class="price-new"[^>]*>([^<]+)/);
        if (!priceMatch) priceMatch = block.match(/class="price"[^>]*>\s*([^<]+)/);
        if (!priceMatch) continue;
        const price = parseItalianPrice(priceMatch[1]);
        if (price <= 0) continue;

        results.push(buildProduct(name, price, productUrl, null));
      } catch { /* skip malformed block */ }
    }
    return filterByQuery(results, query);
  } catch (err) { console.error(`OpenCart scrape error (${baseUrl}):`, err); return []; }
}

// ============ 1000FARMACIE (Algolia) ============
async function scrape1000Farmacie(query: string): Promise<ProductResult[]> {
  try {
    const res = await fetch(
      "https://hw3t8wvs73-dsn.algolia.net/1/indexes/Product/query",
      {
        method: "POST",
        headers: {
          "x-algolia-application-id": "HW3T8WVS73",
          "x-algolia-api-key": FARMACIE_1000_ALGOLIA_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, hitsPerPage: 20 }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return filterByQuery(
      (data?.hits || []).map((h: any) => {
        const name = h.name || h.title || "";
        const price = typeof h.price === "number" ? h.price : parseFloat(h.price) || 0;
        const productUrl = h.url || h.slug ? `https://1000farmacie.it${h.url || h.slug}` : null;
        const image = h.image_url || h.image || h.thumbnail || null;
        return buildProduct(name, price, productUrl, image);
      }), query,
    );
  } catch (err) { console.error("1000Farmacie error:", err); return []; }
}

// ============ FARMAEUROPE (Magento autocomplete) ============
async function scrapeFarmaeurope(query: string): Promise<ProductResult[]> {
  try {
    const url = `https://www.farmaeurope.eu/searchautocomplete/ajax/suggest/?q=${encodeURIComponent(query)}&store_id=4`;
    const res = await fetch(url, { headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data?.results || data?.items || []);
    return filterByQuery(
      items.map((item: any) => {
        const name = item.name || item.title || "";
        // Price can be in data-price-amount attribute within HTML or plain text
        let price = 0;
        if (item.price) {
          const priceAmountMatch = String(item.price).match(/data-price-amount="([^"]+)"/);
          if (priceAmountMatch) {
            price = parseFloat(priceAmountMatch[1]) || 0;
          } else {
            price = parseItalianPrice(String(item.price));
          }
        }
        const productUrl = item.url || null;
        const image = item.imageUrl || item.image || item.thumbnail || null;
        return buildProduct(name, price, productUrl, image);
      }), query,
    );
  } catch (err) { console.error("Farmaeurope error:", err); return []; }
}

// ============ PHARMACY REGISTRY ============
interface PharmacyScraper {
  pharmacyName: string;
  scrape: (query: string) => Promise<ProductResult[]>;
}

const scrapers: PharmacyScraper[] = [
  { pharmacyName: "Farmae", scrape: scrapeFarmae },
  { pharmacyName: "Amicafarmacia", scrape: scrapeAmicafarmacia },
  { pharmacyName: "Farmacia Igea", scrape: (q) => scrapeOpenCart("https://www.farmaciaigea.com", q) },
  { pharmacyName: "Farmacia Gaudiana", scrape: (q) => scrapeOpenCart("https://farmaciagaudiana.it", q) },
  { pharmacyName: "Farmacia Guacci", scrape: (q) => scrapeOpenCart("https://farmaciaguacci.it", q) },
  { pharmacyName: "Farmacia del Corso", scrape: (q) => scrapeOpenCart("https://farmaciadelcorso.net", q) },
  { pharmacyName: "1000Farmacie", scrape: scrape1000Farmacie },
  { pharmacyName: "Farmaeurope", scrape: scrapeFarmaeurope },
];

// ============ RATE LIMITING ============
async function checkRateLimit(supabase: any, ip: string): Promise<{ blocked: boolean; retryAfter?: number }> {
  // Check if IP is currently blocked
  const { data: blocked } = await supabase
    .from("rate_limits")
    .select("blocked_until")
    .eq("ip_address", ip)
    .gt("blocked_until", new Date().toISOString())
    .order("blocked_until", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (blocked?.blocked_until) {
    const retryAfter = Math.ceil((new Date(blocked.blocked_until).getTime() - Date.now()) / 1000);
    return { blocked: true, retryAfter };
  }

  // INSERT FIRST, then count — prevents race condition
  await supabase.from("rate_limits").insert({ ip_address: ip });

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60_000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 3_600_000).toISOString();

  const [{ count: lastMinute }, { count: lastHour }] = await Promise.all([
    supabase.from("rate_limits").select("*", { count: "exact", head: true })
      .eq("ip_address", ip).gt("requested_at", oneMinuteAgo),
    supabase.from("rate_limits").select("*", { count: "exact", head: true })
      .eq("ip_address", ip).gt("requested_at", oneHourAgo),
  ]);

  // Progressive blocking
  let blockMinutes = 0;
  if ((lastHour || 0) > 50) blockMinutes = 1440; // 24h ban
  else if ((lastHour || 0) > 20) blockMinutes = 30;
  else if ((lastMinute || 0) > 10) blockMinutes = 5;

  if (blockMinutes > 0) {
    const blockedUntil = new Date(now.getTime() + blockMinutes * 60_000).toISOString();
    await supabase.from("rate_limits").insert({ ip_address: ip, blocked_until: blockedUntil });
    return { blocked: true, retryAfter: blockMinutes * 60 };
  }

  // Cleanup old entries (1 in 50 chance)
  if (Math.random() < 0.02) {
    const oneDayAgo = new Date(now.getTime() - 86_400_000).toISOString();
    await supabase.from("rate_limits").delete().lt("requested_at", oneDayAgo).is("blocked_until", null);
    await supabase.from("rate_limits").delete().lt("blocked_until", now.toISOString());
  }

  return { blocked: false };
}

function getClientIp(req: Request): string {
  // Prefer trusted proxy-set headers. For x-forwarded-for, take the LAST
  // entry (appended by the trusted proxy) — the first entry is client-controlled
  // and can be spoofed to bypass IP-based rate limiting.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "unknown";
}

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // ============ CLEAR CACHE (admin only) ============
    if (url.searchParams.get("clear_cache") === "all") {
      const adminToken = Deno.env.get("ADMIN_TOKEN");
      const authHeader = req.headers.get("Authorization");
      if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
        return new Response(
          JSON.stringify({ error: "Non autorizzato" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { count: cacheCount } = await supabase.from("search_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("*", { count: "exact", head: true });
      const { count: productCount } = await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("*", { count: "exact", head: true });
      return new Response(
        JSON.stringify({ success: true, deleted_cache: cacheCount || 0, deleted_products: productCount || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const query = url.searchParams.get("q")?.trim().toLowerCase();
    const aliasesParam = url.searchParams.get("aliases")?.trim().toLowerCase() || "";

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: "Parametro 'q' richiesto (min 2 caratteri)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (query.length > 100) {
      return new Response(
        JSON.stringify({ error: "Parametro 'q' troppo lungo (max 100 caratteri)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap aliases to prevent scraper request amplification:
    // total external requests = scrapers.length × (1 + aliases.length).
    const MAX_ALIASES = 5;
    const MAX_ALIAS_LEN = 50;
    const aliases = aliasesParam
      ? aliasesParam
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a.length >= 2 && a.length <= MAX_ALIAS_LEN && a !== query)
          .slice(0, MAX_ALIASES)
      : [];

    // Termini su cui interrogare gli scraper: principio attivo + eventuali brand alias
    const searchTerms = [query, ...aliases];
    // Pattern usato per filtrare i risultati (match se contiene una qualunque keyword)
    const filterPattern = searchTerms.join("|");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting
    const clientIp = getClientIp(req);
    const rateCheck = await checkRateLimit(supabase, clientIp);
    if (rateCheck.blocked) {
      return new Response(
        JSON.stringify({ error: "Troppe ricerche. Riprova più tardi.", retry_after: rateCheck.retryAfter }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter || 60) } }
      );
    }

    // Cache key: principio attivo + alias (così aggiungere/rimuovere brand invalida la cache)
    const cacheKey = aliases.length > 0 ? `${query}|${aliases.join(",")}` : query;

    // Check cache
    const { data: cache } = await supabase
      .from("search_cache")
      .select("*")
      .eq("query", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cache) {
      const { data: products } = await supabase
        .from("products")
        .select("*, pharmacies(*)")
        .eq("active_ingredient", query)
        .order("price_per_mg", { ascending: true, nullsFirst: false });

      return new Response(
        JSON.stringify({
          products: products || [],
          from_cache: true,
          cached_at: cache.last_scraped,
          expires_at: cache.expires_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pharmacy IDs from DB
    const { data: pharmacies } = await supabase
      .from("pharmacies")
      .select("id, name");

    const pharmacyIdMap: Record<string, string> = {};
    for (const p of pharmacies || []) {
      pharmacyIdMap[p.name] = p.id;
    }

    // Scrape: per ogni scraper, esegui ricerca su tutti i termini (principio attivo + brand alias)
    // Il filtro accetta match su una qualunque keyword (filterPattern = "term1|term2|...")
    const results = await Promise.all(
      scrapers.map(async (s) => {
        const perTerm = await Promise.all(
          searchTerms.map(async (term) => {
            const products = await s.scrape(term);
            // Re-filtra con il pattern combinato così non perdiamo brand match dentro risultati di altri termini
            return filterByQuery(products, filterPattern);
          }),
        );
        // Dedup per URL prodotto (fallback sul nome)
        const seen = new Set<string>();
        const merged: ProductResult[] = [];
        for (const list of perTerm) {
          for (const p of list) {
            const key = (p.product_url || p.name).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(p);
          }
        }
        return { pharmacyName: s.pharmacyName, products: merged };
      }),
    );

    // Delete old products for this query
    await supabase.from("products").delete().eq("active_ingredient", query);

    // Prepare inserts
    const allProducts: any[] = [];
    for (const r of results) {
      const pharmacyId = pharmacyIdMap[r.pharmacyName];
      if (!pharmacyId) {
        console.warn(`No pharmacy ID for ${r.pharmacyName}`);
        continue;
      }
      for (const p of r.products) {
        allProducts.push({
          pharmacy_id: pharmacyId,
          name: p.name,
          active_ingredient: query,
          dosage_mg: p.dosage_mg,
          quantity: p.quantity,
          total_mg: p.total_mg,
          price: p.price,
          price_per_mg: p.price_per_mg,
          product_url: p.product_url,
          image_url: p.image_url,
        });
      }
    }

    if (allProducts.length > 0) {
      const { error: insertError } = await supabase.from("products").insert(allProducts);
      if (insertError) console.error("Insert error:", insertError);
    }

    // Upsert cache
    await supabase.from("search_cache").delete().eq("query", cacheKey);
    await supabase.from("search_cache").insert({ query: cacheKey, result_count: allProducts.length });

    // Fetch with pharmacy info
    const { data: finalProducts } = await supabase
      .from("products")
      .select("*, pharmacies(*)")
      .eq("active_ingredient", query)
      .order("price_per_mg", { ascending: true, nullsFirst: false });

    return new Response(
      JSON.stringify({
        products: finalProducts || [],
        from_cache: false,
        pharmacies_scraped: scrapers.length,
        products_found: allProducts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Full error logged server-side only (visible in edge function logs).
    console.error("farma-search error:", err);
    return new Response(
      JSON.stringify({ error: "Errore interno del server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
