import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Pill, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useFarmaSearch, type ProductWithPharmacy } from "@/hooks/useFarmaSearch";
import { fromSlug, toSlug } from "@/lib/principiAttivi";
import { productSlug } from "@/lib/productSlug";
import { activeToBrands } from "@/lib/brandToActive";

function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function stripSearchParam(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("search");
    return u.toString();
  } catch {
    return url;
  }
}

function outboundUrl(url: string, activeIngredient: string): string | null {
  if (!isSafeUrl(url)) return null;
  const cleaned = stripSearchParam(url);
  const sep = cleaned.includes("?") ? "&" : "?";
  return `${cleaned}${sep}utm_source=farmacompara&utm_medium=referral&utm_campaign=prodotto&utm_content=${encodeURIComponent(activeIngredient)}`;
}

function shippingCostFor(p: ProductWithPharmacy): number {
  const threshold = p.pharmacies.free_shipping_threshold;
  if (threshold != null && p.price >= threshold) return 0;
  return p.pharmacies.shipping_cost ?? 0;
}

function setMeta(attr: string, value: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr.split("=")[0], value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function injectJsonLd(id: string, data: unknown) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.id = id;
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

function priceValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const Product = () => {
  const { active: activeRaw, slug } = useParams<{ active: string; slug: string }>();
  const navigate = useNavigate();
  const active = activeRaw ? fromSlug(activeRaw) : "";
  const { results, loading, error, search } = useFarmaSearch();

  useEffect(() => {
    if (!active) return;
    const aliases = activeToBrands(active);
    search(active, aliases);
  }, [active]);

  const product = useMemo(() => {
    if (!results || !slug) return null;
    return (
      results.products.find((p) => productSlug(p.name, p.pharmacies.name) === slug) ?? null
    );
  }, [results, slug]);

  const capActive = active ? active.charAt(0).toUpperCase() + active.slice(1) : "";

  useEffect(() => {
    if (!product) return;
    const title = `${product.name} — ${product.pharmacies.name} | FarmaCompara`.slice(0, 60);
    const desc = `${product.name} a ${`€${product.price.toFixed(2)}`} su ${product.pharmacies.name}. Confronta il prezzo al grammo di ${capActive} su FarmaCompara.`.slice(0, 160);
    const url = `https://farmacompara.it/prodotto/${activeRaw}/${slug}`;

    document.title = title;
    setMeta("name", "description", desc);
    setCanonical(url);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "product");
    if (product.image_url && isSafeUrl(product.image_url)) {
      setMeta("property", "og:image", product.image_url);
    }
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);

    const ship = shippingCostFor(product);
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      sku: product.id,
      url,
      category: capActive,
      ...(product.image_url && isSafeUrl(product.image_url) ? { image: product.image_url } : {}),
      offers: {
        "@type": "Offer",
        price: product.price.toFixed(2),
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        priceValidUntil: priceValidUntil(),
        url: outboundUrl(product.product_url ?? "", product.active_ingredient) ?? url,
        seller: { "@type": "Organization", name: product.pharmacies.name },
        ...(ship > 0
          ? {
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingRate: {
                  "@type": "MonetaryAmount",
                  value: ship.toFixed(2),
                  currency: "EUR",
                },
              },
            }
          : {}),
      },
    };
    injectJsonLd("product-jsonld", jsonLd);

    injectJsonLd("product-breadcrumb-jsonld", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://farmacompara.it/" },
        {
          "@type": "ListItem",
          position: 2,
          name: capActive,
          item: `https://farmacompara.it/cerca/${activeRaw}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.name,
          item: url,
        },
      ],
    });

    return () => {
      document.getElementById("product-jsonld")?.remove();
      document.getElementById("product-breadcrumb-jsonld")?.remove();
    };
  }, [product, activeRaw, slug, capActive]);

  // If results loaded but no matching product, go back to search page
  useEffect(() => {
    if (!loading && results && !product && active) {
      navigate(`/cerca/${toSlug(active)}`, { replace: true });
    }
  }, [loading, results, product, active, navigate]);

  const safeHref = product ? outboundUrl(product.product_url ?? "", product.active_ingredient) : null;
  const ship = product ? shippingCostFor(product) : 0;
  const total = product ? product.price + ship : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">FarmaCompara</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          to={`/cerca/${toSlug(active)}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Confronto {capActive}
        </Link>

        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <Card>
            <CardContent className="py-10 text-center text-destructive">{error}</CardContent>
          </Card>
        )}

        {product && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                {product.image_url && isSafeUrl(product.image_url) && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    className="h-24 w-24 object-contain rounded-lg border bg-card shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-2">{capActive}</Badge>
                  <h1 className="text-xl font-bold leading-tight">{product.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Venduto da <span className="font-medium text-foreground">{product.pharmacies.name}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Prezzo</p>
                  <p className="text-lg font-bold">€{product.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dosaggio</p>
                  <p className="text-lg font-medium">
                    {product.dosage_mg ? `${product.dosage_mg}mg` : "N/D"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantità</p>
                  <p className="text-lg font-medium">{product.quantity || "N/D"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">€/g</p>
                  <p className="text-lg font-bold text-primary">
                    {product.price_per_mg != null
                      ? `€${(product.price_per_mg * 1000).toFixed(2)}`
                      : "N/D"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm">
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Truck className="h-3.5 w-3.5" />
                    Spedizione: {ship === 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">gratis</span>
                    ) : (
                      `€${ship.toFixed(2)}`
                    )}
                  </p>
                  <p className="font-semibold mt-1">Totale: €{total.toFixed(2)}</p>
                </div>
                {safeHref && (
                  <a
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    Vai alla farmacia <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              <p className="text-xs text-muted-foreground pt-2 border-t">
                Prezzo aggiornato il {new Date(product.last_scraped).toLocaleDateString("it-IT")}.
                Verifica sempre sul sito della farmacia prima dell'acquisto.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Product;
