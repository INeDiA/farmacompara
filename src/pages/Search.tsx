import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Pill, Info, X } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { ResultsTable } from "@/components/ResultsTable";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useFarmaSearch } from "@/hooks/useFarmaSearch";
import { fromSlug, toSlug } from "@/lib/principiAttivi";
import { brandToActive, activeToBrands } from "@/lib/brandToActive";

const Search = () => {
  const { query: rawQuery } = useParams<{ query: string }>();
  const [searchParams] = [new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")];
  const literal = searchParams.get("literal") === "1";
  const fromBrand = searchParams.get("brand") || null;
  const navigate = useNavigate();
  const query = rawQuery ? fromSlug(rawQuery) : "";
  const { results, loading, error, search, reset } = useFarmaSearch();

  // Redirect brand → principio attivo (a meno che ?literal=1)
  useEffect(() => {
    if (!query || literal) return;
    const active = brandToActive(query);
    if (active && active.toLowerCase() !== query.toLowerCase()) {
      navigate(`/cerca/${toSlug(active)}?brand=${encodeURIComponent(query)}`, { replace: true });
    }
  }, [query, literal, navigate]);

  // Helper to set or create a meta tag
  const setMeta = (attr: string, value: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${value}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr.split("=")[0], value);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  // Set document title, meta, canonical, OG & Twitter
  useEffect(() => {
    if (query) {
      const capitalized = query.charAt(0).toUpperCase() + query.slice(1);
      const pageTitle = `${capitalized}: prezzo al grammo tra farmacie online | FarmaCompara`;
      const pageDesc = `Quanto costa ${capitalized} al grammo di principio attivo? Confronta il costo normalizzato tra farmacie online italiane e trova la confezione più conveniente.`;
      const pageUrl = `https://farmacompara.it/cerca/${rawQuery}`;

      document.title = pageTitle;
      setMeta("name", "description", pageDesc);

      // Canonical
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", pageUrl);

      // Open Graph
      setMeta("property", "og:title", pageTitle);
      setMeta("property", "og:description", pageDesc);
      setMeta("property", "og:url", pageUrl);

      // Twitter
      setMeta("name", "twitter:title", pageTitle);
      setMeta("name", "twitter:description", pageDesc);
    }
    return () => {
      document.title = "FarmaCompara — Prezzo al grammo di principio attivo tra farmacie online";
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.remove();
      // Restore homepage OG/Twitter
      const homeName = "FarmaCompara — Prezzo al grammo di principio attivo tra farmacie online";
      const homeDesc = "Confronta il costo al grammo di principio attivo tra farmacie online italiane. Stessa molecola, confezioni diverse: scopri quale conviene davvero.";
      setMeta("property", "og:title", homeName);
      setMeta("property", "og:description", homeDesc);
      setMeta("property", "og:url", "https://farmacompara.it/");
      setMeta("name", "twitter:title", homeName);
      setMeta("name", "twitter:description", homeDesc);
    };
  }, [query, rawQuery]);

  // JSON-LD structured data
  useEffect(() => {
    if (!results || !results.products.length || !query) return;
    const capitalized = query.charAt(0).toUpperCase() + query.slice(1);
    const prices = results.products.map(p => p.price);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${capitalized} — confronto prezzi`,
      "url": `https://farmacompara.it/cerca/${rawQuery}`,
      "numberOfItems": results.products.length,
      "itemListElement": results.products.slice(0, 10).map((p, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "item": {
          "@type": "Product",
          "name": p.name,
          "url": p.product_url || undefined,
          "offers": {
            "@type": "Offer",
            "price": p.price,
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock",
          },
        },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "farma-jsonld";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById("farma-jsonld");
      if (el) el.remove();
    };
  }, [results, query, rawQuery]);

  // Breadcrumb JSON-LD
  useEffect(() => {
    if (!query) return;
    const capitalized = query.charAt(0).toUpperCase() + query.slice(1);
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://farmacompara.it/",
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Principi attivi",
          "item": "https://farmacompara.it/principi-attivi",
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": capitalized,
          "item": `https://farmacompara.it/cerca/${rawQuery}`,
        },
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "farma-breadcrumb-jsonld";
    script.textContent = JSON.stringify(breadcrumbLd);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById("farma-breadcrumb-jsonld");
      if (el) el.remove();
    };
  }, [query, rawQuery]);

  // Auto-search when query changes. Se il query è un principio attivo con brand mappati,
  // li passiamo come alias così la ricerca trova anche prodotti col solo nome commerciale.
  useEffect(() => {
    if (!query) return;

    const mappedActive = literal ? null : brandToActive(query);
    if (mappedActive && mappedActive.toLowerCase() !== query.toLowerCase()) return;

    const aliases = literal ? [] : activeToBrands(query);
    search(query, aliases);
  }, [query, literal]);

  const handleSearch = (q: string) => {
    const active = brandToActive(q);
    if (active && active.toLowerCase() !== q.trim().toLowerCase()) {
      navigate(`/cerca/${toSlug(active)}?brand=${encodeURIComponent(q.trim())}`, { replace: true });
      return;
    }

    navigate(`/cerca/${encodeURIComponent(q.toLowerCase())}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">FarmaCompara</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <SearchBar onSearch={handleSearch} loading={loading} initialQuery={query} />

        {fromBrand && query && (
          <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground flex-1">
              <strong>"{fromBrand.charAt(0).toUpperCase() + fromBrand.slice(1)}"</strong> è un nome commerciale di <strong>{query.charAt(0).toUpperCase() + query.slice(1)}</strong>. Mostriamo tutti i prodotti a base di questo principio attivo.{" "}
              <Link
                to={`/cerca/${toSlug(fromBrand)}?literal=1`}
                className="text-primary hover:underline font-medium"
              >
                Cerca solo "{fromBrand}"
              </Link>
            </p>
          </div>
        )}

        {query && (
          <div className="mt-6">
            <h1 className="text-2xl font-bold tracking-tight">
              {query.charAt(0).toUpperCase() + query.slice(1)}: prezzo al grammo di principio attivo
            </h1>
            <p className="text-muted-foreground mt-1">
              Confronta il costo normalizzato per grammo di {query.charAt(0).toUpperCase() + query.slice(1)} tra farmacie online italiane. Stessa molecola, confezioni diverse: trova quella che conviene.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-1">Riprova tra qualche secondo</p>
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {results && !loading && (
          <ResultsTable products={results.products} fromCache={results.from_cache} />
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground space-y-2">
          <p>FarmaCompara — confronto prezzi al grammo di principio attivo tra farmacie online italiane</p>
          <p>I prezzi mostrati sono indicativi e aggiornati ogni 48 ore. Verifica sempre sul sito della farmacia prima dell'acquisto.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/principi-attivi" className="text-primary hover:underline">
              Tutti i principi attivi
            </Link>
            <span className="text-border">•</span>
            <a href="https://www.iubenda.com/privacy-policy/98369577" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            <span className="text-border">•</span>
            <a href="https://www.iubenda.com/privacy-policy/98369577/cookie-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Cookie Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Search;
