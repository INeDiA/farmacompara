import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

interface PharmacyConfig {
  id: string;
  name: string;
  search_url_template: string;
  shipping_cost: number;
  free_shipping_threshold: number | null;
}

// Extract dosage in mg from product name
function extractDosageMg(text: string): number | null {
  // Match patterns like "1000mg", "500 mg", "1g", "1,5g"
  const mgMatch = text.match(/(\d+[.,]?\d*)\s*mg/i);
  if (mgMatch) return parseFloat(mgMatch[1].replace(",", "."));

  const gMatch = text.match(/(\d+[.,]?\d*)\s*g(?:r)?(?:\b|$)/i);
  if (gMatch) return parseFloat(gMatch[1].replace(",", ".")) * 1000;

  return null;
}

// Extract quantity from product name
function extractQuantity(text: string): number | null {
  const patterns = [
    /(\d+)\s*(?:compresse|cpr|capsule|cps|bustine|bust|buste|supposte|fiale|flaconi|comprimés|tabs|tablets|sachets|granulato|conf)/i,
    /x\s*(\d+)/i,
    /(\d+)\s*(?:pz|pezzi|unità)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]);
  }
  return null;
}

// Extract price from text
function extractPrice(text: string): number | null {
  // Match "€ 5,99", "5.99€", "€5,99", "EUR 5.99", "Prezzo: 5,99"
  const patterns = [
    /€\s*(\d+[.,]\d{2})/,
    /(\d+[.,]\d{2})\s*€/,
    /EUR\s*(\d+[.,]\d{2})/i,
    /prezzo[:\s]*(\d+[.,]\d{2})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseFloat(m[1].replace(",", "."));
  }
  return null;
}

// Generic scraper that works for most Italian pharmacy e-commerce sites
async function scrapePharmacy(
  pharmacy: PharmacyConfig,
  query: string
): Promise<ProductResult[]> {
  const searchUrl = pharmacy.search_url_template.replace(
    "{query}",
    encodeURIComponent(query)
  );

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch ${pharmacy.name}: ${response.status}`
      );
      return [];
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return [];

    const products: ProductResult[] = [];

    // Common selectors for Italian pharmacy e-commerce (Magento/PrestaShop/WooCommerce)
    const selectors = [
      ".product-item",
      ".product-card",
      ".product",
      ".item.product",
      "li.product-item",
      ".products-grid .item",
      ".search-result-item",
      "[data-product]",
      ".product-list-item",
    ];

    let productElements: Element[] = [];
    for (const sel of selectors) {
      const els = doc.querySelectorAll(sel);
      if (els.length > 0) {
        productElements = Array.from(els) as Element[];
        break;
      }
    }

    // If no product elements found, try to parse from full page text
    if (productElements.length === 0) {
      // Fallback: try to find product data in structured data (JSON-LD)
      const scripts = doc.querySelectorAll(
        'script[type="application/ld+json"]'
      );
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || "");
          const items = data.itemListElement || (Array.isArray(data) ? data : [data]);
          for (const item of items) {
            const product = item.item || item;
            if (product["@type"] === "Product" && product.offers) {
              const name = product.name || "";
              const price =
                parseFloat(product.offers.price || product.offers.lowPrice) ||
                null;
              if (name && price && name.toLowerCase().includes(query.toLowerCase())) {
                const dosage = extractDosageMg(name);
                const qty = extractQuantity(name);
                const totalMg =
                  dosage && qty ? dosage * qty : null;
                products.push({
                  name,
                  price,
                  dosage_mg: dosage,
                  quantity: qty,
                  total_mg: totalMg,
                  price_per_mg:
                    totalMg && totalMg > 0 ? price / totalMg : null,
                  product_url: product.url || null,
                  image_url: product.image || null,
                });
              }
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    // Parse product elements
    for (const el of productElements.slice(0, 20)) {
      // Product name
      const nameEl =
        el.querySelector(".product-item-link") ||
        el.querySelector(".product-name") ||
        el.querySelector(".product-title") ||
        el.querySelector("h2 a") ||
        el.querySelector("h3 a") ||
        el.querySelector("a.product-item-link") ||
        el.querySelector("[data-product-name]") ||
        el.querySelector(".name a");
      const name = (
        nameEl?.textContent?.trim() ||
        el.querySelector("a")?.getAttribute("title") ||
        ""
      ).trim();

      if (!name || !name.toLowerCase().includes(query.toLowerCase().split(" ")[0])) continue;

      // Price
      const priceEl =
        el.querySelector(".price") ||
        el.querySelector(".product-price") ||
        el.querySelector("[data-price]") ||
        el.querySelector(".special-price .price") ||
        el.querySelector(".final-price .price");
      let price = priceEl
        ? extractPrice(priceEl.textContent || "")
        : null;

      if (!price) {
        const dataPriceAttr = el.querySelector("[data-price]")?.getAttribute("data-price");
        if (dataPriceAttr) price = parseFloat(dataPriceAttr);
      }

      if (!name || !price) continue;

      // URL
      const linkEl =
        nameEl?.closest("a") ||
        el.querySelector("a[href]");
      const productUrl = linkEl?.getAttribute("href") || null;

      // Image
      const imgEl = el.querySelector("img");
      const imageUrl =
        imgEl?.getAttribute("src") ||
        imgEl?.getAttribute("data-src") ||
        null;

      const dosage = extractDosageMg(name);
      const qty = extractQuantity(name);
      const totalMg = dosage && qty ? dosage * qty : null;

      products.push({
        name,
        price,
        dosage_mg: dosage,
        quantity: qty,
        total_mg: totalMg,
        price_per_mg: totalMg && totalMg > 0 ? price / totalMg : null,
        product_url: productUrl,
        image_url: imageUrl,
      });
    }

    return products;
  } catch (err) {
    console.error(`Error scraping ${pharmacy.name}:`, err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim().toLowerCase();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'q' is required (min 2 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache
    const { data: cache } = await supabase
      .from("search_cache")
      .select("*")
      .eq("query", query)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cache) {
      // Serve from cache
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

    // Fetch pharmacies
    const { data: pharmacies } = await supabase
      .from("pharmacies")
      .select("*");

    if (!pharmacies || pharmacies.length === 0) {
      return new Response(
        JSON.stringify({ error: "No pharmacies configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Scrape all pharmacies in parallel
    const scrapePromises = pharmacies.map((p) =>
      scrapePharmacy(p as PharmacyConfig, query).then((products) => ({
        pharmacy: p,
        products,
      }))
    );

    const results = await Promise.all(scrapePromises);

    // Delete old products for this active ingredient
    await supabase
      .from("products")
      .delete()
      .eq("active_ingredient", query);

    // Insert new products
    const allProducts: any[] = [];
    for (const r of results) {
      for (const p of r.products) {
        allProducts.push({
          pharmacy_id: r.pharmacy.id,
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
      await supabase.from("products").insert(allProducts);
    }

    // Upsert cache entry
    await supabase
      .from("search_cache")
      .delete()
      .eq("query", query);
    
    await supabase.from("search_cache").insert({
      query,
      result_count: allProducts.length,
    });

    // Fetch back with pharmacy info
    const { data: finalProducts } = await supabase
      .from("products")
      .select("*, pharmacies(*)")
      .eq("active_ingredient", query)
      .order("price_per_mg", { ascending: true, nullsFirst: false });

    return new Response(
      JSON.stringify({
        products: finalProducts || [],
        from_cache: false,
        pharmacies_scraped: pharmacies.length,
        products_found: allProducts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("farma-search error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
