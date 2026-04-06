import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

// Extract dosage in mg from product name
function extractDosageMg(text: string): number | null {
  const mgMatch = text.match(/(\d+[.,]?\d*)\s*mg/i);
  if (mgMatch) return parseFloat(mgMatch[1].replace(",", "."));
  const gMatch = text.match(/(\d+[.,]?\d*)\s*g(?:r)?(?:\b|$)/i);
  if (gMatch) return parseFloat(gMatch[1].replace(",", ".")) * 1000;
  return null;
}

// Extract quantity from product name
function extractQuantity(text: string): number | null {
  const patterns = [
    /(\d+)\s*(?:compresse|cpr|capsule|cps|bustine|bust|buste|supposte|fiale|flaconi|tabs|tablets|sachets|granulato|conf|ovuli)/i,
    /x\s*(\d+)/i,
    /(\d+)\s*(?:pz|pezzi|unità)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]);
  }
  return null;
}

function computePricePerMg(price: number, dosage: number | null, qty: number | null): { total_mg: number | null; price_per_mg: number | null } {
  const total_mg = dosage && qty ? dosage * qty : null;
  const price_per_mg = total_mg && total_mg > 0 ? price / total_mg : null;
  return { total_mg, price_per_mg };
}

// ============ FARMAE (Shopify) ============
async function scrapeFarmae(query: string): Promise<ProductResult[]> {
  try {
    const url = `https://www.farmae.it/search/suggest.json?q=${encodeURIComponent(query)}&resources%5Btype%5D=product&resources%5Blimit%5D=20`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const products = data?.resources?.results?.products || [];
    
    return products
      .filter((p: any) => p.title?.toLowerCase().includes(query.toLowerCase().split(" ")[0]))
      .map((p: any) => {
        const name = p.title || "";
        const price = parseFloat(p.price) || 0;
        const dosage = extractDosageMg(name);
        const qty = extractQuantity(name);
        const { total_mg, price_per_mg } = computePricePerMg(price, dosage, qty);
        return {
          name,
          price,
          dosage_mg: dosage,
          quantity: qty,
          total_mg,
          price_per_mg,
          product_url: p.url ? `https://www.farmae.it${p.url}` : null,
          image_url: p.image || null,
        };
      })
      .filter((p: ProductResult) => p.price > 0);
  } catch (err) {
    console.error("Farmae error:", err);
    return [];
  }
}

// ============ EFARMA (Algolia) ============
async function scrapeEfarma(query: string): Promise<ProductResult[]> {
  try {
    const res = await fetch(
      "https://70OAFALOKQ-dsn.algolia.net/1/indexes/pro_efarma_it_products/query",
      {
        method: "POST",
        headers: {
          "x-algolia-application-id": "70OAFALOKQ",
          "x-algolia-api-key": "ZmIzN2IwYTExMmEwNTRhOTVmMjVhNzc0NDQ4NDIzZjQ4NmJlYzIzMWMzYWRiYjg2N2QxMzhhNjBiOWUxNDQ3MXRhZ0ZpbHRlcnM9JnZhbGlkVW50aWw9MTc3NTU0ODk2OA==",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          hitsPerPage: 20,
          attributesToRetrieve: ["name", "price", "url", "image_url", "thumbnail_url"],
        }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.hits || [];

    return hits
      .filter((h: any) => h.name?.toLowerCase().includes(query.toLowerCase().split(" ")[0]))
      .map((h: any) => {
        const name = h.name || "";
        const price = h.price?.EUR?.default || h.price?.EUR?.default_original || 0;
        const dosage = extractDosageMg(name);
        const qty = extractQuantity(name);
        const { total_mg, price_per_mg } = computePricePerMg(price, dosage, qty);
        return {
          name,
          price,
          dosage_mg: dosage,
          quantity: qty,
          total_mg,
          price_per_mg,
          product_url: h.url || null,
          image_url: h.image_url || h.thumbnail_url || null,
        };
      })
      .filter((p: ProductResult) => p.price > 0);
  } catch (err) {
    console.error("eFarma error:", err);
    return [];
  }
}

// ============ PHARMACY REGISTRY ============
interface PharmacyScraper {
  pharmacyName: string;
  scrape: (query: string) => Promise<ProductResult[]>;
}

const scrapers: PharmacyScraper[] = [
  { pharmacyName: "Farmae", scrape: scrapeFarmae },
  { pharmacyName: "eFarma", scrape: scrapeEfarma },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim().toLowerCase();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: "Parametro 'q' richiesto (min 2 caratteri)" }),
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

    // Scrape all in parallel
    const results = await Promise.all(
      scrapers.map(async (s) => {
        const products = await s.scrape(query);
        return { pharmacyName: s.pharmacyName, products };
      })
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
    await supabase.from("search_cache").delete().eq("query", query);
    await supabase.from("search_cache").insert({ query, result_count: allProducts.length });

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
    console.error("farma-search error:", err);
    return new Response(
      JSON.stringify({ error: "Errore interno del server", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
